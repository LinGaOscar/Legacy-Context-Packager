import type { Route, Language, Framework } from './route.js';
import type { Secret } from './secret.js';
import type { WebEntry } from './entry.js';
import type { DependencyMap } from './dependency.js';

export interface ProjectInfo {
  rootPath: string;
  language: Language;
  framework: Framework;
  totalFiles: number;
  scannedFiles: number;
  scanDurationMs: number;
}

export interface OpenApiLiteOperation {
  method: string;
  path: string;
  handler?: string;
  tags?: string[];
  pathParams?: string[];
  note?: string;
}

export interface OpenApiLiteControllerGroup {
  controller: string;
  basePath: string;
  routeCount: number;
}

export interface OpenApiLite {
  note: string;
  operations: OpenApiLiteOperation[];
  controllerGroups?: OpenApiLiteControllerGroup[];
}

// Context Pack 的目的類型
export type ContextPackType =
  | 'api-analysis'       // 給 LLM 分析 API 結構用
  | 'security-review'    // 給 LLM 做安全審查用
  | 'secret-exposure'    // 聚焦敏感資訊暴露
  | 'legacy-onboarding'  // 遺留系統快速上手
  | 'endpoint-test';     // 給測試生成用

export interface ProjectScanResult {
  projectInfo: ProjectInfo;
  routes: Route[];
  webEntries: WebEntry[];
  secrets: Secret[];
  dependencyMap: DependencyMap;
  openApiLite: OpenApiLite;
}
