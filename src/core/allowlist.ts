import fs from 'fs';
import path from 'path';
import type { Secret } from '../models/secret.js';

export interface AllowlistEntry {
  ruleId?: string;
  filePath?: string;
}

/**
 * 讀取目標專案根目錄的 .lcp-allowlist.json。
 * 檔案不存在時回傳空陣列；parse 失敗印 warning 並回傳空陣列。
 */
export function loadAllowlist(projectRoot: string): AllowlistEntry[] {
  const allowlistPath = path.join(projectRoot, '.lcp-allowlist.json');
  if (!fs.existsSync(allowlistPath)) return [];

  try {
    const raw = fs.readFileSync(allowlistPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[lcp] 警告：${allowlistPath} 格式錯誤（需為陣列），allowlist 已略過`);
      return [];
    }
    return parsed as AllowlistEntry[];
  } catch {
    console.warn(`[lcp] 警告：無法解析 ${allowlistPath}，allowlist 已略過`);
    return [];
  }
}

/**
 * 從 secrets 陣列中移除被 allowlist 蓋住的項目。
 * 比對邏輯：entry 中有給定的欄位全部符合才算命中：
 *   ruleId  — 完全相等
 *   filePath — secret.filePath.includes(entry.filePath)
 * 兩個欄位都未給定的 entry 直接略過（避免清空所有結果）。
 */
export function filterAllowlisted(secrets: Secret[], allowlist: AllowlistEntry[]): Secret[] {
  if (allowlist.length === 0) return secrets;

  return secrets.filter(secret => {
    return !allowlist.some(entry => {
      // 兩個欄位都未給定，視為無效 entry，不命中
      if (entry.ruleId === undefined && entry.filePath === undefined) return false;

      if (entry.ruleId !== undefined && entry.ruleId !== secret.ruleId) return false;
      if (entry.filePath !== undefined && !secret.filePath.includes(entry.filePath)) return false;

      return true;
    });
  });
}
