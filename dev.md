# 開發指南

## 環境需求

- Node.js 18+
- macOS / Linux 可直接用終端機；Windows 需 Windows Terminal 或 PowerShell（TUI 需要 ANSI 支援）

## 本機設定

```bash
git clone https://github.com/LinGaOscar/Legacy-Context-Packager.git
cd Legacy-Context-Packager
npm install
```

## 本機執行

開發時不需先 build，`tsx` 直接執行 TypeScript：

```bash
npm run dev -- ui                 # 開啟 TUI（不帶路徑，於 TUI 內選擇目標）
npm run dev -- ui /path/to/project  # 直接帶目標專案路徑
```

正式使用（先 build 一次，之後直接執行編譯產物）：

```bash
npm run build
./lcp          # macOS / Linux
lcp.bat        # Windows
```

## 型別檢查

```bash
npx tsc --noEmit
```

## 測試

**目前無測試框架**，`package.json` 沒有設定 `test` script。修改後請至少手動跑一次 `npm run dev -- ui`，對一個範例專案（Java / C# / PHP / Node.js / Python 任一）跑完整掃描流程，確認 TUI 各分頁（Routes / Secrets / Entries / Dependencies / Export）與 Export 輸出的 `context-pack.md`、`report.html` 正常產出。

## 清除編譯產物

```bash
npm run clean   # 等同 rm -rf dist
```

## 結構筆記

- `src/cli/main.ts`：CLI 入口，唯一子命令 `ui`（`scan`、`diff` 皆已移除，統一由 TUI 操作）。
- `src/core/runner.ts`：Pipeline 總協調者，串起 project-loader → 各語言 Scanners → normalizer → redactor → allowlist-filter → condenser → output-builder。
- `src/scanners/`：依語言／框架切分的路由、Entity、Secret、套件依賴掃描器。
- `src/tui/`：Ink + React 的終端機互動介面，所有掃描操作均透過此進行。
- `src/core/paths.ts`：輸出目錄固定為 lcp 工具目錄下的 `lcp-output/`，與被掃描的目標專案無關。
- 完整架構說明見根目錄 `CLAUDE.md`。
- ESM 專案，相對 import 須帶 `.js` 副檔名（`tsconfig` 設 `module: Node16`）；TSX 元件需顯式 `import React from 'react'`（`jsx: react`，非 `react-jsx`）。

## 已知現況

- 未在原始碼中發現任何硬編碼的 secret／API key；`src/rules/secret-patterns.ts` 內只有偵測用的 regex pattern，非真實憑證。
