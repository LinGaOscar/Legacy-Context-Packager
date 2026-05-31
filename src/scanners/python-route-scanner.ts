import fs from 'fs';
import type { Route, HttpMethod, Framework } from '../models/route.js';
import { collectFiles } from '../core/file-collector.js';

function parseMethods(methodsStr: string): HttpMethod[] {
  if (!methodsStr) return ['GET'];
  const map: Record<string, HttpMethod> = {
    GET: 'GET', POST: 'POST', PUT: 'PUT',
    DELETE: 'DELETE', PATCH: 'PATCH', HEAD: 'HEAD', OPTIONS: 'OPTIONS',
  };
  const found = Object.entries(map)
    .filter(([key]) => methodsStr.toUpperCase().includes(key))
    .map(([, val]) => val);
  return found.length > 0 ? found : ['GET'];
}

function scanFlask(lines: string[], filePath: string): Route[] {
  const routes: Route[] = [];
  const re = /^\s*@\w+\.route\s*\(\s*['"]([^'"]+)['"]([\s\S]*?)\)/;

  for (let i = 0; i < lines.length; i++) {
    const combined = lines.slice(i, Math.min(i + 4, lines.length)).join(' ');
    const m = combined.match(re);
    if (!m) continue;

    const methodsMatch = m[2].match(/methods\s*=\s*\[([^\]]+)\]/);
    const methods = parseMethods(methodsMatch?.[1] ?? '');

    let methodName: string | undefined;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const fn = lines[j].match(/^\s*(?:async\s+)?def\s+(\w+)/);
      if (fn) { methodName = fn[1]; break; }
    }

    for (const httpMethod of methods) {
      routes.push({
        language: 'python',
        framework: 'flask',
        httpMethod,
        path: m[1],
        sourceFile: filePath,
        methodName,
        lineNumber: i + 1,
        confidence: 'high',
      });
    }
  }
  return routes;
}

function scanDjango(lines: string[], filePath: string): Route[] {
  const routes: Route[] = [];
  const re = /(?:^|\s)(?:re_)?(?:path|url)\s*\(\s*r?['"`]([^'"`]+)['"`]\s*,\s*(\w[\w.]*)/;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;

    let routePath = m[1].replace(/^\^/, '').replace(/\$$/, '');
    if (!routePath.startsWith('/')) routePath = '/' + routePath;

    routes.push({
      language: 'python',
      framework: 'django',
      httpMethod: 'ANY',
      path: routePath,
      sourceFile: filePath,
      methodName: m[2],
      lineNumber: i + 1,
      confidence: 'high',
    });
  }
  return routes;
}

function detectPythonFramework(content: string): Framework | null {
  if (content.includes('from flask') || content.includes('import flask') || content.includes('@app.route')) return 'flask';
  if (content.includes('from django') || content.includes('urlpatterns') || content.includes('django.urls')) return 'django';
  return null;
}

export function scanPythonRoutes(rootDir: string): Route[] {
  const files = collectFiles(rootDir, { extensions: ['.py'] });
  const routes: Route[] = [];

  for (const filePath of files) {
    // 跳過第三方套件與快取目錄，避免誤報
    if (filePath.includes('site-packages') || filePath.includes('__pycache__')) continue;

    let content: string;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    const framework = detectPythonFramework(content);
    if (!framework) continue;

    const lines = content.split('\n');
    if (framework === 'flask')  routes.push(...scanFlask(lines, filePath));
    if (framework === 'django') routes.push(...scanDjango(lines, filePath));
  }
  return routes;
}
