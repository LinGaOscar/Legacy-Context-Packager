import fs from 'fs';
import path from 'path';
import type { Secret } from '../models/secret.js';
import { SECRET_RULES, ALLOWLIST_VALUES, SKIP_EXTENSIONS } from '../rules/secret-patterns.js';
import { shannonEntropy, calcSecretConfidence } from '../rules/confidence-rules.js';
import { collectFiles } from '../core/file-collector.js';

const SCANNABLE_EXTENSIONS = [
  '.java', '.cs', '.php', '.xml', '.json', '.yaml', '.yml',
  '.properties', '.env', '.config', '.ini', '.toml',
  '.js', '.ts', '.py', '.rb', '.go',
];

function shouldSkipFile(filePath: string): boolean {
  const base = path.basename(filePath);
  return SKIP_EXTENSIONS.has(path.extname(base)) ||
    SKIP_EXTENSIONS.has(base.replace(/.*(\.\w+\.\w+)$/, '$1'));
}

function isAllowlisted(value: string): boolean {
  const lower = value.toLowerCase();
  return ALLOWLIST_VALUES.has(value) ||
    ALLOWLIST_VALUES.has(lower) ||
    value.length < 6 ||
    /^[*x]+$/i.test(value); // 全部是 * 或 x 的佔位符
}

export function scanSecrets(rootDir: string): Secret[] {
  const files = collectFiles(rootDir, { extensions: SCANNABLE_EXTENSIONS });
  const secrets: Secret[] = [];

  for (const filePath of files) {
    if (shouldSkipFile(filePath)) continue;

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const rule of SECRET_RULES) {
        const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          // 優先取 capture group 1（實際 secret 值），否則用整個 match
          const rawValue = match[1] ?? match[0];
          if (isAllowlisted(rawValue)) continue;

          const entropy = shannonEntropy(rawValue);
          const confidence = calcSecretConfidence({
            isKnownPrefix: !rule.entropyCheck, // 已知前綴規則不需 entropy
            entropy,
            isAllowlisted: false,
          });

          if (confidence === 'low' && rule.entropyCheck) continue; // 低信心的 generic pattern 跳過

          secrets.push({
            secretType: rule.name,
            filePath,
            lineNumber: i + 1,
            maskedValue: rawValue, // redactor 會在輸出前遮罩
            rawValue,              // redactor 讀取後清除
            severity: rule.severity,
            confidence,
            ruleId: rule.id,
          });
        }
      }
    }
  }

  return secrets;
}
