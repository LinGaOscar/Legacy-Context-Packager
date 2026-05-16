import fs from 'fs';
import path from 'path';
import type { DependencyMap, DependencyEdge } from '../models/dependency.js';
import type { Language } from '../models/route.js';
import { collectFiles } from '../core/file-collector.js';

// Phase 1 已收集 config 清單，Phase 2 加入 import/require 依賴分析

const CONFIG_EXTENSIONS = ['.xml', '.properties', '.yml', '.yaml', '.json', '.env', '.config', '.ini'];
const CONFIG_FILE_PATTERNS = [
  /application\.(properties|yml|yaml)$/,
  /web\.xml$/,
  /pom\.xml$/,
  /build\.gradle$/,
  /\.csproj$/,
  /appsettings.*\.json$/,
  /composer\.json$/,
  /\.env$/,
  /config\.(php|js|ts)$/,
];

export interface ImportEdge {
  sourceFile: string;
  importedClass: string;
  language: Language;
}

// Java: 解析 import 語句
function extractJavaImports(content: string, filePath: string): ImportEdge[] {
  const edges: ImportEdge[] = [];
  const regex = /^import\s+(static\s+)?([a-zA-Z_][\w.]+);/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    edges.push({ sourceFile: filePath, importedClass: match[2], language: 'java' });
  }
  return edges;
}

// C#: 解析 using 語句
function extractCSharpUsings(content: string, filePath: string): ImportEdge[] {
  const edges: ImportEdge[] = [];
  const regex = /^using\s+(?:static\s+)?([a-zA-Z_][\w.]+);/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    edges.push({ sourceFile: filePath, importedClass: match[1], language: 'csharp' });
  }
  return edges;
}

// PHP: 解析 use / require / include
function extractPhpDeps(content: string, filePath: string): ImportEdge[] {
  const edges: ImportEdge[] = [];
  const useRegex = /^use\s+([a-zA-Z_\\][\w\\]+)(?:\s+as\s+\w+)?;/gm;
  let match: RegExpExecArray | null;
  while ((match = useRegex.exec(content)) !== null) {
    edges.push({ sourceFile: filePath, importedClass: match[1], language: 'php' });
  }
  return edges;
}

export interface DependencyScanResult {
  dependencyMap: DependencyMap;
  importEdges: ImportEdge[];
}

export function scanDependencies(rootDir: string): DependencyScanResult {
  // 收集 config 檔案
  const allConfigFiles = collectFiles(rootDir, { extensions: CONFIG_EXTENSIONS });
  const configFiles = allConfigFiles.filter(f => {
    const rel = path.relative(rootDir, f);
    return CONFIG_FILE_PATTERNS.some(pat => pat.test(rel));
  });

  // 收集 import 依賴
  const importEdges: ImportEdge[] = [];
  const javaFiles = collectFiles(rootDir, { extensions: ['.java'] });
  const csFiles = collectFiles(rootDir, { extensions: ['.cs'] });
  const phpFiles = collectFiles(rootDir, { extensions: ['.php'] });

  for (const f of javaFiles) {
    try { importEdges.push(...extractJavaImports(fs.readFileSync(f, 'utf8'), f)); } catch { /* skip */ }
  }
  for (const f of csFiles) {
    try { importEdges.push(...extractCSharpUsings(fs.readFileSync(f, 'utf8'), f)); } catch { /* skip */ }
  }
  for (const f of phpFiles) {
    try { importEdges.push(...extractPhpDeps(fs.readFileSync(f, 'utf8'), f)); } catch { /* skip */ }
  }

  // 篩選出專案內部 import（非第三方）
  const internalImports = importEdges.filter(e =>
    !e.importedClass.startsWith('java.') &&
    !e.importedClass.startsWith('javax.') &&
    !e.importedClass.startsWith('jakarta.') &&
    !e.importedClass.startsWith('org.springframework') &&
    !e.importedClass.startsWith('com.fasterxml') &&
    !e.importedClass.startsWith('System.') &&
    !e.importedClass.startsWith('Microsoft.') &&
    !e.importedClass.startsWith('Illuminate\\')
  );

  // 轉換成 DependencyEdge
  const edges: DependencyEdge[] = internalImports.map(e => ({
    from: path.relative(rootDir, e.sourceFile),
    to: e.importedClass,
    relationType: 'file-to-file' as const,
  }));

  const nodes = [...new Set([
    ...configFiles.map(f => path.relative(rootDir, f)),
    ...edges.map(e => e.from),
    ...edges.map(e => e.to),
  ])];

  return {
    importEdges: internalImports,
    dependencyMap: {
      nodes,
      edges,
      configFiles: configFiles.map(f => path.relative(rootDir, f)),
      entryPoints: [],
    },
  };
}
