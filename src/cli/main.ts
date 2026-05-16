#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { loadProject } from '../core/project-loader.js';
import { scanJavaRoutes } from '../scanners/java-route-scanner.js';
import { scanCSharpRoutes } from '../scanners/csharp-route-scanner.js';
import { scanPhpRoutes } from '../scanners/php-route-scanner.js';
import { scanWarFile, cleanupWarTemp } from '../scanners/war-scanner.js';
import { scanWebEntries } from '../scanners/web-entry-scanner.js';
import { scanSecrets } from '../scanners/secret-scanner.js';
import { scanDependencies } from '../scanners/dependency-scanner.js';
import { normalize } from '../core/normalizer.js';
import { redactSecrets } from '../core/redactor.js';
import { buildDependencyMap, buildOpenApiLite } from '../core/condenser.js';
import { buildOutput } from '../core/output-builder.js';
import { collectFiles } from '../core/file-collector.js';
import type { ProjectScanResult, ContextPackType } from '../models/context-pack.js';
import type { Route } from '../models/route.js';
import { diffScans, formatDiffMarkdown } from '../core/diff-engine.js';

const VALID_FORMATS = new Set(['json', 'markdown']);
const ALL_PACK_TYPES: ContextPackType[] = [
  'api-analysis', 'security-review', 'secret-exposure', 'legacy-onboarding', 'endpoint-test',
];

const program = new Command();

program
  .name('lcp')
  .description('Legacy Context Packager — 企業遺留系統 LLM 前處理器')
  .version('0.3.0');

program
  .command('scan <projectPath>')
  .description('掃描專案並輸出 context pack')
  .option('-o, --output <dir>', '輸出目錄', './lcp-output')
  .option('--format <formats>', '輸出格式（json,markdown）', 'json,markdown')
  .option('--pack <types>', `輸出的 context pack 類型，逗號分隔或 "all"。\n  可選：${ALL_PACK_TYPES.join(', ')}`)
  .option('--no-secrets', '跳過 secret 掃描（加快速度）')
  .option('--no-report', '不產出 report.html')
  .action(async (projectPath: string, options: {
    output: string;
    format: string;
    pack?: string;
    secrets: boolean;
    report: boolean;
  }) => {
    const startTime = Date.now();
    console.log(`\n[LCP] 開始掃描：${path.resolve(projectPath)}`);

    let tempDir: string | undefined;

    try {
      const project = loadProject(projectPath);
      console.log(`[LCP] 語言：${project.language}  框架：${project.framework}`);

      let routes: Route[] = [];

      if (project.isWar) {
        console.log('[LCP] 偵測到 WAR 檔，解壓中...');
        const warResult = scanWarFile(project.rootDir);
        routes = warResult.routes;
        tempDir = warResult.tempDir;
      } else {
        const scanRootDir = project.rootDir;
        if (project.language === 'java' || project.language === 'unknown') {
          routes.push(...scanJavaRoutes(scanRootDir));
        }
        if (project.language === 'csharp' || project.language === 'unknown') {
          routes.push(...scanCSharpRoutes(scanRootDir));
        }
        if (project.language === 'php' || project.language === 'unknown') {
          routes.push(...scanPhpRoutes(scanRootDir));
        }
      }

      const scanRoot = tempDir ?? project.rootDir;
      const webEntries = scanWebEntries(scanRoot);
      const rawSecrets = options.secrets ? scanSecrets(scanRoot) : [];
      const { dependencyMap: rawDepMap } = scanDependencies(scanRoot);

      const normalized = normalize({ routes, webEntries, secrets: rawSecrets });
      const redactedSecrets = redactSecrets(normalized.secrets);

      const scannableFiles = collectFiles(scanRoot, {
        extensions: ['.java', '.cs', '.php', '.html', '.jsp', '.js', '.ts', '.xml', '.json', '.yml', '.yaml'],
      });

      const scanDurationMs = Date.now() - startTime;

      const result: ProjectScanResult = {
        projectInfo: {
          rootPath: project.rootDir,
          language: project.language,
          framework: project.framework,
          totalFiles: scannableFiles.length,
          scannedFiles: scannableFiles.filter(f => !f.endsWith('.min.js')).length,
          scanDurationMs,
        },
        routes: normalized.routes,
        webEntries: normalized.webEntries,
        secrets: redactedSecrets,
        dependencyMap: buildDependencyMap(normalized.routes, normalized.webEntries, rawDepMap),
        openApiLite: buildOpenApiLite(normalized.routes),
      };

      // 解析 format
      const formats = options.format.split(',').map(f => f.trim()).filter(f => {
        if (!VALID_FORMATS.has(f)) { console.warn(`[LCP] 警告：不支援的格式 "${f}"，已跳過`); return false; }
        return true;
      }) as ('json' | 'markdown')[];

      // 解析 pack 類型
      let packs: ContextPackType[] = [];
      if (options.pack) {
        if (options.pack === 'all') {
          packs = ALL_PACK_TYPES;
        } else {
          packs = options.pack.split(',').map(p => p.trim()).filter(p => {
            if (!ALL_PACK_TYPES.includes(p as ContextPackType)) {
              console.warn(`[LCP] 警告：不支援的 pack 類型 "${p}"，已跳過`);
              return false;
            }
            return true;
          }) as ContextPackType[];
        }
      }

      buildOutput(result, { outputDir: path.resolve(options.output), formats, packs, report: options.report });

      console.log(`\n[LCP] 掃描完成 (${scanDurationMs}ms)`);
      console.log(`  Routes:      ${result.routes.length}`);
      console.log(`  Web Entries: ${result.webEntries.length}`);
      console.log(`  Secrets:     ${result.secrets.length} (critical: ${result.secrets.filter(s => s.severity === 'critical').length})`);
      console.log(`  Config files: ${result.dependencyMap.configFiles.length}`);
      if (packs.length > 0) {
        console.log(`  Packs:       ${packs.join(', ')}`);
      }
      if (options.report !== false) {
        console.log(`  Report:      ${path.resolve(options.output)}/report.html`);
      }
      console.log(`  Output:      ${path.resolve(options.output)}`);
    } finally {
      if (tempDir) cleanupWarTemp(tempDir);
    }
  });

// ── lcp diff ──────────────────────────────────────────────────────────────────
program
  .command('diff <oldDir> <newDir>')
  .description('比較兩次掃描結果的 route / secret 差異')
  .option('-o, --output <file>', '輸出 diff 報告路徑', './lcp-diff.md')
  .action((oldDir: string, newDir: string, options: { output: string }) => {
    console.log(`\n[LCP] 比較：${oldDir} → ${newDir}`);

    const resolvedOld = path.resolve(oldDir);
    const resolvedNew = path.resolve(newDir);
    if (!fs.existsSync(path.join(resolvedOld, 'routes.json'))) {
      console.error(`[LCP] 錯誤：${oldDir} 不包含 routes.json，請確認路徑為有效的 lcp scan 輸出目錄`);
      process.exit(1);
    }
    if (!fs.existsSync(path.join(resolvedNew, 'routes.json'))) {
      console.error(`[LCP] 錯誤：${newDir} 不包含 routes.json，請確認路徑為有效的 lcp scan 輸出目錄`);
      process.exit(1);
    }

    const diff = diffScans(resolvedOld, resolvedNew);
    const md = formatDiffMarkdown(diff);
    const outPath = path.resolve(options.output);

    fs.writeFileSync(outPath, md, 'utf8');

    console.log(`  Routes added:    ${diff.routes.added.length}`);
    console.log(`  Routes removed:  ${diff.routes.removed.length}`);
    console.log(`  Secrets new:     ${diff.secrets.newFound.length}`);
    console.log(`  Secrets resolved: ${diff.secrets.resolved.length}`);
    console.log(`  Report:          ${outPath}`);
  });

program.parse();
