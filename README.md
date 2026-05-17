# Legacy Context Packager

企業遺留系統的 LLM 前處理器。在將 Java、WAR、C#、PHP 專案交給 LLM 分析前，先離線抽取路由、頁面入口、敏感資訊與模組關聯，輸出高密度、低風險的 context pack。

## 環境需求

| 環境 | 需求 |
|------|------|
| macOS / Linux | Node.js 18+ |
| Windows | Node.js 18+、Windows Terminal 或 PowerShell（TUI 功能需要 ANSI 支援，不相容舊版 cmd.exe） |

## 部署

### macOS / Linux

```bash
git clone https://github.com/LinGaOscar/Legacy-Context-Packager.git
cd Legacy-Context-Packager
npm install
npm run build
chmod +x lcp
```

### 閉源 / 無網路環境（Windows）

於有網路的機器完成打包後，將整包移入目標機：

```bash
# 於有網路的機器執行
npm install && npm run build
tar --exclude='node_modules/.cache' \
    -czf lcp-bundle.tar.gz \
    dist/ node_modules/ package.json lcp.bat
```

目標機：
1. 確認 Node.js 18+ 已安裝（可提前下載 `.msi` 一併帶入）
2. 解壓 `lcp-bundle.tar.gz`
3. 直接執行 `lcp.bat`

## 使用方式

專案根目錄提供 `./lcp`（macOS/Linux）與 `lcp.bat`（Windows）執行檔，可直接呼叫：

```bash
# 掃描資料夾（預設輸出至 ./lcp-output）
./lcp scan ./my-java-project

# 掃描 WAR 檔
./lcp scan ./app.war

# 指定輸出目錄
./lcp scan ./my-project --output ./output

# 跳過 secret 掃描（加快速度）
./lcp scan ./my-project --no-secrets

# 不產出 report.html
./lcp scan ./my-project --no-report

# 輸出指定 context pack 類型
./lcp scan ./my-project --pack legacy-onboarding

# 一次輸出所有 context pack
./lcp scan ./my-project --pack all

# 組合多種 pack
./lcp scan ./my-project --pack security-review,api-analysis
```

### 互動式 TUI 瀏覽（需終端機環境）

```bash
# 不帶路徑，進入 TUI 後選擇掃描目標（建議）
./lcp ui

# 帶路徑直接開始掃描（略過選擇步驟）
./lcp ui ./my-java-project

# Windows
lcp.bat ui
```

TUI 啟動後依序引導三個步驟：

1. **選擇掃描目標類型**：專案目錄 或 單一檔案（`.war` / `.java` / `.cs` / `.php`）
2. **選擇輸入方式**：瀏覽並選擇 或 直接輸入絕對路徑
3. 若選擇「瀏覽」：以方向鍵在目錄樹中導航，Enter 進入子目錄或選取檔案，Backspace 返回上層

各步驟可按 Esc 返回上一步。掃描完成後以分頁瀏覽結果，按 `e` 匯出當前分頁為 Markdown，`q` 離開。

### 比較兩次掃描差異

```bash
# 比較舊版與新版掃描結果，輸出 Markdown 差異報告
./lcp diff ./old-output ./new-output

# 指定輸出路徑
./lcp diff ./old-output ./new-output --output ./changes.md
```

差異報告會列出新增／移除的 routes，以及新偵測到或已消失的 secrets。

## 輸出檔案

掃描完成後，`lcp-output/` 目錄包含：

| 檔案 | 說明 |
|------|------|
| `routes.json` | API path、HTTP method、handler 對應，含信心分數 |
| `web-entry.json` | 頁面入口、form action、fetch/axios/jQuery AJAX 呼叫 |
| `secrets-report.json` | 疑似敏感值（已遮罩），含嚴重度與信心分數 |
| `dependency-map.json` | 模組、route、config 依賴摘要與 import 關聯 |
| `openapi-lite.json` | 靜態推導的 OpenAPI 雛形（近似值，非完整 spec） |
| `context-pack.json` | 掃描摘要 + 統計數字 |
| `context-pack.md` | Markdown 格式的完整摘要報告 |
| `report.html` | 互動式 HTML 報告，含搜尋篩選、分頁瀏覽、Markdown 匯出（瀏覽器直接開啟） |

### Context Pack 類型（`lcp-output/packs/`）

使用 `--pack` 選項可依不同目的輸出 LLM-ready 的 Markdown pack：

| Pack 類型 | 說明 | 適用情境 |
|-----------|------|---------|
| `api-analysis` | 按 controller 分組的 API 清單 + OpenAPI-lite | 交給 LLM 分析 API 結構、生成文件 |
| `security-review` | 風險等級、敏感路由、secret 清單 | 安全審查、合規檢查 |
| `secret-exposure` | 按嚴重度分組的 secret 報告 + 修復建議 | 敏感資訊盤點 |
| `legacy-onboarding` | 專案總覽、API 清單、config 清單 | 接手遺留系統快速上手 |
| `endpoint-test` | 扁平 endpoint 清單 + 路徑參數 | 交給 LLM 生成測試案例 |

## 支援專案類型

| 語言 | 框架 | 掃描內容 |
|------|------|---------|
| Java | Spring Boot / Spring MVC | `@GetMapping`、`@PostMapping`、`@RequestMapping` 等 annotation |
| Java | JAX-RS | `@GET`、`@POST`、`@Path` 等 annotation |
| Java | WAR 檔 | 解壓後掃描 `web.xml` servlet mapping，有 source 時掃 annotation |
| C# | ASP.NET Core | `[HttpGet]`、`[HttpPost]`、`[Route]` 等 attribute |
| PHP | Laravel | `Route::get()`、`Route::post()` 等，支援 `Route::group` 巢狀前綴 |

## Secret 偵測規則

內建以下類型的 hardcoded secret 偵測：

- GitHub Token（`ghp_`、`github_pat_`）
- AWS Access Key（`AKIA...`）
- AWS Secret Access Key
- Google API Key（`AIza...`）
- JWT Secret
- Generic API Key / Client Secret
- Hardcoded Password
- Database Connection String（jdbc、mysql、postgres、mongodb）
- Private Key（`-----BEGIN PRIVATE KEY-----`）
- Slack Token（`xox...`）

所有偵測結果均已遮罩（保留前後各 2–4 碼），明文不寫入任何輸出檔。

## 選項說明

```
lcp scan <projectPath> [options]

Options:
  -o, --output <dir>     輸出目錄（預設：./lcp-output）
  --format <formats>     輸出格式，逗號分隔（預設：json,markdown）
  --pack <types>         context pack 類型，逗號分隔或 "all"
                         可選：api-analysis, security-review, secret-exposure,
                               legacy-onboarding, endpoint-test
  --no-secrets           跳過 secret 掃描
  --no-report            不產出 report.html
  -h, --help             顯示說明
  -V, --version          顯示版本

lcp diff <oldDir> <newDir> [options]

Options:
  -o, --output <file>    差異報告輸出路徑（預設：./lcp-diff.md）
  -h, --help             顯示說明
```

## 重要限制

- **OpenAPI-lite 為近似結果**，動態路由、反射與 custom middleware 無法靜態推斷
- **WAR 檔無 source code 時**，僅能從 `web.xml` 推斷路由，標注 `confidence: low`
- **Secret 偵測必有誤報**，請搭配 confidence 欄位人工複審
- **第一版不含 AST 深度解析**，採規則式 regex 掃描

## 開發狀態

| Phase | 狀態 | 內容 |
|-------|------|------|
| Phase 1 | ✅ 完成 | 專案類型判斷、Java/C#/PHP route 掃描、WAR 解壓、web entry、secret scanner、JSON 匯出 |
| Phase 2 | ✅ 完成 | Import 依賴分析、openapi-lite 強化、5 種 context pack generator |
| Phase 3 | ✅ 完成 | 互動式 HTML 報告、搜尋篩選、Markdown 匯出、`lcp diff` 版本差異比較 |
