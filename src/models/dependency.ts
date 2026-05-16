export type DependencyRelationType = 'route-to-handler' | 'page-to-api' | 'config-to-module' | 'module-to-module' | 'file-to-file';

export interface DependencyEdge {
  from: string;
  to: string;
  relationType: DependencyRelationType;
  label?: string;
}

export interface DependencyMap {
  nodes: string[];
  edges: DependencyEdge[];
  configFiles: string[];
  entryPoints: string[];
}
