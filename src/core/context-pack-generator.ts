import path from 'path';
import type { ProjectScanResult, ContextPackType } from '../models/context-pack.js';
import type { Route } from '../models/route.js';
import type { Secret } from '../models/secret.js';
import { groupRoutesByController, extractPathParams } from './condenser.js';

// 每種 pack 只保留模型真正需要的資訊，不輸出完整 source code

export function generateContextPack(result: ProjectScanResult, packType: ContextPackType): string {
  switch (packType) {
    case 'api-analysis':     return genApiAnalysisPack(result);
    case 'security-review':  return genSecurityReviewPack(result);
    case 'secret-exposure':  return genSecretExposurePack(result);
    case 'legacy-onboarding': return genLegacyOnboardingPack(result);
    case 'endpoint-test':    return genEndpointTestPack(result);
  }
}

// ─── API Analysis Pack ────────────────────────────────────────────────────────
function genApiAnalysisPack(r: ProjectScanResult): string {
  const { projectInfo: p } = r;
  const groups = groupRoutesByController(r.routes);
  const lines: string[] = [];

  lines.push(`# API Analysis Pack — ${path.basename(p.rootPath)}`);
  lines.push(`\n**Language:** ${p.language} | **Framework:** ${p.framework} | **Routes:** ${r.routes.length}`);
  lines.push(`\n> ${r.openApiLite.note}`);

  lines.push('\n## Controller Groups');
  for (const group of groups) {
    lines.push(`\n### ${group.controller}${group.basePath ? ` (base: \`${group.basePath}\`)` : ''}`);
    lines.push('| Method | Path | Handler | Path Params | Confidence |');
    lines.push('|--------|------|---------|-------------|------------|');
    for (const route of group.routes) {
      const params = extractPathParams(route.path);
      lines.push(`| \`${route.httpMethod}\` | \`${route.path}\` | ${route.methodName ?? '-'} | ${params.length ? params.map(p => `{${p}}`).join(', ') : '-'} | ${route.confidence} |`);
    }
  }

  lines.push('\n## OpenAPI-lite Summary');
  lines.push('```json');
  lines.push(JSON.stringify({
    note: r.openApiLite.note,
    paths: r.routes.reduce<Record<string, unknown>>((acc, route) => {
      if (!acc[route.path]) acc[route.path] = {};
      (acc[route.path] as Record<string, unknown>)[route.httpMethod.toLowerCase()] = {
        handler: route.className ? `${route.className}#${route.methodName}` : route.methodName,
        tags: route.className ? [route.className] : [],
      };
      return acc;
    }, {}),
  }, null, 2));
  lines.push('```');

  lines.push('\n## Web Entry Points');
  if (r.webEntries.length === 0) {
    lines.push('_No web entry points found._');
  } else {
    lines.push('| Type | Source File | Target | Invoke |');
    lines.push('|------|------------|--------|--------|');
    for (const e of r.webEntries.slice(0, 30)) {
      lines.push(`| ${e.entryType} | ${path.basename(e.sourceFile)}:${e.lineNumber} | \`${e.targetPath}\` | ${e.invokeType} |`);
    }
    if (r.webEntries.length > 30) lines.push(`\n_（共 ${r.webEntries.length} 筆，僅顯示前 30）_`);
  }

  lines.push(footer(p.scanDurationMs));
  return lines.join('\n');
}

// ─── Security Review Pack ─────────────────────────────────────────────────────
function genSecurityReviewPack(r: ProjectScanResult): string {
  const { projectInfo: p } = r;
  const critical = r.secrets.filter(s => s.severity === 'critical');
  const high = r.secrets.filter(s => s.severity === 'high');
  const sensitiveRoutes = r.routes.filter(ro =>
    /admin|auth|login|token|secret|key|password|internal/i.test(ro.path)
  );
  const lines: string[] = [];

  lines.push(`# Security Review Pack — ${path.basename(p.rootPath)}`);
  lines.push(`\n**Language:** ${p.language} | **Framework:** ${p.framework}`);

  const alertLevel = critical.length > 0 ? '🔴 CRITICAL' : high.length > 0 ? '🟡 HIGH' : '🟢 CLEAN';
  lines.push(`\n## Risk Summary — ${alertLevel}`);
  lines.push(`- Critical secrets: **${critical.length}**`);
  lines.push(`- High severity secrets: **${high.length}**`);
  lines.push(`- Medium/Low secrets: **${r.secrets.filter(s => s.severity === 'medium' || s.severity === 'low').length}**`);
  lines.push(`- Sensitive-looking routes: **${sensitiveRoutes.length}**`);
  lines.push(`- Web entry points (potential attack surface): **${r.webEntries.length}**`);

  lines.push('\n## Exposed Secrets');
  if (r.secrets.length === 0) {
    lines.push('_No secrets detected._');
  } else {
    lines.push('| Severity | Type | File | Line | Masked | Confidence |');
    lines.push('|----------|------|------|------|--------|------------|');
    for (const s of r.secrets) {
      const icon = s.severity === 'critical' ? '🔴' : s.severity === 'high' ? '🟡' : '🟢';
      lines.push(`| ${icon} ${s.severity} | ${s.secretType} | \`${path.basename(s.filePath)}\` | ${s.lineNumber} | \`${s.maskedValue}\` | ${s.confidence} |`);
    }
  }

  lines.push('\n## Sensitive-Looking Routes');
  if (sensitiveRoutes.length === 0) {
    lines.push('_No obviously sensitive route patterns found._');
  } else {
    lines.push('| Method | Path | Handler | Confidence |');
    lines.push('|--------|------|---------|------------|');
    for (const ro of sensitiveRoutes) {
      lines.push(`| \`${ro.httpMethod}\` | \`${ro.path}\` | ${ro.className ?? '-'}#${ro.methodName ?? '-'} | ${ro.confidence} |`);
    }
  }

  lines.push('\n## External-Facing Entry Points');
  if (r.webEntries.length === 0) {
    lines.push('_No web entries._');
  } else {
    lines.push('| Type | File | Target | Method |');
    lines.push('|------|------|--------|--------|');
    for (const e of r.webEntries.slice(0, 20)) {
      lines.push(`| ${e.entryType} | ${path.basename(e.sourceFile)}:${e.lineNumber} | \`${e.targetPath}\` | ${e.httpMethod ?? '-'} |`);
    }
  }

  lines.push(footer(p.scanDurationMs));
  return lines.join('\n');
}

// ─── Secret Exposure Pack ─────────────────────────────────────────────────────
function genSecretExposurePack(r: ProjectScanResult): string {
  const { projectInfo: p } = r;
  const lines: string[] = [];

  lines.push(`# Secret Exposure Pack — ${path.basename(p.rootPath)}`);
  lines.push(`\n**Language:** ${p.language} | **Framework:** ${p.framework}`);
  lines.push(`\n> 此 pack 專為安全審查設計，所有值均已遮罩。`);

  if (r.secrets.length === 0) {
    lines.push('\n## Result\n\n✅ 未偵測到疑似 secret。\n\n仍建議人工檢查動態組裝的設定值與環境變數注入點。');
    lines.push(footer(p.scanDurationMs));
    return lines.join('\n');
  }

  // 按嚴重程度分組
  for (const sev of ['critical', 'high', 'medium', 'low'] as const) {
    const group = r.secrets.filter(s => s.severity === sev);
    if (group.length === 0) continue;

    const icon = sev === 'critical' ? '🔴' : sev === 'high' ? '🟡' : sev === 'medium' ? '🟠' : '🟢';
    lines.push(`\n## ${icon} ${sev.toUpperCase()} (${group.length})`);

    for (const s of group) {
      lines.push(`\n### ${s.secretType} — \`${path.basename(s.filePath)}\`:${s.lineNumber}`);
      lines.push(`- **Rule:** \`${s.ruleId}\``);
      lines.push(`- **Masked value:** \`${s.maskedValue}\``);
      lines.push(`- **Confidence:** ${s.confidence}`);
      lines.push(`- **Full path:** \`${s.filePath}\``);
    }
  }

  lines.push('\n## Recommended Actions');
  if (r.secrets.some(s => s.severity === 'critical')) {
    lines.push('- 🔴 立即輪換所有 critical 等級的 token / key');
    lines.push('- 確認這些 secret 是否已提交至 git history（需用 git-filter-repo 清除）');
  }
  lines.push('- 將 secret 移至環境變數或 Secret Manager');
  lines.push('- 在 CI 加入 secret scanning（如 Trufflehog、Gitleaks）');

  lines.push(footer(p.scanDurationMs));
  return lines.join('\n');
}

// ─── Legacy Onboarding Pack ───────────────────────────────────────────────────
function genLegacyOnboardingPack(r: ProjectScanResult): string {
  const { projectInfo: p } = r;
  const groups = groupRoutesByController(r.routes);
  const lines: string[] = [];

  lines.push(`# Legacy Onboarding Pack — ${path.basename(p.rootPath)}`);
  lines.push(`\n> 此 pack 用於快速理解遺留系統的整體結構，適合作為 LLM 分析的初始上下文。`);

  lines.push('\n## Project Overview');
  lines.push(`| 項目 | 值 |`);
  lines.push(`|------|---|`);
  lines.push(`| 語言 | ${p.language} |`);
  lines.push(`| 框架 | ${p.framework} |`);
  lines.push(`| 可分析檔案數 | ${p.totalFiles} |`);
  lines.push(`| API Routes | ${r.routes.length} |`);
  lines.push(`| Controllers | ${groups.length} |`);
  lines.push(`| Web Entry Points | ${r.webEntries.length} |`);
  lines.push(`| Config Files | ${r.dependencyMap.configFiles.length} |`);
  lines.push(`| 疑似 Secrets | ${r.secrets.length} (critical: ${r.secrets.filter(s => s.severity === 'critical').length}) |`);

  lines.push('\n## API Inventory by Controller');
  for (const group of groups) {
    lines.push(`\n### ${group.controller}${group.basePath ? ` — base: \`${group.basePath}\`` : ''}`);
    for (const route of group.routes) {
      lines.push(`- \`${route.httpMethod} ${route.path}\` → ${route.methodName ?? '?'}`);
    }
  }

  lines.push('\n## Configuration Files');
  if (r.dependencyMap.configFiles.length === 0) {
    lines.push('_No config files found._');
  } else {
    for (const f of r.dependencyMap.configFiles) {
      lines.push(`- \`${f}\``);
    }
  }

  lines.push('\n## Web Entry Points (UI → API mappings)');
  if (r.webEntries.length === 0) {
    lines.push('_No web entry points found._');
  } else {
    const bySource = new Map<string, typeof r.webEntries>();
    for (const e of r.webEntries) {
      const key = path.basename(e.sourceFile);
      if (!bySource.has(key)) bySource.set(key, []);
      bySource.get(key)!.push(e);
    }
    for (const [file, entries] of bySource) {
      lines.push(`\n**${file}**`);
      for (const e of entries.slice(0, 5)) {
        lines.push(`  - ${e.invokeType} → \`${e.targetPath}\` (line ${e.lineNumber})`);
      }
      if (entries.length > 5) lines.push(`  - _（共 ${entries.length} 筆）_`);
    }
  }

  if (r.secrets.length > 0) {
    lines.push('\n## ⚠️ Security Flags');
    lines.push(`偵測到 ${r.secrets.length} 筆疑似 secret，建議在上線前進行 Secret Exposure Pack 深度審查。`);
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    for (const sev of ['critical', 'high', 'medium', 'low'] as const) {
      const count = r.secrets.filter(s => s.severity === sev).length;
      if (count > 0) lines.push(`| ${sev} | ${count} |`);
    }
  }

  lines.push(footer(p.scanDurationMs));
  return lines.join('\n');
}

// ─── Endpoint Test Pack ───────────────────────────────────────────────────────
function genEndpointTestPack(r: ProjectScanResult): string {
  const { projectInfo: p } = r;
  const groups = groupRoutesByController(r.routes);
  const lines: string[] = [];

  lines.push(`# Endpoint Test Pack — ${path.basename(p.rootPath)}`);
  lines.push(`\n> 此 pack 提供 API 端點清單，供 LLM 生成測試案例用。所有路徑為靜態推斷，動態路由可能缺漏。`);
  lines.push(`\n**Framework:** ${p.framework} | **Total endpoints:** ${r.routes.length}`);

  lines.push('\n## Endpoints by Controller');
  for (const group of groups) {
    lines.push(`\n### ${group.controller}`);
    if (group.basePath) lines.push(`Base path: \`${group.basePath}\``);
    lines.push('');
    for (const route of group.routes) {
      const params = extractPathParams(route.path);
      lines.push(`**${route.httpMethod} ${route.path}**`);
      if (params.length > 0) lines.push(`  - Path params: ${params.map(p => `\`{${p}}\``).join(', ')}`);
      lines.push(`  - Handler: \`${route.methodName ?? 'unknown'}\``);
      lines.push(`  - Confidence: ${route.confidence}`);
      lines.push('');
    }
  }

  lines.push('## All Endpoints (flat list for testing)');
  lines.push('```');
  for (const route of r.routes) {
    lines.push(`${route.httpMethod.padEnd(8)} ${route.path}`);
  }
  lines.push('```');

  lines.push(footer(p.scanDurationMs));
  return lines.join('\n');
}

function footer(durationMs: number): string {
  return `\n---\n_Generated by Legacy Context Packager in ${durationMs}ms — openapi-lite 為靜態近似結果，非完整 OpenAPI spec。_`;
}
