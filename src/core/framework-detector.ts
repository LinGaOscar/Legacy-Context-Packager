import fs from 'fs';
import path from 'path';
import type { Language, Framework } from '../models/route.js';
import { FRAMEWORK_SIGNATURES } from '../rules/framework-signatures.js';
import { collectFiles } from './file-collector.js';

export interface DetectionResult {
  language: Language;
  framework: Framework;
}

// 讀取多個檔案內容，合併成一個字串（供 pattern 比對）
function readFilesContent(files: string[], maxPerFile = 8192): string {
  return files.map(f => {
    try {
      const buf = Buffer.alloc(maxPerFile);
      const fd = fs.openSync(f, 'r');
      const bytesRead = fs.readSync(fd, buf, 0, maxPerFile, 0);
      fs.closeSync(fd);
      return buf.subarray(0, bytesRead).toString('utf8');
    } catch {
      return '';
    }
  }).join('\n');
}

export function detectFramework(rootDir: string): DetectionResult {
  const allFiles = collectFiles(rootDir, {
    extensions: ['.xml', '.gradle', '.properties', '.yml', '.yaml', '.csproj', '.json', '.php', '.cs', '.java'],
  });

  const relativeFiles = allFiles.map(f => path.relative(rootDir, f));
  const sampleContent = readFilesContent(allFiles.slice(0, 30)); // 最多取前 30 個檔案採樣

  for (const sig of FRAMEWORK_SIGNATURES) {
    let score = 0;
    for (const pat of sig.filePatterns) {
      if (relativeFiles.some(f => pat.test(f))) score++;
    }
    for (const pat of sig.contentPatterns) {
      if (pat.test(sampleContent)) score++;
    }
    if (score >= sig.minScore) {
      return { language: sig.language, framework: sig.framework };
    }
  }

  // fallback：依副檔名猜語言
  const javaCount = allFiles.filter(f => f.endsWith('.java')).length;
  const csCount = allFiles.filter(f => f.endsWith('.cs')).length;
  const phpCount = allFiles.filter(f => f.endsWith('.php')).length;

  if (javaCount > csCount && javaCount > phpCount) return { language: 'java', framework: 'unknown' };
  if (csCount > javaCount && csCount > phpCount) return { language: 'csharp', framework: 'unknown' };
  if (phpCount > 0) return { language: 'php', framework: 'generic-php' };

  return { language: 'unknown', framework: 'unknown' };
}
