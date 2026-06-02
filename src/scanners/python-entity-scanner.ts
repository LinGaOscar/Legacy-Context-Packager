import fs from 'fs';
import type { DbEntity, DbField } from '../models/entity.js';
import { collectFiles } from '../core/file-collector.js';

export function scanPythonEntities(rootDir: string): DbEntity[] {
  const files = collectFiles(rootDir, { extensions: ['.py'] });
  const entities: DbEntity[] = [];

  for (const filePath of files) {
    if (filePath.includes('site-packages') || filePath.includes('__pycache__') || filePath.includes('/venv/') || filePath.includes('/.venv/')) continue;

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch { continue; }

    if (!content.includes('models.Model')) continue;

    const lines = content.split('\n');
    let entityName = '';
    let tableName: string | undefined;
    let fields: DbField[] = [];
    let inClass = false;
    let inMeta = false;

    const saveEntity = () => {
      if (inClass && entityName && (tableName !== undefined || fields.length > 0)) {
        entities.push({ name: entityName, tableName, fields, sourceFile: filePath, language: 'python' });
      }
    };

    for (const line of lines) {
      // Top-level class definition (starts at column 0)
      const classMatch = line.match(/^class\s+(\w+)\s*\(([^)]+)\)\s*:/);
      if (classMatch) {
        saveEntity();
        inClass = false;
        inMeta = false;
        const [, name, bases] = classMatch;
        if (bases.match(/\bmodels\.Model\b/)) {
          entityName = name;
          tableName = undefined;
          fields = [];
          inClass = true;
        }
        continue;
      }

      if (!inClass) continue;

      // class Meta (4-space indent)
      if (line.match(/^    class Meta\s*:/)) { inMeta = true; continue; }
      if (inMeta) {
        const dbTableMatch = line.match(/db_table\s*=\s*['"]([^'"]+)['"]/);
        if (dbTableMatch) { tableName = dbTableMatch[1]; }
        if (line.match(/^    \S/) && !line.match(/^\s{8}/)) {
          inMeta = false;
          // fall through to field detection below
        } else {
          continue;
        }
      }

      // Field: 4-space indent, fieldName = models.FieldType(
      const fieldMatch = line.match(/^    (\w+)\s*=\s*models\.(\w+)\s*\(/);
      if (fieldMatch) {
        const [, name, type] = fieldMatch;
        if (name !== 'objects') fields.push({ name, type });
      }
    }

    saveEntity();
  }

  return entities;
}
