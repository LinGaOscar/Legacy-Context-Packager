import fs from 'fs';
import type { DbEntity, DbField } from '../models/entity.js';
import { collectFiles } from '../core/file-collector.js';

export function scanNodejsEntities(rootDir: string): DbEntity[] {
  const files = collectFiles(rootDir, { extensions: ['.ts', '.js'] });
  const entities: DbEntity[] = [];

  for (const filePath of files) {
    if (filePath.includes('node_modules') || filePath.includes('/dist/')) continue;

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
    let nextIsColumn = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!inClass) {
        const entityMatch = trimmed.match(/^@Entity\s*(?:\(\s*['"]([^'"]+)['"]\s*\))?/);
        if (entityMatch) {
          pendingEntity = true;
          tableName = entityMatch[1];
          fields = [];
          pendingColumn = undefined;
          continue;
        }

        if (pendingEntity) {
          const classMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)/);
          if (classMatch) {
            entityName = classMatch[1];
            inClass = true;
            braceDepth = (trimmed.match(/\{/g) || []).length;
            pendingEntity = false;
          }
        }
        continue;
      }

      braceDepth += (trimmed.match(/\{/g) || []).length;
      braceDepth -= (trimmed.match(/\}/g) || []).length;

      if (braceDepth <= 0) {
        entities.push({ name: entityName, tableName, fields, sourceFile: filePath, language: 'nodejs' });
        inClass = false;
        entityName = '';
        continue;
      }

      if (braceDepth !== 1) { pendingColumn = undefined; nextIsColumn = false; continue; }

      // @Column({ name: 'col_name' })
      const colNameMatch = trimmed.match(/^@Column\s*\(\s*\{[^}]*name\s*:\s*['"]([^'"]+)['"]/);
      if (colNameMatch) { pendingColumn = colNameMatch[1]; nextIsColumn = true; continue; }

      const isColumnDecorator = trimmed.match(/^@(?:Column|PrimaryGeneratedColumn|PrimaryColumn|CreateDateColumn|UpdateDateColumn|DeleteDateColumn)\b/);
      if (isColumnDecorator) { nextIsColumn = true; continue; }

      if (trimmed.match(/^@/)) { pendingColumn = undefined; nextIsColumn = false; continue; }

      // Only record property if immediately after a column decorator
      if (nextIsColumn) {
        const propMatch = trimmed.match(/^(\w+)\s*[?!]?\s*:\s*([\w[\]<>| ]+)\s*[;=]/);
        if (propMatch && !trimmed.startsWith('//')) {
          const [, name, type] = propMatch;
          fields.push({ name, columnName: pendingColumn, type: type.trim() });
        }
        pendingColumn = undefined;
        nextIsColumn = false;
      }
    }
  }

  return entities;
}
