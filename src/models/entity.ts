import type { Language } from './route.js';

export interface DbField {
  name: string;        // 程式碼中的屬性 / 欄位名稱
  columnName?: string; // 資料庫欄位名稱（若與 name 不同時才填）
  type?: string;       // 資料類型字串（靜態近似）
}

export interface DbEntity {
  name: string;       // class / model 名稱
  tableName?: string; // 明確指定的資料表名稱
  fields: DbField[];
  sourceFile: string;
  language: Language;
}
