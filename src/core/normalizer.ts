import type { Route } from '../models/route.js';
import type { WebEntry } from '../models/entry.js';
import type { Secret } from '../models/secret.js';

export interface RawScanResults {
  routes: Route[];
  webEntries: WebEntry[];
  secrets: Secret[];
}

// 去除重複的 route（相同 method + path + sourceFile）
function dedupeRoutes(routes: Route[]): Route[] {
  const seen = new Set<string>();
  return routes.filter(r => {
    // 加入 lineNumber 避免相同路徑的合法 overload 被誤刪
    const key = `${r.httpMethod}:${r.path}:${r.sourceFile}:${r.lineNumber ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 去除重複的 web entry
function dedupeEntries(entries: WebEntry[]): WebEntry[] {
  const seen = new Set<string>();
  return entries.filter(e => {
    const key = `${e.entryType}:${e.targetPath}:${e.sourceFile}:${e.lineNumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 去除重複的 secret（相同 filePath + lineNumber + ruleId）
function dedupeSecrets(secrets: Secret[]): Secret[] {
  const seen = new Set<string>();
  return secrets.filter(s => {
    const key = `${s.ruleId}:${s.filePath}:${s.lineNumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalize(results: RawScanResults): RawScanResults {
  return {
    routes: dedupeRoutes(results.routes).sort((a, b) => a.path.localeCompare(b.path)),
    webEntries: dedupeEntries(results.webEntries),
    secrets: dedupeSecrets(results.secrets).sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
  };
}
