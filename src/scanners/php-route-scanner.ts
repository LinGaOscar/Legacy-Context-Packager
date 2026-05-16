import fs from 'fs';
import path from 'path';
import type { Route, HttpMethod, Framework } from '../models/route.js';
import { collectFiles } from '../core/file-collector.js';

// Laravel Route:: facade 方法對應 HTTP method
const LARAVEL_METHOD_MAP: Record<string, HttpMethod> = {
  'get': 'GET',
  'post': 'POST',
  'put': 'PUT',
  'delete': 'DELETE',
  'patch': 'PATCH',
  'options': 'OPTIONS',
  'any': 'ANY',
  'match': 'ANY',
};

// 解析單行 Route::get('/path', ...) 或 Route::post('/path', ...)
function parseLaravelRouteLine(line: string, lineNumber: number, filePath: string): Route | null {
  // 匹配 Route::method('path', ...) 格式
  const match = line.match(/Route::(get|post|put|delete|patch|options|any|match)\s*\(\s*["']([^"']+)["']/i);
  if (!match) return null;

  const method = match[1].toLowerCase();
  const routePath = match[2];
  const httpMethod = LARAVEL_METHOD_MAP[method] ?? 'UNKNOWN';

  return {
    language: 'php',
    framework: 'laravel',
    httpMethod: httpMethod as HttpMethod,
    path: routePath.startsWith('/') ? routePath : '/' + routePath,
    sourceFile: filePath,
    lineNumber,
    confidence: 'high',
  };
}

export function scanPhpRoutes(rootDir: string): Route[] {
  const routes: Route[] = [];

  // 優先掃描 Laravel 的 routes/ 目錄
  const routeFiles: string[] = [];
  const laravelRouteDir = path.join(rootDir, 'routes');
  if (fs.existsSync(laravelRouteDir)) {
    const phpFiles = collectFiles(laravelRouteDir, { extensions: ['.php'] });
    routeFiles.push(...phpFiles);
  }

  // 也掃描整個專案的 PHP 檔（以防非標準 Laravel 結構）
  const allPhp = collectFiles(rootDir, { extensions: ['.php'] });
  for (const f of allPhp) {
    if (!routeFiles.includes(f)) routeFiles.push(f);
  }

  for (const filePath of routeFiles) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    // 用 stack 追蹤巢狀 group 的 prefix，每個 group 開 { 推入，} 彈出
    const prefixStack: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 偵測 Route::group(['prefix' => '/api'], function() {
      const prefixMatch = line.match(/Route::group\s*\(\s*\[(?:[^\]]*['"]prefix['"]\s*=>\s*['"]([^'"]+)['"])/);
      if (prefixMatch) prefixStack.push(prefixMatch[1]);

      // 偵測 group 結束（}); 或 });）
      if (/^\s*\}\s*\)\s*;/.test(line) && prefixStack.length > 0) {
        prefixStack.pop();
      }

      const route = parseLaravelRouteLine(line, i + 1, filePath);
      if (!route) continue;

      if (prefixStack.length > 0) {
        const prefix = prefixStack.join('/').replace(/\/+/g, '/');
        route.path = '/' + [prefix, route.path].join('/').replace(/\/+/g, '/');
      }

      routes.push(route);
    }
  }

  return routes;
}
