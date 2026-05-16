#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
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
import type { ProjectScanResult } from '../models/context-pack.js';

const program = new Command();

program
  .name('lcp')
  .description('Legacy Context Packager — 企業遺留系統 LLM 前處理器')
  .version('0.1.0');

program
  .command('scan <projectPath>')
  .description('掃描專案並輸出 context pack')
  .option('-o, --output <dir>', '輸出目錄', './lcp-output')
  .option('--format <formats>', '輸出格式（json,markdown）', 'json,markdown')
  .option('--no-secrets', '跳過 secret 掃描（加快速度）')
  .action(async (projectPath: string, options: {
    output: string;
    format: string;
    secrets: boolean;
  }) => {
    const startTime = Date.now();
    console.log(`\n[LCP] 開始掃描：${path.resolve(projectPath)}`);

    let tempDir: string | undefined;

    try {
      const project = loadProject(projectPath);
      console.log(`[LCP] 語言：${project.language}  框架：${project.framework}`);

      let routes: ReturnType<typeof scanJavaRoutes> = [];

      if (project.isWar) {
        console.log('[LCP] 偵測到 WAR 檔，解壓中...');
        const warResult = scanWarFile(project.rootDir);
        routes = warResult.routes;
        tempDir = warResult.tempDir;
      } else {
        // 依語言平行執行 route scanner
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
      const depMap = scanDependencies(scanRoot);

      // Normalize → Redact
      const normalized = normalize({ routes, webEntries, secrets: rawSecrets });
      const redactedSecrets = redactSecrets(normalized.secrets);

      // 統計可分析的檔案數（作為 totalFiles）
      const scannableFiles = collectFiles(scanRoot, {
        extensions: ['.java', '.cs', '.php', '.html', '.jsp', '.js', '.ts', '.xml', '.json', '.yml', '.yaml'],
      });
      const totalFiles = scannableFiles.length;

      const scanDurationMs = Date.now() - startTime;

      const result: ProjectScanResult = {
        projectInfo: {
          rootPath: project.rootDir,
          language: project.language,
          framework: project.framework,
          totalFiles,
          scannedFiles: scannableFiles.filter(f => !f.endsWith('.min.js')).length,
          scanDurationMs,
        },
        routes: normalized.routes,
        webEntries: normalized.webEntries,
        secrets: redactedSecrets,
        dependencyMap: buildDependencyMap(normalized.routes, normalized.webEntries, depMap),
        openApiLite: buildOpenApiLite(normalized.routes),
      };

      const VALID_FORMATS = new Set(['json', 'markdown']);
      const formats = options.format.split(',').map(f => f.trim()).filter(f => {
        if (!VALID_FORMATS.has(f)) { console.warn(`[LCP] 警告：不支援的輸出格式 "${f}"，已跳過`); return false; }
        return true;
      }) as ('json' | 'markdown')[];
      buildOutput(result, { outputDir: path.resolve(options.output), formats });

      console.log(`\n[LCP] 掃描完成 (${scanDurationMs}ms)`);
      console.log(`  Routes:      ${result.routes.length}`);
      console.log(`  Web Entries: ${result.webEntries.length}`);
      console.log(`  Secrets:     ${result.secrets.length} (critical: ${result.secrets.filter(s => s.severity === 'critical').length})`);
      console.log(`  Output:      ${path.resolve(options.output)}`);
    } finally {
      if (tempDir) cleanupWarTemp(tempDir);
    }
  });

program.parse();
