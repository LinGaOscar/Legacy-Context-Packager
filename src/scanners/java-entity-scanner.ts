import fs from 'fs';
import type { DbEntity, DbField } from '../models/entity.js';
import { collectFiles } from '../core/file-collector.js';

export function scanJavaEntities(rootDir: string): DbEntity[] {
  const files = collectFiles(rootDir, { extensions: ['.java'] });
  const entities: DbEntity[] = [];

  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch { continue; }

    if (!content.includes('@Entity')) continue;

    const lines = content.split('\n');
    let pendingEntity = false;
    let tableName: string | undefined;
    let entityName = '';
    let fields: DbField[] = [];
    let braceDepth = 0;
    let inClass = false;
    let pendingColumn: string | undefined;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!inClass) {
        if (trimmed.match(/^@Entity\b/)) {
          pendingEntity = true;
          tableName = undefined;
          fields = [];
          pendingColumn = undefined;
          continue;
        }

        if (pendingEntity) {
          const tableMatch = trimmed.match(/@Table\s*\(\s*(?:name\s*=\s*)?["']([^"']+)["']/);
          if (tableMatch) { tableName = tableMatch[1]; continue; }

          const classMatch = trimmed.match(/(?:public\s+|protected\s+)?(?:abstract\s+)?class\s+(\w+)/);
          if (classMatch) {
            entityName = classMatch[1];
            inClass = true;
            braceDepth = (trimmed.match(/\{/g) || []).length;
            pendingEntity = false;
          }
        }
        continue;
      }

      // Inside class body
      braceDepth += (trimmed.match(/\{/g) || []).length;
      braceDepth -= (trimmed.match(/\}/g) || []).length;

      if (braceDepth <= 0) {
        entities.push({ name: entityName, tableName, fields, sourceFile: filePath, language: 'java' });
        inClass = false;
        entityName = '';
        continue;
      }

      // Only scan direct class members (depth 1)
      if (braceDepth !== 1) { pendingColumn = undefined; continue; }

      const colMatch = trimmed.match(/@Column\s*\([^)]*name\s*=\s*["']([^"']+)["']/);
      if (colMatch) { pendingColumn = colMatch[1]; continue; }
      if (trimmed.match(/^@/)) {
        if (!trimmed.startsWith('@Column')) pendingColumn = undefined;
        continue;
      }

      // private [static] [final] Type fieldName;
      const fieldMatch = trimmed.match(/^private\s+(?:static\s+|final\s+)?(\w[\w<>, ?]*)\s+(\w+)\s*[;=]/);
      if (fieldMatch) {
        const [, type, name] = fieldMatch;
        if (name !== 'serialVersionUID') {
          fields.push({ name, columnName: pendingColumn, type: type.trim() });
        }
      }
      pendingColumn = undefined;
    }
  }

  return entities;
}
