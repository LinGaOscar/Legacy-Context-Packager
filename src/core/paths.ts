import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 編譯後位於 dist/core/paths.js，往上兩層即 lcp 工具根目錄
export const LCP_OUTPUT_DIR = path.resolve(__dirname, '../../lcp-output');
