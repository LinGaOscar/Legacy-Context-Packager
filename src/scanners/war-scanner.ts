import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';
import type { Route } from '../models/route.js';
import { scanJavaRoutes } from './java-route-scanner.js';

interface ServletMapping {
  servletName: string;
  urlPattern: string;
}

// 解析 web.xml 中的 servlet-mapping 取得 URL pattern
function parseWebXmlMappings(xmlContent: string): ServletMapping[] {
  const mappings: ServletMapping[] = [];
  const mappingRegex = /<servlet-mapping>([\s\S]*?)<\/servlet-mapping>/g;
  let match: RegExpExecArray | null;

  while ((match = mappingRegex.exec(xmlContent)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/<servlet-name>([^<]+)<\/servlet-name>/);
    const patternMatch = block.match(/<url-pattern>([^<]+)<\/url-pattern>/);
    if (nameMatch && patternMatch) {
      mappings.push({
        servletName: nameMatch[1].trim(),
        urlPattern: patternMatch[1].trim(),
      });
    }
  }

  return mappings;
}

export function scanWarFile(warPath: string): { routes: Route[]; tempDir: string } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lcp-war-'));

  try {
    const zip = new AdmZip(warPath);
    zip.extractAllTo(tempDir, true);
  } catch (err) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`WAR 解壓失敗：${(err as Error).message}`);
  }

  const routes: Route[] = [];

  // 掃描解壓後的 Java class（近似推斷，精度低）
  const classesDir = path.join(tempDir, 'WEB-INF', 'classes');
  if (fs.existsSync(classesDir)) {
    // class 檔無法直接做文字 regex，WAR scan 主要依賴 web.xml
  }

  // 解析 web.xml servlet mapping
  const webXmlPath = path.join(tempDir, 'WEB-INF', 'web.xml');
  if (fs.existsSync(webXmlPath)) {
    const xmlContent = fs.readFileSync(webXmlPath, 'utf8');
    const mappings = parseWebXmlMappings(xmlContent);
    for (const mapping of mappings) {
      routes.push({
        language: 'java',
        framework: 'spring-mvc',
        httpMethod: 'ANY',
        path: mapping.urlPattern,
        sourceFile: webXmlPath,
        className: mapping.servletName,
        lineNumber: 0,
        confidence: 'low', // WAR 無 source code 時精度低
      });
    }
  }

  // 若有 .java source（某些 WAR 含 src）則掃描 annotation
  const srcDir = path.join(tempDir, 'WEB-INF', 'src');
  if (fs.existsSync(srcDir)) {
    const javaRoutes = scanJavaRoutes(srcDir);
    routes.push(...javaRoutes);
  }

  return { routes, tempDir };
}

export function cleanupWarTemp(tempDir: string): void {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
