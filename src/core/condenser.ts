import type { Route } from '../models/route.js';
import type { WebEntry } from '../models/entry.js';
import type { DependencyMap, DependencyEdge } from '../models/dependency.js';
import type { OpenApiLite, OpenApiLiteOperation } from '../models/context-pack.js';

export function buildDependencyMap(routes: Route[], entries: WebEntry[], base?: DependencyMap): DependencyMap {
  const nodes = new Set<string>();
  const edges: DependencyEdge[] = [];

  for (const route of routes) {
    const handler = route.className
      ? `${route.className}${route.methodName ? '#' + route.methodName : ''}`
      : route.sourceFile;
    nodes.add(route.path);
    nodes.add(handler);
    edges.push({ from: route.path, to: handler, relationType: 'route-to-handler' });
  }

  for (const entry of entries) {
    nodes.add(entry.pagePath || entry.sourceFile);
    nodes.add(entry.targetPath);
    edges.push({
      from: entry.pagePath || entry.sourceFile,
      to: entry.targetPath,
      relationType: 'page-to-api',
      label: entry.invokeType,
    });
  }

  return {
    nodes: Array.from(nodes),
    edges,
    configFiles: base?.configFiles ?? [],
    entryPoints: entries.map(e => e.pagePath || e.sourceFile).filter(Boolean),
  };
}

export function buildOpenApiLite(routes: Route[]): OpenApiLite {
  const operations: OpenApiLiteOperation[] = routes.map(r => ({
    method: r.httpMethod,
    path: r.path,
    handler: r.className
      ? `${r.className}${r.methodName ? '#' + r.methodName : ''}`
      : undefined,
    tags: [r.framework],
    note: r.confidence === 'low' ? '靜態推斷，精度低' : undefined,
  }));

  return {
    note: '此為靜態分析近似結果，不等同完整 OpenAPI spec，動態路由與反射無法靜態推斷。',
    operations,
  };
}
