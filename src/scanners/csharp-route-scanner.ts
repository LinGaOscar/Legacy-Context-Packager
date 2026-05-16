import fs from 'fs';
import type { Route, HttpMethod } from '../models/route.js';
import { calcRouteConfidence } from '../rules/confidence-rules.js';
import { collectFiles } from '../core/file-collector.js';

// ASP.NET Core 的 HTTP method attribute 對應
const ATTRIBUTE_METHOD_MAP: Record<string, HttpMethod> = {
  'HttpGet': 'GET',
  'HttpPost': 'POST',
  'HttpPut': 'PUT',
  'HttpDelete': 'DELETE',
  'HttpPatch': 'PATCH',
  'HttpHead': 'HEAD',
  'HttpOptions': 'OPTIONS',
};

function extractAttributePath(line: string): string | null {
  // 處理 [HttpGet("path")] 或 [Route("path")] 或 [HttpGet] (無 path)
  const match = line.match(/\[\w+\s*\(\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

export function scanCSharpRoutes(rootDir: string): Route[] {
  const files = collectFiles(rootDir, { extensions: ['.cs'] });
  const routes: Route[] = [];

  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    let currentClass = '';
    let classLevelRoute = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 抓 class 名稱
      const classMatch = line.match(/(?:public|internal|protected|private)?\s+class\s+(\w+)/);
      if (classMatch) {
        currentClass = classMatch[1];
        classLevelRoute = '';
      }

      // class 層級 [Route("api/[controller]")]
      const classRouteMatch = line.match(/\[Route\s*\(\s*["']([^"']+)["']/);
      if (classRouteMatch) {
        const nextLines = lines.slice(i + 1, i + 5).map(l => l.trim()).join(' ');
        if (nextLines.includes('class ')) {
          classLevelRoute = classRouteMatch[1];
          continue;
        }
      }

      // method 層級 HTTP attribute
      for (const [attr, httpMethod] of Object.entries(ATTRIBUTE_METHOD_MAP)) {
        if (!line.includes(`[${attr}`)) continue;

        const attrPath = extractAttributePath(line) ?? '';

        let resolvedPath = attrPath;
        if (classLevelRoute) {
          resolvedPath = '/' + [classLevelRoute, attrPath]
            .filter(Boolean)
            .join('/')
            .replace(/\/+/g, '/');
        }
        if (!resolvedPath.startsWith('/')) resolvedPath = '/' + resolvedPath;

        // 取下方 method 名稱
        let methodName: string | undefined;
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const mMatch = lines[j].match(/(?:public|protected|private)\s+[\w<>]+\s+(\w+)\s*\(/);
          if (mMatch) { methodName = mMatch[1]; break; }
        }

        routes.push({
          language: 'csharp',
          framework: 'aspnet-core',
          httpMethod,
          path: resolvedPath,
          sourceFile: filePath,
          className: currentClass || undefined,
          methodName,
          classLevelPath: classLevelRoute || undefined,
          lineNumber: i + 1,
          confidence: calcRouteConfidence({
            hasExplicitAnnotation: true,
            hasClassLevelPath: !!classLevelRoute,
            isWarBytecode: false,
          }),
        });
      }
    }
  }

  return routes;
}
