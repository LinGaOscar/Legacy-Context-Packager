import fs from 'fs';
import path from 'path';

export interface CollectorOptions {
  extensions: string[];
  excludeDirs?: string[];
  maxFileSizeBytes?: number;
}

const DEFAULT_EXCLUDE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'target', 'bin', 'obj',
  '.idea', '.vscode', '__pycache__', 'vendor', '.gradle',
]);

const DEFAULT_MAX_SIZE = 2 * 1024 * 1024; // 2MB，超過的檔案通常是 generated code，跳過

export function collectFiles(rootDir: string, opts: CollectorOptions): string[] {
  const extSet = new Set(opts.extensions.map(e => e.toLowerCase()));
  const excludeDirs = new Set([
    ...DEFAULT_EXCLUDE_DIRS,
    ...(opts.excludeDirs ?? []),
  ]);
  const maxSize = opts.maxFileSizeBytes ?? DEFAULT_MAX_SIZE;
  const result: string[] = [];

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // 無讀取權限時跳過
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!excludeDirs.has(entry.name)) walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!extSet.has(ext)) continue;
        try {
          const stat = fs.statSync(fullPath);
          if (stat.size <= maxSize) result.push(fullPath);
        } catch {
          // 無法 stat 則跳過
        }
      }
    }
  }

  walk(rootDir);
  return result;
}
