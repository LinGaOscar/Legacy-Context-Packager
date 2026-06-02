import fs from 'fs';
import type { DbEntity, DbField } from '../models/entity.js';
import { collectFiles } from '../core/file-collector.js';

export function scanPhpEntities(rootDir: string): DbEntity[] {
  const files = collectFiles(rootDir, { extensions: ['.php'] });
  const entities: DbEntity[] = [];

  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch { continue; }

    if (!content.includes('extends Model') && !content.includes('extends Authenticatable')) continue;

    const classPattern = /class\s+(\w+)\s+extends\s+(?:\w+\\)*(?:Model|Authenticatable)\b/g;
    let classMatch: RegExpExecArray | null;

    while ((classMatch = classPattern.exec(content)) !== null) {
      const entityName = classMatch[1];
      const startIdx = classMatch.index;

      const bodyStart = content.indexOf('{', startIdx);
      if (bodyStart === -1) continue;

      let depth = 1;
      let bodyEnd = bodyStart + 1;
      while (bodyEnd < content.length && depth > 0) {
        if (content[bodyEnd] === '{') depth++;
        else if (content[bodyEnd] === '}') depth--;
        bodyEnd++;
      }
      const classBody = content.slice(bodyStart, bodyEnd);

      const tableMatch = classBody.match(/\$table\s*=\s*['"]([^'"]+)['"]/);
      const tableName = tableMatch?.[1];

      const fillableMatch = classBody.match(/\$fillable\s*=\s*\[([\s\S]*?)\]/);
      const fields: DbField[] = fillableMatch
        ? [...fillableMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => ({ name: m[1] }))
        : [];

      if (tableName !== undefined || fields.length > 0) {
        entities.push({ name: entityName, tableName, fields, sourceFile: filePath, language: 'php' });
      }
    }
  }

  return entities;
}
