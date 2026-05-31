import fs from 'fs';
import path from 'path';
import type { PkgDep } from '../models/pkg-dep.js';
import { collectFiles } from '../core/file-collector.js';

function parsePomXml(content: string, filename: string): PkgDep[] {
  const deps: PkgDep[] = [];
  const depBlockRe = /<dependency>([\s\S]*?)<\/dependency>/g;
  let block: RegExpExecArray | null;
  while ((block = depBlockRe.exec(content)) !== null) {
    const inner = block[1];
    const group    = inner.match(/<groupId>(.*?)<\/groupId>/)?.[1]?.trim();
    const artifact = inner.match(/<artifactId>(.*?)<\/artifactId>/)?.[1]?.trim();
    const version  = inner.match(/<version>(.*?)<\/version>/)?.[1]?.trim();
    if (group && artifact) {
      deps.push({ name: `${group}:${artifact}`, version, source: filename });
    }
  }
  return deps;
}

function parseBuildGradle(content: string, filename: string): PkgDep[] {
  const deps: PkgDep[] = [];
  const re = /(?:implementation|compile|api|runtimeOnly|testImplementation)\s*[("']([^"')]+)[)"']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const raw = m[1].trim();
    const parts = raw.split(':');
    if (parts.length >= 2) {
      deps.push({ name: `${parts[0]}:${parts[1]}`, version: parts[2], source: filename });
    }
  }
  return deps;
}

function parseCsproj(content: string, filename: string): PkgDep[] {
  const deps: PkgDep[] = [];
  const re = /<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]*)")?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    deps.push({ name: m[1], version: m[2] || undefined, source: filename });
  }
  return deps;
}

function parseComposerJson(content: string, filename: string): PkgDep[] {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const req = parsed['require'] as Record<string, string> | undefined;
    if (!req) return [];
    return Object.entries(req)
      .filter(([name]) => name !== 'php')
      .map(([name, version]) => ({ name, version, source: filename }));
  } catch { return []; }
}

function parsePackageJson(content: string, filename: string): PkgDep[] {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const deps: PkgDep[] = [];
    for (const key of ['dependencies', 'devDependencies'] as const) {
      const section = parsed[key] as Record<string, string> | undefined;
      if (!section) continue;
      for (const [name, version] of Object.entries(section)) {
        deps.push({ name, version, source: filename });
      }
    }
    return deps;
  } catch { return []; }
}

export function scanPkgDeps(rootDir: string): PkgDep[] {
  const deps: PkgDep[] = [];
  const targets = collectFiles(rootDir, { extensions: ['.xml', '.gradle', '.csproj', '.json'] });

  for (const filePath of targets) {
    const filename = path.basename(filePath);
    let content: string;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    if (filename === 'pom.xml')            deps.push(...parsePomXml(content, filename));
    else if (filename === 'build.gradle')  deps.push(...parseBuildGradle(content, filename));
    else if (filename.endsWith('.csproj')) deps.push(...parseCsproj(content, filename));
    else if (filename === 'composer.json') deps.push(...parseComposerJson(content, filename));
    else if (filename === 'package.json')  deps.push(...parsePackageJson(content, filename));
  }

  const seen = new Set<string>();
  return deps.filter(d => {
    const key = `${d.source}:${d.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
