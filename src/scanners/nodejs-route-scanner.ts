import fs from 'fs';
import type { Route, HttpMethod } from '../models/route.js';
import { collectFiles } from '../core/file-collector.js';

const METHOD_MAP: Record<string, HttpMethod> = {
  get: 'GET', post: 'POST', put: 'PUT',
  delete: 'DELETE', patch: 'PATCH', options: 'OPTIONS',
  head: 'HEAD', all: 'ANY', use: 'ANY',
};

export function scanNodejsRoutes(rootDir: string): Route[] {
  const files = collectFiles(rootDir, { extensions: ['.js', '.ts'] });
  const routes: Route[] = [];

  for (const filePath of files) {
    if (filePath.includes('node_modules') || filePath.includes('/dist/')) continue;

    let content: string;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    const lines = content.split('\n');

    // 收集所有宣告為 express.Router() 的變數名稱，避免自訂名稱被漏掃
    const routerVars = new Set<string>(['app', 'router', 'server']);
    const routerDeclRe = /(?:const|let|var)\s+(\w+)\s*=\s*(?:express\.Router|Router)\s*\(/g;
    let dm: RegExpExecArray | null;
    while ((dm = routerDeclRe.exec(content)) !== null) {
      routerVars.add(dm[1]);
    }

    const varPattern = [...routerVars].join('|');
    const re = new RegExp(
      `(?:${varPattern})\\.(get|post|put|delete|patch|options|head|all|use)\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`
    );

    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].trim().match(re);
      if (!m) continue;
      const routePath = m[2].startsWith('/') ? m[2] : '/' + m[2];
      routes.push({
        language: 'nodejs',
        framework: 'express',
        httpMethod: METHOD_MAP[m[1]] ?? 'ANY',
        path: routePath,
        sourceFile: filePath,
        lineNumber: i + 1,
        confidence: 'high',
      });
    }
  }
  return routes;
}
