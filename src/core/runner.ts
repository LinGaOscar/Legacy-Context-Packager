import path from 'path';
import { loadProject } from './project-loader.js';
import { scanJavaRoutes } from '../scanners/java-route-scanner.js';
import { scanCSharpRoutes } from '../scanners/csharp-route-scanner.js';
import { scanPhpRoutes } from '../scanners/php-route-scanner.js';
import { scanWarFile, cleanupWarTemp } from '../scanners/war-scanner.js';
import { scanWebEntries } from '../scanners/web-entry-scanner.js';
import { scanSecrets } from '../scanners/secret-scanner.js';
import { scanDependencies } from '../scanners/dependency-scanner.js';
import { scanNodejsRoutes } from '../scanners/nodejs-route-scanner.js';
import { scanPythonRoutes } from '../scanners/python-route-scanner.js';
import { scanPkgDeps } from '../scanners/pkg-deps-scanner.js';
import { scanJavaEntities } from '../scanners/java-entity-scanner.js';
import { scanCSharpEntities } from '../scanners/csharp-entity-scanner.js';
import { scanPhpEntities } from '../scanners/php-entity-scanner.js';
import { scanPythonEntities } from '../scanners/python-entity-scanner.js';
import { scanNodejsEntities } from '../scanners/nodejs-entity-scanner.js';
import type { DbEntity } from '../models/entity.js';
import { normalize } from './normalizer.js';
import { redactSecrets } from './redactor.js';
import { loadAllowlist, filterAllowlisted } from './allowlist.js';
import { buildDependencyMap, buildOpenApiLite } from './condenser.js';
import { collectFiles } from './file-collector.js';
import type { ProjectScanResult } from '../models/context-pack.js';
import type { Route } from '../models/route.js';

export interface ScanOptions {
  secrets?: boolean;
  onProgress?: (msg: string) => void;
}

export async function runScan(projectPath: string, opts: ScanOptions = {}): Promise<ProjectScanResult> {
  const { secrets: includeSecrets = true, onProgress } = opts;
  const report = (msg: string) => onProgress?.(msg);
  const startTime = Date.now();

  const project = loadProject(projectPath);
  report(`偵測專案：${project.language} / ${project.framework}`);

  let tempDir: string | undefined;
  let routes: Route[] = [];

  try {
    if (project.isWar) {
      report('解壓 WAR 檔...');
      const warResult = scanWarFile(project.rootDir);
      routes = warResult.routes;
      tempDir = warResult.tempDir;
    } else {
      const root = project.rootDir;
      report('掃描路由...');
      if (project.language === 'java' || project.language === 'unknown') routes.push(...scanJavaRoutes(root));
      if (project.language === 'csharp' || project.language === 'unknown') routes.push(...scanCSharpRoutes(root));
      if (project.language === 'php' || project.language === 'unknown') routes.push(...scanPhpRoutes(root));
      if (project.language === 'nodejs' || project.language === 'unknown') routes.push(...scanNodejsRoutes(root));
      if (project.language === 'python' || project.language === 'unknown') routes.push(...scanPythonRoutes(root));
    }

    const scanRoot = tempDir ?? project.rootDir;

    report(`掃描 Web Entries...`);
    const webEntries = scanWebEntries(scanRoot);

    const rawSecrets = includeSecrets ? (report('掃描 Secrets...'), scanSecrets(scanRoot)) : [];
    report('掃描套件依賴...');
    const pkgDeps = scanPkgDeps(project.rootDir);
    report('掃描 DB Entities...');
    const dbEntities: DbEntity[] = [];
    const entityRoot = tempDir ?? project.rootDir;
    if (project.language === 'java'   || project.language === 'unknown') dbEntities.push(...scanJavaEntities(entityRoot));
    if (project.language === 'csharp' || project.language === 'unknown') dbEntities.push(...scanCSharpEntities(entityRoot));
    if (project.language === 'php'    || project.language === 'unknown') dbEntities.push(...scanPhpEntities(entityRoot));
    if (project.language === 'python' || project.language === 'unknown') dbEntities.push(...scanPythonEntities(entityRoot));
    if (project.language === 'nodejs' || project.language === 'unknown') dbEntities.push(...scanNodejsEntities(entityRoot));
    const { dependencyMap: rawDepMap } = scanDependencies(scanRoot);

    const normalized = normalize({ routes, webEntries, secrets: rawSecrets });
    // WAR 的 rootDir 指向 .war 檔本身，allowlist 應放在 .war 的同層目錄
    const allowlistRoot = project.isWar ? path.dirname(project.rootDir) : project.rootDir;
    const redactedSecrets = filterAllowlisted(
      redactSecrets(normalized.secrets),
      loadAllowlist(allowlistRoot),
    );

    const scannableFiles = collectFiles(scanRoot, {
      extensions: ['.java', '.cs', '.php', '.py', '.html', '.jsp', '.js', '.ts', '.xml', '.json', '.yml', '.yaml'],
    });

    return {
      projectInfo: {
        rootPath: project.rootDir,
        language: project.language,
        framework: project.framework,
        totalFiles: scannableFiles.length,
        scannedFiles: scannableFiles.filter(f => !f.endsWith('.min.js')).length,
        scanDurationMs: Date.now() - startTime,
      },
      routes: normalized.routes,
      webEntries: normalized.webEntries,
      secrets: redactedSecrets,
      dependencyMap: buildDependencyMap(normalized.routes, normalized.webEntries, rawDepMap),
      openApiLite: buildOpenApiLite(normalized.routes),
      pkgDeps,
      dbEntities,
    };
  } finally {
    if (tempDir) cleanupWarTemp(tempDir);
  }
}
