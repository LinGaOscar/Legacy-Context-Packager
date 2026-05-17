import fs from 'fs';
import path from 'path';
import type { Language, Framework } from '../models/route.js';
import { detectFramework } from './framework-detector.js';

export interface LoadedProject {
  rootDir: string;        // 實際掃描的根目錄（WAR 解壓後為暫存目錄）
  originalPath: string;   // 使用者傳入的路徑
  isWar: boolean;
  language: Language;
  framework: Framework;
  tempDir?: string;       // WAR 解壓暫存目錄，結束後需清理
}

export function loadProject(inputPath: string): LoadedProject {
  const stat = fs.statSync(inputPath);
  const absPath = path.resolve(inputPath);

  if (stat.isFile()) {
    const ext = path.extname(absPath).toLowerCase();

    // WAR 檔：交給 war-scanner 解壓
    if (ext === '.war') {
      return {
        rootDir: absPath,
        originalPath: absPath,
        isWar: true,
        language: 'java',
        framework: 'unknown',
      };
    }

    // 單一原始碼檔：以父目錄為掃描根，語言由副檔名決定
    const langMap: Record<string, Language> = {
      '.java': 'java',
      '.cs':   'csharp',
      '.php':  'php',
    };
    const language = langMap[ext];
    if (!language) {
      throw new Error(`不支援的單檔類型 "${ext}"，支援：.war .java .cs .php，或傳入專案目錄`);
    }
    return {
      rootDir: path.dirname(absPath),
      originalPath: absPath,
      isWar: false,
      language,
      framework: 'unknown',
    };
  }

  const { language, framework } = detectFramework(absPath);
  return {
    rootDir: absPath,
    originalPath: absPath,
    isWar: false,
    language,
    framework,
  };
}
