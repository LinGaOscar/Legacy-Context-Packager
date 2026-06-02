import fs from 'fs';
import type { DbEntity, DbField } from '../models/entity.js';
import { collectFiles } from '../core/file-collector.js';

export function scanCSharpEntities(rootDir: string): DbEntity[] {
  const files = collectFiles(rootDir, { extensions: ['.cs'] });
  const entities: DbEntity[] = [];

  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch { continue; }

    if (!content.includes('[Table') && !content.includes('[Column')) continue;

    const lines = content.split('\n');
    let pendingTable: string | undefined;
    let entityName = '';
    let fields: DbField[] = [];
    let braceDepth = 0;
    let inClass = false;
    let pendingColumn: string | undefined;
    let hasColumnAttr = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!inClass) {
        const tableMatch = trimmed.match(/\[Table\s*\(\s*["']([^"']+)["']\s*\)\]/);
        if (tableMatch) { pendingTable = tableMatch[1]; continue; }

        const classMatch = trimmed.match(/(?:public|internal|private)\s+(?:partial\s+)?class\s+(\w+)/);
        if (classMatch) {
          entityName = classMatch[1];
          fields = [];
          pendingColumn = undefined;
          hasColumnAttr = false;
          braceDepth = (trimmed.match(/\{/g) || []).length;
          inClass = true;
          continue;
        }
        continue;
      }

      braceDepth += (trimmed.match(/\{/g) || []).length;
      braceDepth -= (trimmed.match(/\}/g) || []).length;

      if (braceDepth <= 0) {
        if (pendingTable !== undefined || hasColumnAttr) {
          entities.push({ name: entityName, tableName: pendingTable, fields, sourceFile: filePath, language: 'csharp' });
        }
        inClass = false;
        pendingTable = undefined;
        entityName = '';
        continue;
      }

      if (braceDepth !== 1) { pendingColumn = undefined; continue; }

      const colNameMatch = trimmed.match(/\[Column\s*\(\s*["']([^"']+)["']\s*\)\]/);
      if (colNameMatch) { pendingColumn = colNameMatch[1]; hasColumnAttr = true; continue; }
      if (trimmed.match(/^\[Column\b/)) { hasColumnAttr = true; continue; }
      if (trimmed.match(/^\[(?:Key|Required|MaxLength|StringLength|NotMapped)\b/)) { continue; }
      if (trimmed.match(/^\[/)) { pendingColumn = undefined; continue; }

      // public [virtual|override|static] Type Name { get; set; }
      const propMatch = trimmed.match(/^public\s+(?:virtual\s+|override\s+|static\s+)?(\w[\w?<>, [\]]*)\s+(\w+)\s*\{[^}]*get/);
      if (propMatch) {
        const [, type, name] = propMatch;
        if (!type.startsWith('DbSet')) {
          fields.push({ name, columnName: pendingColumn, type: type.replace('?', '').trim() });
        }
        pendingColumn = undefined;
      } else {
        pendingColumn = undefined;
      }
    }
  }

  return entities;
}
