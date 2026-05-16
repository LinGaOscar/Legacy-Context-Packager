import type { Secret } from '../models/secret.js';

// 將明文 secret 值遮罩，僅保留前 4 碼 + *** + 後 4 碼
function maskValue(raw: string): string {
  if (raw.length <= 8) return '****';
  const prefix = raw.slice(0, 4);
  const suffix = raw.slice(-4);
  return `${prefix}****${suffix}`;
}

// Redactor 是 pipeline 最後一道防線，必須在任何輸出前執行
// 清除 rawValue，確保明文不進入輸出物
export function redactSecrets(secrets: Secret[]): Secret[] {
  return secrets.map(s => {
    const masked = s.rawValue ? maskValue(s.rawValue) : s.maskedValue;
    const { rawValue: _dropped, ...safe } = s;
    return { ...safe, maskedValue: masked };
  });
}
