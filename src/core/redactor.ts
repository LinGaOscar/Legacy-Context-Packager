import type { Secret } from '../models/secret.js';

// 將明文 secret 值遮罩，僅保留前 4 碼 + *** + 後 4 碼
function maskValue(raw: string): string {
  if (raw.length <= 6) return '****';
  // 保留前 2 + 後 2 避免遮罩後比原始更長
  if (raw.length <= 12) return raw.slice(0, 2) + '****' + raw.slice(-2);
  return raw.slice(0, 4) + '****' + raw.slice(-4);
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
