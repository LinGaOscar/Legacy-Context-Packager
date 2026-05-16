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

  // WAR 檔：交給 war-scanner 解壓，這裡先標記
  if (stat.isFile() && absPath.toLowerCase().endsWith('.war')) {
    return {
      rootDir: absPath,
      originalPath: absPath,
      isWar: true,
      language: 'java',
      framework: 'unknown',
    };
  }

  if (!stat.isDirectory()) {
    throw new Error(`輸入路徑 "${inputPath}" 不是目錄或 WAR 檔`);
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
