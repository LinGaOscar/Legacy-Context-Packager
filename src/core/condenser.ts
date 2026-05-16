import type { Route } from '../models/route.js';
import type { WebEntry } from '../models/entry.js';
import type { DependencyMap, DependencyEdge } from '../models/dependency.js';
import type { OpenApiLite, OpenApiLiteOperation } from '../models/context-pack.js';

export interface RouteGroup {
  controller: string;
  basePath: string;
  routes: Route[];
}

// 將 route 陣列按 controller 分組
export function groupRoutesByController(routes: Route[]): RouteGroup[] {
  const map = new Map<string, RouteGroup>();

  for (const route of routes) {
    const key = route.className ?? route.sourceFile;
    if (!map.has(key)) {
      map.set(key, {
        controller: key,
        basePath: route.classLevelPath ?? '',
        routes: [],
      });
    }
    map.get(key)!.routes.push(route);
  }

  return Array.from(map.values()).sort((a, b) => a.controller.localeCompare(b.controller));
}

// 從路徑識別路徑參數，e.g. /api/users/{id} → ['id']
export function extractPathParams(routePath: string): string[] {
  const matches = routePath.matchAll(/\{([^}]+)\}|:([a-zA-Z_]\w*)/g);
  return [...matches].map(m => m[1] ?? m[2]);
}

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

  // 合併 dependency scanner 的 config/import edges
  if (base) {
    for (const node of base.nodes) nodes.add(node);
    edges.push(...base.edges);
  }

  return {
    nodes: Array.from(nodes),
    edges,
    configFiles: base?.configFiles ?? [],
    entryPoints: entries.map(e => e.pagePath || e.sourceFile).filter(Boolean),
  };
}

export function buildOpenApiLite(routes: Route[]): OpenApiLite {
  const groups = groupRoutesByController(routes);

  const operations: OpenApiLiteOperation[] = routes.map(r => {
    const pathParams = extractPathParams(r.path);
    return {
      method: r.httpMethod,
      path: r.path,
      handler: r.className
        ? `${r.className}${r.methodName ? '#' + r.methodName : ''}`
        : undefined,
      tags: r.className ? [r.className] : [r.framework],
      pathParams: pathParams.length > 0 ? pathParams : undefined,
      note: r.confidence === 'low' ? '靜態推斷，精度低' : undefined,
    };
  });

  return {
    note: '此為靜態分析近似結果，不等同完整 OpenAPI spec，動態路由與反射無法靜態推斷。',
    operations,
    controllerGroups: groups.map(g => ({
      controller: g.controller,
      basePath: g.basePath,
      routeCount: g.routes.length,
    })),
  };
}
