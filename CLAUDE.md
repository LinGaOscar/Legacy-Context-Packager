# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案定位

**Legacy Context Packager** 是企業遺留系統的 LLM 前處理器。它在本地靜態抽取 Java / WAR / C# / PHP 專案的路由、入口、設定、敏感資訊與模組關聯，輸出精簡的 context pack，再交給 LLM 分析。核心價值是：省 token、降風險、不依賴 LLM 也能先完成盤點。

## 常用指令

```bash
# 開發時執行（不需先 build）
npm run dev -- scan <projectPath>
npm run dev -- ui <projectPath>
npm run dev -- diff <oldDir> <newDir>

# 編譯為 dist/（CLI 正式使用）
npm run build

# 直接用編譯後的 CLI
node dist/cli/main.js scan <projectPath> -o ./output --pack all
```

## 技術選型

- **Runtime**：Node.js + TypeScript（ESM，`"type": "module"`）
- **CLI 框架**：Commander.js
- **TUI**：Ink 7 + React 19（終端機互動介面，`lcp ui` 指令）
- **HTML report**：靜態 HTML 內嵌 JSON，瀏覽器直接開啟，不需 server
- **解析強化**（後期）：JavaParser、Roslyn（C#）、PHP-Parser

## 架構與模組

**Pipeline 流程**（由 `src/core/runner.ts` 協調）：
`project-loader → file-collector → Scanners（語言別）→ normalizer → redactor → condenser → output-builder`

```
src/
├─ cli/main.ts              # CLI 入口，定義 scan / ui / diff 三個子命令
├─ core/
│  ├─ runner.ts             # ★ Pipeline 總協調者，串接所有 scanners 與 core 模組
│  ├─ project-loader.ts     # 判斷專案類型（java/csharp/php/war）與框架
│  ├─ file-collector.ts     # 掃描可分析檔案清單
│  ├─ framework-detector.ts # 偵測 Spring / Laravel / ASP.NET Core 等
│  ├─ normalizer.ts         # 各語言 scanner 結果合併成共通格式
│  ├─ redactor.ts           # 敏感值遮罩（先於任何輸出執行）
│  ├─ condenser.ts          # 產出 dependencyMap 與 openApiLite
│  ├─ output-builder.ts     # 寫出 JSON / Markdown / report.html
│  ├─ report-builder.ts     # 產生內嵌資料的靜態 HTML report
│  ├─ context-pack-generator.ts  # 依 pack 類型產生精簡 LLM 上下文包
│  └─ diff-engine.ts        # 比較兩次掃描結果（routes / secrets diff）
├─ scanners/
│  ├─ java-route-scanner.ts   # @RequestMapping / @GetMapping / JAX-RS
│  ├─ csharp-route-scanner.ts # [Route] / [HttpGet] / ASP.NET Core
│  ├─ php-route-scanner.ts    # Laravel routes/web.php & routes/api.php
│  ├─ war-scanner.ts          # 解壓 WAR，掃 WEB-INF/classes & web.xml
│  ├─ web-entry-scanner.ts    # form action / fetch / axios / $.ajax
│  ├─ secret-scanner.ts       # hardcoded token / api key / password
│  └─ dependency-scanner.ts   # 模組、檔案、route、config 關聯
├─ tui/                     # Ink + React TUI（lcp ui 命令）
│  ├─ App.tsx               # TUI 根元件，管理掃描狀態與頁面切換
│  ├─ hooks/useScan.ts      # 非同步執行 runScan，回傳進度與結果
│  ├─ screens/              # ScanScreen（掃描中）、ResultScreen（結果瀏覽）
│  ├─ panels/               # Routes / Entries / Secrets / Deps 各分頁
│  └─ components/           # Header、TabBar、ScrollTable、StatusBar、DetailOverlay
├─ rules/
│  ├─ secret-patterns.ts    # 已知 pattern：GitHub token、AWS key 等
│  ├─ framework-signatures.ts
│  └─ confidence-rules.ts
└─ models/                  # 共通 TypeScript 型別定義
   ├─ route.ts / secret.ts / entry.ts / dependency.ts / context-pack.ts
```

## 共通資料模型

```typescript
ProjectScanResult {
  projectInfo,
  routes[],      // { language, framework, httpMethod, path, sourceFile, className, methodName, confidence }
  webEntries[],  // { entryType, pagePath, targetPath, invokeType, sourceFile, lineNumber, confidence }
  secrets[],     // { secretType, filePath, lineNumber, maskedValue, severity, confidence, ruleId }
  dependencies[],
  openApiLite,
  contextPack
}
```

## 輸出物

| 檔案 | 用途 |
|---|---|
| `routes.json` | API path、method、handler 對應 |
| `web-entry.json` | 頁面入口、form action、JS API 呼叫 |
| `secrets-report.json` | 疑似敏感值，含遮罩與信心分數 |
| `dependency-map.json` | 模組、route、config 依賴摘要 |
| `openapi-lite.json` | 靜態推導的 OpenAPI 雛形（近似，非完整） |
| `context-pack.md` / `.json` | 給 LLM 的精簡上下文包 |

## CLI 子命令

| 指令 | 功能 |
|---|---|
| `lcp scan <path>` | 掃描並輸出 JSON / Markdown / report.html |
| `lcp ui <path>` | 掃描並以 Ink TUI 互動瀏覽（需 TTY） |
| `lcp diff <oldDir> <newDir>` | 比較兩次 scan 輸出目錄的差異 |

`scan` 常用選項：`--output <dir>`、`--format json,markdown`、`--pack api-analysis,security-review,secret-exposure,legacy-onboarding,endpoint-test`（或 `--pack all`）、`--no-secrets`、`--no-report`

## 重要限制與設計原則

- **Redactor 優先**：任何輸出前必須先執行遮罩，確保 maskedValue 不含明文敏感資訊。
- **信心分數分級**：Secret detection 必有誤報，confidence 欄位與 allowlist 是必要設計，不是選配。
- **靜態分析精度上限**：動態路由、反射、custom middleware 無法靜態推斷，不應過度宣稱準確度。
- **WAR 無 source code 時**：僅能做中等精度推斷，輸出應標注 `confidence: low`。
- **openapi-lite 定位**：近似結果，不等同完整 OpenAPI spec，文件與 UI 須說明此限制。
- **第一版不上 AST 深度解析**：先做規則式與框架導向掃描，JavaParser / Roslyn / PHP-Parser 為後期強化選項。
