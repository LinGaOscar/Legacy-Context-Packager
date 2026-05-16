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
  note?: string;
}

export interface OpenApiLite {
  note: string; // 說明這是近似結果，非完整 OpenAPI spec
  operations: OpenApiLiteOperation[];
}

export interface ProjectScanResult {
  projectInfo: ProjectInfo;
  routes: Route[];
  webEntries: WebEntry[];
  secrets: Secret[];
  dependencyMap: DependencyMap;
  openApiLite: OpenApiLite;
}
