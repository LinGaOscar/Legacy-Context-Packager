import fs from 'fs';
import type { WebEntry, EntryType, InvokeType } from '../models/entry.js';
import { collectFiles } from '../core/file-collector.js';

interface EntryPattern {
  entryType: EntryType;
  invokeType: InvokeType;
  regex: RegExp;
  pathGroup: number; // regex group index for the target path
}

// 各類型入口的抽取規則
const ENTRY_PATTERNS: EntryPattern[] = [
  {
    entryType: 'form-action',
    invokeType: 'form-submit',
    regex: /<form[^>]+action\s*=\s*["']([^"'#][^"']*?)["']/gi,
    pathGroup: 1,
  },
  {
    entryType: 'a-href',
    invokeType: 'link',
    regex: /<a[^>]+href\s*=\s*["']([^"'#][^"']*?)["']/gi,
    pathGroup: 1,
  },
  {
    entryType: 'fetch',
    invokeType: 'js-fetch',
    regex: /fetch\s*\(\s*["'`]([^"'`]+)["'`]/g,
    pathGroup: 1,
  },
  {
    entryType: 'axios',
    invokeType: 'js-axios',
    regex: /axios\s*\.\s*(?:get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
    pathGroup: 1,
  },
  {
    entryType: 'jquery-ajax',
    invokeType: 'js-jquery',
    regex: /\$\.(?:ajax|get|post)\s*\(\s*(?:\{[^}]*url\s*:\s*)?["']([^"']+)["']/gi,
    pathGroup: 1,
  },
];

// 跳過靜態資源路徑（圖片、css、字型等），減少雜訊
function isStaticAsset(p: string): boolean {
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)(\?.*)?$/i.test(p);
}

export function scanWebEntries(rootDir: string): WebEntry[] {
  const files = collectFiles(rootDir, {
    extensions: ['.html', '.htm', '.jsp', '.php', '.blade.php', '.vue', '.js', '.ts'],
  });

  const entries: WebEntry[] = [];

  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    for (const pattern of ENTRY_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        const targetPath = match[pattern.pathGroup];
        if (!targetPath || isStaticAsset(targetPath)) continue;

        // 計算行號
        const upToCursor = content.slice(0, match.index);
        const lineNumber = upToCursor.split('\n').length;

        entries.push({
          entryType: pattern.entryType,
          pagePath: filePath,
          targetPath: targetPath.split('?')[0], // 去除 query string
          invokeType: pattern.invokeType,
          sourceFile: filePath,
          lineNumber,
          confidence: 'medium',
        });
      }
    }
  }

  return entries;
}
