import fs from 'fs';
import type { Route, HttpMethod, Framework } from '../models/route.js';
import { calcRouteConfidence } from '../rules/confidence-rules.js';
import { collectFiles } from '../core/file-collector.js';

// Spring MVC / Spring Boot / JAX-RS annotation 對應 HTTP method
const ANNOTATION_METHOD_MAP: Record<string, HttpMethod> = {
  '@GetMapping': 'GET',
  '@PostMapping': 'POST',
  '@PutMapping': 'PUT',
  '@DeleteMapping': 'DELETE',
  '@PatchMapping': 'PATCH',
  '@RequestMapping': 'ANY', // 可能無指定 method
  '@GET': 'GET',      // JAX-RS
  '@POST': 'POST',
  '@PUT': 'PUT',
  '@DELETE': 'DELETE',
  '@PATCH': 'PATCH',
  '@HEAD': 'HEAD',
  '@OPTIONS': 'OPTIONS',
};

// 從 annotation 字串抽出 path 值，e.g. @GetMapping("/api/user") -> "/api/user"
function extractPath(annotation: string): string | null {
  const match = annotation.match(/["']([^"']+)["']/);
  return match ? match[1] : null;
}

// 從 @RequestMapping(value = "/foo", method = RequestMethod.GET) 抽出 method
function extractRequestMappingMethod(annotation: string): HttpMethod {
  const methodMatch = annotation.match(/method\s*=\s*RequestMethod\.(\w+)/);
  if (methodMatch) return methodMatch[1].toUpperCase() as HttpMethod;
  return 'ANY';
}

// 判斷框架（Spring Boot vs Spring MVC vs JAX-RS）
function detectJavaFramework(content: string): Framework {
  if (content.includes('@SpringBootApplication') || content.includes('spring-boot')) return 'spring-boot';
  if (content.includes('javax.ws.rs') || content.includes('jakarta.ws.rs')) return 'jax-rs';
  return 'spring-mvc';
}

export function scanJavaRoutes(rootDir: string): Route[] {
  const files = collectFiles(rootDir, { extensions: ['.java'] });
  const routes: Route[] = [];

  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const framework = detectJavaFramework(content);
    const lines = content.split('\n');
    let currentClass = '';
    let classLevelPath = '';
    let pendingClassPath = ''; // annotation 先記住，等到 class 宣告行再賦值

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 抽取 class 名稱：同時把 pending annotation path 賦給此 class
      const classMatch = line.match(/(?:public|protected|private)?\s+class\s+(\w+)/);
      if (classMatch) {
        currentClass = classMatch[1];
        classLevelPath = pendingClassPath; // 接收前面 annotation 設定的 path
        pendingClassPath = '';
      }

      // 偵測 class 層級的 @RequestMapping / @Path，暫存到 pendingClassPath
      const classMappingMatch = line.match(/@(?:RequestMapping|Path)\s*\(\s*["']([^"']+)["']/);
      if (classMappingMatch) {
        const nextLine = lines[i + 1]?.trim() ?? '';
        if (nextLine.includes('class ')) {
          pendingClassPath = classMappingMatch[1];
          continue;
        }
      }

      // 掃描 method 層級 annotation
      for (const [annotation, defaultMethod] of Object.entries(ANNOTATION_METHOD_MAP)) {
        if (!line.includes(annotation)) continue;

        const annotationFull = line;
        let httpMethod: HttpMethod = defaultMethod;
        if (annotation === '@RequestMapping') {
          httpMethod = extractRequestMappingMethod(annotationFull);
        }

        // 支援無括號的 annotation（如 @PostMapping），視為空路徑，繼承 class 前綴
        const rawPath = extractPath(annotationFull) ?? '';

        const segments = [classLevelPath, rawPath]
          .filter(s => s !== '')
          .map(s => s.replace(/^\/+/, '')); // 去除各段開頭斜線，統一由外層加
        const fullPath = '/' + segments.join('/');

        // 下一個非空行通常是 method 定義
        let methodName: string | undefined;
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const methodMatch = lines[j].match(/(?:public|protected|private)\s+\w+\s+(\w+)\s*\(/);
          if (methodMatch) {
            methodName = methodMatch[1];
            break;
          }
        }

        routes.push({
          language: 'java',
          framework,
          httpMethod,
          path: fullPath,
          sourceFile: filePath,
          className: currentClass || undefined,
          methodName,
          classLevelPath: classLevelPath || undefined,
          lineNumber: i + 1,
          confidence: calcRouteConfidence({
            hasExplicitAnnotation: annotation !== '@RequestMapping',
            hasClassLevelPath: !!classLevelPath,
            isWarBytecode: false,
          }),
        });
      }
    }
  }

  return routes;
}
