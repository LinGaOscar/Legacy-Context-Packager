# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案定位

**Legacy Context Packager (LCP)** 是企業遺留系統的 LLM 前處理器。在本地靜態抽取 Java / WAR / C# / PHP 專案的路由、入口、設定、敏感資訊與模組關聯，主要輸出 `context-pack.md` 直接交給 LLM 分析。核心價值：省 token、降風險、不依賴 LLM 也能先完成盤點。

## 常用指令

```bash
# 正式使用（先 build 一次，之後直接執行）
npm run build
./lcp              # macOS / Linux（TUI 引導選擇目標路徑）
lcp.bat            # Windows

# 開發時（不需先 build，tsx 直接執行）
npm run dev -- ui
npm run dev -- diff <oldDir> <newDir>

# 型別檢查
npx tsc --noEmit

# 清除 dist/
npm run clean
```

> 此專案目前**無測試框架**，`package.json` 未設 test script。

## 技術選型

- **Runtime**：Node.js + TypeScript（ESM，`"type": "module"`）
- **CLI 框架**：Commander.js
- **TUI**：Ink 7 + React 19
- **HTML report**：靜態 HTML 內嵌 JSON，瀏覽器直接開啟，不需 server

## ESM / TypeScript 注意事項

- **相對 import 必須用 `.js` 副檔名**：`tsconfig` 設 `"module": "Node16"`，即使檔案是 `.ts`，import 路徑仍須寫 `'./foo.js'`。
- **React 需顯式 import**：`tsconfig` 用 `"jsx": "react"`（非 `react-jsx`），每個 TSX 元件頂部必須有 `import React from 'react'`，否則編譯失敗。
- **JSON import**：`resolveJsonModule: true` 已啟用，可直接 `import pkg from '../../package.json'`。

## 架構與模組

**Pipeline 流程**（由 `src/core/runner.ts` 協調）：
`project-loader → file-collector → Scanners（語言別）→ normalizer → redactor → allowlist-filter → condenser → output-builder`

```
src/
├─ cli/main.ts              # CLI 入口，ui / diff 兩個子命令（scan 已移除）
├─ core/
│  ├─ runner.ts             # ★ Pipeline 總協調者
│  ├─ paths.ts              # LCP_OUTPUT_DIR：固定輸出路徑（工具目錄/lcp-output/）
│  ├─ project-loader.ts     # 判斷專案類型（java/csharp/php/war）與框架
│  ├─ file-collector.ts     # 掃描可分析檔案清單
│  ├─ framework-detector.ts # 偵測 Spring / Laravel / ASP.NET Core 等
│  ├─ normalizer.ts         # 各語言 scanner 結果合併成共通格式
│  ├─ redactor.ts           # 敏感值遮罩（先於任何輸出執行）
│  ├─ allowlist.ts          # 讀取 .lcp-allowlist.json，過濾誤報 secret
│  ├─ condenser.ts          # 產出 dependencyMap 與 openApiLite
│  ├─ output-builder.ts     # 寫出 JSON / Markdown / report.html
│  ├─ report-builder.ts     # 產生內嵌資料的靜態 HTML report
│  └─ diff-engine.ts        # 比較兩次掃描結果
├─ scanners/
│  ├─ java-route-scanner.ts   # @RequestMapping / @GetMapping / JAX-RS
│  ├─ csharp-route-scanner.ts # [Route] / [HttpGet] / ASP.NET Core
│  ├─ php-route-scanner.ts    # Laravel routes/web.php & routes/api.php
│  ├─ war-scanner.ts          # 解壓 WAR，掃 WEB-INF/classes & web.xml
│  ├─ web-entry-scanner.ts    # form action / fetch / axios / $.ajax
│  ├─ secret-scanner.ts       # hardcoded token / api key / password
│  └─ dependency-scanner.ts   # 模組、檔案、route、config 關聯
├─ tui/                     # 所有掃描操作均透過 TUI 進行，無 CLI scan 指令
│  ├─ App.tsx               # TUI 根元件，管理掃描狀態與畫面切換
│  ├─ hooks/useScan.ts      # 非同步執行 runScan，回傳進度與結果
│  ├─ screens/
│  │  ├─ InputScreen.tsx    # 三步驟引導：目標類型 → 輸入方式 → 瀏覽/輸入路徑
│  │  ├─ ScanScreen.tsx     # 掃描中畫面，含進度條動畫
│  │  └─ ResultScreen.tsx   # 結果瀏覽，管理 Tab 切換與 s/e/q 快捷鍵
│  ├─ panels/               # Routes / Secrets / Entries / Dependencies / Export
│  │  └─ ExportPanel.tsx    # ★ 主要輸出入口：Context Pack MD、HTML、全部
│  └─ components/
│     ├─ Logo.tsx           # LCP badge + 工具介紹 + 版本號（從 package.json 讀取）
│     ├─ FileBrowser.tsx    # 目錄 / 檔案瀏覽器
│     ├─ TabBar.tsx         # 分頁列（Routes/Secrets/Entries/Dependencies/Export）
│     └─ ...
├─ rules/
│  ├─ secret-patterns.ts    # 已知 pattern：GitHub token、AWS key 等
│  ├─ framework-signatures.ts
│  └─ confidence-rules.ts
└─ models/                  # 共通 TypeScript 型別定義
```

## 共通資料模型

```typescript
ProjectScanResult {
  projectInfo,
  routes[],      // { language, framework, httpMethod, path, sourceFile, className, methodName, confidence }
  webEntries[],  // { entryType, pagePath, targetPath, invokeType, sourceFile, lineNumber, confidence }
  secrets[],     // { secretType, filePath, lineNumber, maskedValue, severity, confidence, ruleId }
  dependencyMap,
  openApiLite,
}
```

## 輸出物

所有輸出統一寫入 `LCP_OUTPUT_DIR`（`src/core/paths.ts`，固定為工具目錄下的 `lcp-output/`）。

| 檔案 | 用途 |
|---|---|
| `context-pack.md` | ★ 主要輸出：系統盤點摘要 + LLM 提示詞，直接貼給 AI |
| `report.html` | 互動式報告，含搜尋篩選（瀏覽器直接開啟） |
| `routes.json` | API path、method、handler 對應（次要，供程式讀取） |
| `web-entry.json` | 頁面入口、form action、JS API 呼叫 |
| `secrets-report.json` | 疑似敏感值，含遮罩與信心分數 |
| `dependency-map.json` | 模組、route、config 依賴摘要 |
| `openapi-lite.json` | 靜態推導的 OpenAPI 雛形（近似，非完整） |

## CLI 子命令

| 指令 | 功能 |
|---|---|
| `lcp [ui] [projectPath]` | 開啟 TUI（path 可選，未給則在 TUI 內選擇） |
| `lcp diff <oldDir> <newDir>` | 比較兩次掃描輸出目錄的差異 |

> `lcp scan` 已移除，掃描與輸出統一由 TUI 控制。

## 重要限制與設計原則

- **Redactor 優先**：任何輸出前必須先執行遮罩，確保 maskedValue 不含明文敏感資訊。
- **Secret Allowlist**：在目標專案根目錄放 `.lcp-allowlist.json`（`[{ "ruleId": "...", "filePath": "..." }]`）可過濾誤報。`filePath` 為子字串比對，兩欄位均 optional 但至少需填一個。
- **靜態分析精度上限**：動態路由、反射、custom middleware 無法靜態推斷。
- **WAR 無 source code 時**：僅能從 `web.xml` 推斷路由，標注 `confidence: low`。
- **openapi-lite 定位**：近似結果，不等同完整 OpenAPI spec。
- **第一版不上 AST 深度解析**：先做規則式與框架導向掃描，JavaParser / Roslyn / PHP-Parser 為後期強化選項。
