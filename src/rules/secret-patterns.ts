import type { Severity } from '../models/secret.js';

export interface SecretRule {
  id: string;
  name: string;
  pattern: RegExp;
  severity: Severity;
  entropyCheck: boolean; // 是否額外做高亂度驗證
}

// 已知 secret 類型的 pattern 規則集
export const SECRET_RULES: SecretRule[] = [
  {
    id: 'github-token',
    name: 'GitHub Token',
    pattern: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})\b/,
    severity: 'critical',
    entropyCheck: false,
  },
  {
    id: 'aws-access-key',
    name: 'AWS Access Key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    severity: 'critical',
    entropyCheck: false,
  },
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    pattern: /(?:aws_secret|aws_secret_access_key)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/i,
    severity: 'critical',
    entropyCheck: true,
  },
  {
    id: 'google-api-key',
    name: 'Google API Key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
    severity: 'critical',
    entropyCheck: false,
  },
  {
    id: 'jwt-secret',
    name: 'JWT Secret',
    pattern: /(?:jwt[._-]?secret|jwt[._-]?key)\s*[=:]\s*["']?([A-Za-z0-9+/=_-]{16,})["']?/i,
    severity: 'high',
    entropyCheck: true,
  },
  {
    id: 'generic-api-key',
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey|api[_-]?token)\s*[=:]\s*["']?([A-Za-z0-9_\-]{16,64})["']?/i,
    severity: 'high',
    entropyCheck: true,
  },
  {
    id: 'generic-client-secret',
    name: 'Client Secret',
    pattern: /(?:client[_-]?secret|app[_-]?secret|oauth[_-]?secret)\s*[=:]\s*["']?([A-Za-z0-9_\-]{16,})["']?/i,
    severity: 'high',
    entropyCheck: true,
  },
  {
    id: 'generic-password',
    name: 'Hardcoded Password',
    pattern: /(?:password|passwd|pwd)\s*[=:]\s*["']([^"'\s]{6,})["']/i,
    severity: 'high',
    entropyCheck: false,
  },
  {
    id: 'db-connection-string',
    name: 'Database Connection String',
    pattern: /(?:jdbc:|mongodb\+srv:|mysql:\/\/|postgres(?:ql)?:\/\/)[^"'\s]{10,}/i,
    severity: 'high',
    entropyCheck: false,
  },
  {
    id: 'private-key-header',
    name: 'Private Key',
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
    severity: 'critical',
    entropyCheck: false,
  },
  {
    id: 'slack-token',
    name: 'Slack Token',
    pattern: /\b(xox[baprs]-[0-9A-Za-z\-]{10,})\b/,
    severity: 'critical',
    entropyCheck: false,
  },
];

// 跳過這些值（常見測試/範例資料，降低誤報）
export const ALLOWLIST_VALUES = new Set([
  'your-api-key',
  'your_api_key',
  'YOUR_API_KEY',
  'example',
  'changeme',
  'password',
  'secret',
  'placeholder',
  'xxxxxxxx',
  '**********',
  'xxx',
  'test',
  'demo',
]);

// 跳過這些副檔名（測試、文件類檔案）
export const SKIP_EXTENSIONS = new Set([
  '.test.ts', '.spec.ts', '.test.js', '.spec.js',
  '.md', '.txt', '.lock', '.sum',
]);
