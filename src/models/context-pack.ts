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


export interface ProjectScanResult {
  projectInfo: ProjectInfo;
  routes: Route[];
  webEntries: WebEntry[];
  secrets: Secret[];
  dependencyMap: DependencyMap;
  openApiLite: OpenApiLite;
}
