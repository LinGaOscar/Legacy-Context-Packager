import type { Confidence } from '../models/route.js';

// Route confidence 計算：依掃描方式決定信心分數
export function calcRouteConfidence(opts: {
  hasExplicitAnnotation: boolean; // 明確的 HTTP method annotation
  hasClassLevelPath: boolean;     // class 層有 @RequestMapping 基礎路徑
  isWarBytecode: boolean;         // 從 WAR bytecode 推斷
}): Confidence {
  if (opts.isWarBytecode) return 'low';
  if (opts.hasExplicitAnnotation && opts.hasClassLevelPath) return 'high';
  if (opts.hasExplicitAnnotation) return 'high';
  return 'medium';
}

// Secret confidence 計算：結合 pattern 精確度與 entropy
export function calcSecretConfidence(opts: {
  isKnownPrefix: boolean;  // 已知前綴 pattern（如 AKIA、ghp_）
  entropy: number;         // Shannon entropy of the matched value
  isAllowlisted: boolean;  // 是否在 allowlist 中
}): Confidence {
  if (opts.isAllowlisted) return 'low';
  if (opts.isKnownPrefix) return 'high';
  if (opts.entropy >= 4.0) return 'high';
  if (opts.entropy >= 3.0) return 'medium';
  return 'low';
}

// 計算字串的 Shannon entropy（用於判斷是否為真實 secret）
export function shannonEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (const ch of str) freq[ch] = (freq[ch] ?? 0) + 1;
  return Object.values(freq).reduce((sum, count) => {
    const p = count / str.length;
    return sum - p * Math.log2(p);
  }, 0);
}
