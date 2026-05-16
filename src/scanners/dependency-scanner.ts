import fs from 'fs';
import path from 'path';
import type { DependencyMap } from '../models/dependency.js';
import { collectFiles } from '../core/file-collector.js';

// Phase 1 的 dependency scanner：收集 config 檔案清單與入口點
// 深度依賴圖分析留待 Phase 2

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

export function scanDependencies(rootDir: string): DependencyMap {
  const allFiles = collectFiles(rootDir, { extensions: CONFIG_EXTENSIONS });

  const configFiles = allFiles.filter(f => {
    const rel = path.relative(rootDir, f);
    return CONFIG_FILE_PATTERNS.some(pat => pat.test(rel));
  });

  return {
    nodes: configFiles.map(f => path.relative(rootDir, f)),
    edges: [],
    configFiles: configFiles.map(f => path.relative(rootDir, f)),
    entryPoints: [],
  };
}
