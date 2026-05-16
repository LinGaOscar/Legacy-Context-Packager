# Legacy Context Packager 開發計劃書

## 專案名稱

**Legacy Context Packager**

中文可用名稱：**企業專案上下文壓縮器**、**遺留系統分析前處理器**。

一句話定位：在將 Java、C#、PHP 等企業專案交給 LLM 分析前，先離線抽取路由、頁面入口、設定、祕密資訊與模組關聯，輸出高密度、低風險、可直接餵給模型的 context pack，以降低 token 消耗、提升分析品質並避免敏感資訊外流風險。[cite:175][cite:176][cite:182]

## 專案背景

企業內部常見的 Java、WAR、C#、PHP 專案通常結構龐大、設定分散、樣板碼多，若直接將整包專案內容送進模型，不僅 token 成本高，也容易把低價值內容、重複內容與敏感資訊一併送出，導致成本、延遲與風險同步上升。[cite:175][cite:187]

現有做法多半依賴人工挑檔案、貼片段或讓代理直接掃整個 repo，但研究與實務案例都指出，透過前處理、壓縮與結構抽取來提升 token efficiency，可以同時改善成本、延遲與可擴展性。[cite:174][cite:175][cite:176]

因此，本專案不以「直接取代 LLM 分析」為目標，而是作為 **LLM 前處理層**：先在本地完成靜態抽取、遮罩與濃縮，再把真正有價值的內容組裝成可供後續模型分析的最小上下文包。[cite:176][cite:178][cite:182]

## 業務方向

本專案的主要業務方向不是一般開發者玩具，而是偏向企業內部開發、維運、系統盤點與安全前處理工具，特別適合下列情境：[cite:175][cite:166]

- 企業內網環境，不適合直接把完整專案送到外部模型。
- 遺留系統接手，需要先快速知道路由、入口、設定與可能的敏感資訊位置。
- 準備做 LLM 輔助分析，但希望先降低 token 成本與降低誤送敏感資訊的機率。
- 需要先做 API / 路徑 / 設定 / secret 盤點，再決定是否進一步交由模型做 deeper analysis。

### 目標客群

- 銀行、保險、製造、政府等有內網與資安限制的 IT 團隊。
- 維運工程師、系統分析師、架構師、資安檢查人員。
- 接手 legacy system 的開發團隊。
- 想把 LLM 納入流程，但必須先做資料最小化處理的企業團隊。[cite:159][cite:166][cite:168]

### 核心價值主張

- **省 token**：將大體積 source code 轉成結構化摘要與關聯資料，減少無效上下文。[cite:175][cite:176]
- **降風險**：先做 hardcoded secret 掃描與遮罩，避免直接把 token、api key、password 送入模型。[cite:159][cite:169][cite:171]
- **提效率**：先整理 route、entry、dependency、config，再進模型時問題更聚焦。[cite:180][cite:182]
- **可本地執行**：不依賴 LLM 也能先產出 API / 路徑 / 設定盤點結果。[cite:151][cite:150][cite:194]

## 第一版支援範圍

### 輸入型態

第一版支援下列專案型態：

- Java project（Spring MVC / Spring Boot / JAX-RS 為主）。[cite:151][cite:158]
- WAR 檔（解壓後掃描 `WEB-INF/classes`、`web.xml`、JSP 與設定檔）。[cite:148][cite:149]
- C# project（ASP.NET Core Controller routing 為主）。[cite:150][cite:156]
- PHP project（Laravel 為主，補充一般 PHP route / config / entry 掃描）。[cite:194][cite:192]

### 第一版輸出物

- `routes.json`：API path、HTTP method、來源檔案、handler、confidence。
- `web-entry.json`：頁面入口、form action、href、fetch/axios/ajax 呼叫點。
- `secrets-report.json`：疑似 token / api key / secret 清單，含遮罩值與信心分數。[cite:159][cite:169]
- `dependency-map.json`：模組、檔案、route、entry、config 的依賴關係摘要。[cite:180][cite:141]
- `openapi-lite.json`：由靜態分析推導出的 OpenAPI 雛形。[cite:151][cite:150]
- `context-pack.md` / `context-pack.json`：給 LLM 使用的精簡上下文包。[cite:176][cite:182]

## 產品目標

第一版的產品目標不是做到完整 IDE 級語意分析，而是做到「足夠實用的前處理器」：能以高可用、低誤差、低成本方式，快速把專案縮成可分析的 context pack。[cite:175][cite:176]

### 成功指標

- 能從支援框架中抽出大多數顯性 route/path。[cite:151][cite:150][cite:194]
- 能偵測常見 hardcoded secret 類型並支援遮罩。[cite:159][cite:169]
- 能顯著減少送入模型的內容量，僅保留分析需要的結構化資訊。[cite:175][cite:176][cite:187]
- 能讓使用者在不連 LLM 的狀況下先取得可讀的盤點報告。

## 功能設計

### 1. Route Scanner

負責從後端程式抽取 API 路由與 handler 對應：

- Java：`@RequestMapping`、`@GetMapping`、`@PostMapping`、JAX-RS 註解。[cite:151][cite:158]
- C#：`[Route]`、`[HttpGet]`、`[HttpPost]`、ASP.NET Core controller routing。[cite:150][cite:156]
- PHP：Laravel `routes/web.php`、`routes/api.php`、controller route 綁定。[cite:194]
- WAR：掃描 `web.xml`、servlet mapping 與可見 annotation metadata。[cite:148][cite:149]

輸出欄位：

- language
- framework
- httpMethod
- path
- sourceFile
- className
- methodName
- confidence

### 2. Web Entry Scanner

負責抽出畫面或入口相關資訊：

- JSP / HTML / PHP / Blade 檔中的 `form action`、`a href`、script 內 API 呼叫。
- JavaScript / TypeScript 中的 `fetch`、`axios`、`$.ajax`。
- 前後端入口對應，建立頁面入口到 API path 的映射。

輸出欄位：

- entryType
- pagePath
- targetPath
- invokeType
- sourceFile
- lineNumber
- confidence

### 3. Secret Scanner

負責掃描 hardcoded token、api key、password、client secret 與高風險設定值。Secrets detection 的常見方法包含 pattern matching、entropy analysis 與 context-based filtering。[cite:159][cite:163][cite:166]

第一版規則：

- 內建 known patterns：GitHub token、AWS key、Google API key、通用 JWT secret、常見 `api_key` / `client_secret` / `password` 欄位。[cite:161][cite:169]
- generic assignment regex：例如 `apiKey=...`、`client_secret: ...`。
- entropy score：高亂數字串額外加權，提高可疑程度。[cite:159][cite:166]
- allowlist / ignore：避免測試資料、範例字串造成誤報。[cite:163][cite:171]

輸出欄位：

- secretType
- filePath
- lineNumber
- maskedValue
- severity
- confidence
- ruleId

### 4. Dependency Condenser

將原始檔案濃縮成較小的結構圖，而不是把所有 source code 都送給模型。這類 repository-level context organization 與 dependency graph 對 LLM 分析有助益。[cite:180][cite:182]

濃縮內容包括：

- route 對應到 controller / handler。
- 頁面入口對應到 API。
- config / env / properties 對應到模組。
- SQL / DAO / service / repository 的簡化關聯。
- 檔案級、模組級依賴摘要。

### 5. Context Pack Generator

依不同分析目的輸出最小上下文包：

- API Analysis Pack
- Security Review Pack
- Secret Exposure Pack
- Legacy Onboarding Pack
- Endpoint Test Pack

其原則是只保留模型真正需要的資訊，而不是保留完整程式碼全文。[cite:175][cite:176][cite:182]

## 程式邏輯架構

建議採用模組化、可擴充的 pipeline 架構。

### 高層流程

1. 使用者輸入專案路徑或 WAR 檔。
2. Loader 判斷專案類型與框架。
3. File Collector 掃描可分析檔案。
4. 各 Scanner 平行執行：Route / Web Entry / Secret / Config / Dependency。
5. Normalizer 將不同語言結果轉成共通格式。
6. Redactor 先做敏感值遮罩。
7. Condenser 濃縮成 graph / summary。
8. Output Builder 產出 JSON、Markdown、OpenAPI-lite。
9. 若使用者需要，再把 `context-pack` 提供給後續 LLM 流程。[cite:176][cite:180][cite:182]

### 建議模組切分

```text
src/
├─ core/
│  ├─ project-loader
│  ├─ file-collector
│  ├─ framework-detector
│  ├─ normalizer
│  ├─ redactor
│  ├─ condenser
│  └─ output-builder
├─ scanners/
│  ├─ java-route-scanner
│  ├─ csharp-route-scanner
│  ├─ php-route-scanner
│  ├─ war-scanner
│  ├─ web-entry-scanner
│  ├─ secret-scanner
│  └─ dependency-scanner
├─ rules/
│  ├─ secret-patterns
│  ├─ framework-signatures
│  └─ confidence-rules
├─ models/
│  ├─ route.ts
│  ├─ secret.ts
│  ├─ entry.ts
│  ├─ dependency.ts
│  └─ context-pack.ts
└─ cli/
   └─ main
```

### 共通資料模型

```text
ProjectScanResult
├─ projectInfo
├─ routes[]
├─ webEntries[]
├─ secrets[]
├─ dependencies[]
├─ openApiLite
└─ contextPack
```

這樣做的好處是各語言 scanner 只要專注抽取，最後再由 normalizer 合併成統一格式，方便之後擴充 Python、Node.js、Go 等框架。[cite:200][cite:193]

## 技術選型建議

若要兼顧你目前的技術背景與既有單檔輸出能力，建議如下：

- 前端：Vue 3。
- UI：延續現有單頁工具風格。
- 掃描核心：Node.js + TypeScript，方便做檔案掃描、正規表示式與 JSON 輸出。
- DDL / SQL / config parsing：沿用既有 Prism 解析能力可共用者優先。
- 圖形呈現：先以樹狀清單 + 關聯面板為主，圖形視覺化第二期再上。

若 route 靜態分析需要更強精度，可逐步補：

- Java：JavaParser / bytecode 分析工具。
- C#：Roslyn。
- PHP：PHP-Parser / Laravel route 規則分析。

第一版不建議一開始就導入全語言 AST 深度解析，先做規則式與框架導向掃描，比較容易落地。

## 使用流程

### 本地模式

1. 使用者選擇資料夾或 WAR 檔。
2. 系統判斷專案語言與框架。
3. 執行掃描與前處理。
4. 顯示 route、entry、secret、dependency 結果。
5. 使用者選擇輸出 `context-pack.md` 或 `openapi-lite.json`。
6. 再將輸出結果交給模型做下一步分析。

### 典型使用情境

- 接手舊系統時，先盤點 API 與入口頁。
- 送給 LLM 做 API 文件生成前，先抽 `openapi-lite.json`。
- 送給 LLM 做 code review / onboarding 前，先輸出 context pack。
- 先掃 secret，避免敏感資訊外流。[cite:159][cite:171]

## MVP 開發階段

### Phase 1：核心掃描

- 專案類型判斷。
- Java / C# / PHP route 掃描。
- WAR 解壓與基礎掃描。
- Web entry 掃描。
- Secret scanner 基礎版。
- JSON 匯出。

### Phase 2：濃縮與打包

- dependency summary。
- openapi-lite generator。
- context pack generator。
- 遮罩與信心分數。

### Phase 3：介面強化

- route / entry / secret 分頁檢視。
- 搜尋與篩選。
- 匯出 Markdown 報告。
- 差異比較（不同版本專案的 route / secret 差異）。

## 差異化特色

本專案的差異化，不是單純做 route scanner，而是把 **靜態逆向 + secret redaction + token saving** 合在一起。[cite:175][cite:159]

### 特色摘要

- 支援 Java / WAR / C# / PHP，聚焦企業常見專案型態。[cite:151][cite:150][cite:194]
- 先做敏感資訊偵測與遮罩，再進模型。[cite:159][cite:169]
- 不依賴 LLM 即可先完成盤點與壓縮。
- 輸出設計直接對接後續 LLM 分析流程。[cite:176][cite:182]
- 產品定位明確：不是 AI Agent，而是 AI 前處理器。[cite:175][cite:183]

## 風險與限制

- WAR 若無 source code，僅能做到中等精度的 route 推斷。[cite:148][cite:149]
- 大量動態註冊路由、反射、custom middleware 會降低靜態分析完整度。[cite:150][cite:151]
- Secret detection 一定會有誤報，必須設計 whitelist 與 confidence 分級。[cite:159][cite:163][cite:166]
- OpenAPI-lite 只能作為近似結果，不應宣稱完整準確還原 OpenAPI。[cite:144][cite:151]

## 預期成果

第一版完成後，專案應能作為一個本地可執行的前處理工具，將 Java、WAR、C#、PHP 專案轉換為適合後續 LLM 分析的結構化 context pack，達成「更省 token、更少敏感資訊暴露、更快理解專案」三個核心目標。[cite:175][cite:176][cite:159]