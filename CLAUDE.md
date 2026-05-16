# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案定位

**Legacy Context Packager** 是企業遺留系統的 LLM 前處理器。它在本地靜態抽取 Java / WAR / C# / PHP 專案的路由、入口、設定、敏感資訊與模組關聯，輸出精簡的 context pack，再交給 LLM 分析。核心價值是：省 token、降風險、不依賴 LLM 也能先完成盤點。

## 技術選型

- **Runtime**：Node.js + TypeScript
- **介面**：CLI 為主，掃描後產出靜態 `report.html`（瀏覽器直接開啟，不需 server）
- **Frontend build**：Vue 3 + Vite，build 出的靜態 HTML 內嵌掃描結果
- **解析強化**（後期）：JavaParser、Roslyn（C#）、PHP-Parser

## 架構與模組

Pipeline 流程：`Loader → File Collector → Scanners（並行）→ Normalizer → Redactor → Condenser → Output Builder`

```
src/
├─ core/
│  ├─ project-loader      # 判斷專案類型與框架
│  ├─ file-collector      # 掃描可分析檔案清單
│  ├─ framework-detector  # 偵測 Spring / Laravel / ASP.NET Core 等
│  ├─ normalizer          # 各語言 scanner 結果合併成共通格式
│  ├─ redactor            # 敏感值遮罩（先於任何輸出執行）
│  ├─ condenser           # 濃縮成 graph / summary
│  └─ output-builder      # 產出 JSON / Markdown / openapi-lite
├─ scanners/
│  ├─ java-route-scanner    # @RequestMapping / @GetMapping / JAX-RS
│  ├─ csharp-route-scanner  # [Route] / [HttpGet] / ASP.NET Core
│  ├─ php-route-scanner     # Laravel routes/web.php & routes/api.php
│  ├─ war-scanner           # 解壓 WAR，掃 WEB-INF/classes & web.xml
│  ├─ web-entry-scanner     # form action / fetch / axios / $.ajax
│  ├─ secret-scanner        # hardcoded token / api key / password
│  └─ dependency-scanner    # 模組、檔案、route、config 關聯
├─ rules/
│  ├─ secret-patterns       # 已知 pattern：GitHub token、AWS key 等
│  ├─ framework-signatures  # 框架識別規則
│  └─ confidence-rules      # 信心分數計算邏輯
├─ models/                  # 共通 TypeScript 型別定義
│  ├─ route.ts
│  ├─ secret.ts
│  ├─ entry.ts
│  ├─ dependency.ts
│  └─ context-pack.ts
└─ cli/
   └─ main                  # CLI 入口
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

## 開發階段

- **Phase 1**：專案類型判斷、Java / C# / PHP route 掃描、WAR 解壓掃描、web entry 掃描、secret scanner 基礎版、JSON 匯出。
- **Phase 2**：dependency summary、openapi-lite generator、context pack generator、遮罩與信心分數。
- **Phase 3**：分頁 UI、搜尋篩選、Markdown 匯出報告、版本差異比較。

## 重要限制與設計原則

- **Redactor 優先**：任何輸出前必須先執行遮罩，確保 maskedValue 不含明文敏感資訊。
- **信心分數分級**：Secret detection 必有誤報，confidence 欄位與 allowlist 是必要設計，不是選配。
- **靜態分析精度上限**：動態路由、反射、custom middleware 無法靜態推斷，不應過度宣稱準確度。
- **WAR 無 source code 時**：僅能做中等精度推斷，輸出應標注 `confidence: low`。
- **openapi-lite 定位**：近似結果，不等同完整 OpenAPI spec，文件與 UI 須說明此限制。
- **第一版不上 AST 深度解析**：先做規則式與框架導向掃描，JavaParser / Roslyn / PHP-Parser 為後期強化選項。
