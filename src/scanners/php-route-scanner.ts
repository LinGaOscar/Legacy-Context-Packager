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
    let groupPrefix = ''; // Route::group(['prefix' => '/api'], ...) 的前綴

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 偵測 Route::prefix() 或 Route::group(['prefix' => ...])
      const prefixMatch = line.match(/(?:prefix|['"]prefix['"]\s*=>\s*)["']([^"']+)["']/);
      if (prefixMatch) groupPrefix = prefixMatch[1];

      const route = parseLaravelRouteLine(line, i + 1, filePath);
      if (!route) continue;

      if (groupPrefix) {
        route.path = '/' + [groupPrefix, route.path].join('/').replace(/\/+/g, '/');
      }

      routes.push(route);
    }
  }

  return routes;
}
