# Legacy Context Packager

企業遺留系統的 LLM 前處理器。在將 Java、WAR、C#、PHP 專案交給 LLM 分析前，先離線抽取路由、頁面入口、敏感資訊與模組關聯，輸出高密度、低風險的 context pack。

## 環境需求

| 環境 | 需求 |
|------|------|
| macOS / Linux | Node.js 18+ |
| Windows | Node.js 18+、Windows Terminal 或 PowerShell（TUI 需要 ANSI 支援，不相容舊版 cmd.exe） |

## 資料夾結構

```
lcp/
├── dist/                  # 編譯後的執行檔（npm run build 產生）
├── node_modules/          # 執行期依賴（production only 約 20 MB）
├── lcp-output/            # 所有匯出檔案統一存放此處（首次匯出自動建立）
│   ├── routes.json
│   ├── web-entry.json
│   ├── secrets-report.json
│   ├── dependency-map.json
│   ├── openapi-lite.json
│   ├── context-pack.md
│   ├── context-pack.json
│   └── report.html
├── src/                   # TypeScript 原始碼
├── package.json
├── lcp                    # macOS / Linux 啟動腳本
└── lcp.bat                # Windows 啟動腳本
```

> `lcp-output/` 固定位於 lcp 工具目錄下，與被掃描的目標專案無關。

## 部署

### macOS / Linux（開發環境）

```bash
git clone https://github.com/LinGaOscar/Legacy-Context-Packager.git
cd Legacy-Context-Packager
npm install
npm run build
chmod +x lcp
```

### 閉源 / 無網路環境

採整個資料夾搬移，不需在目標機執行 npm install。

**打包（在有網路的機器執行）：**

```bash
npm install --omit=dev   # 移除 devDependencies，node_modules 從 56 MB 縮至 ~20 MB
npm run build             # 編譯至 dist/

tar --exclude='node_modules/.cache' \
    -czf lcp-bundle.tar.gz \
    dist/ node_modules/ src/ package.json lcp lcp.bat
# 壓縮後約 8–10 MB
```

**目標機部署（Windows）：**

1. 確認 Node.js 18+ 已安裝（可提前下載 `.msi` 一併帶入）
2. 解壓 `lcp-bundle.tar.gz`
3. 執行 `lcp.bat`

**目標機部署（macOS / Linux）：**

```bash
tar -xzf lcp-bundle.tar.gz
chmod +x lcp
./lcp
```

## 使用方式

所有掃描操作均透過 TUI 互動介面進行。

### 啟動

```bash
./lcp        # macOS / Linux
lcp.bat      # Windows
```

### 掃描流程

啟動後依序引導三個步驟：

| 步驟 | 說明 |
|------|------|
| 1. 選擇掃描目標類型 | 專案目錄 / 單一檔案（`.war` `.java` `.cs` `.php`） |
| 2. 選擇輸入方式 | 瀏覽並選擇 / 直接輸入絕對路徑 |
| 3. 瀏覽模式 | ↑↓ 移動，Enter 進入目錄或選取，Backspace 返回上層 |

各步驟可按 **Esc** 返回上一步。

### 結果瀏覽

掃描完成後以分頁瀏覽結果：

| 按鍵 | 功能 |
|------|------|
| Tab | 切換分頁（Routes / Secrets / Entries / Dependencies / Export） |
| ↑↓ / j k | 在列表中移動 |
| Enter | 查看選取項目詳情 |
| Esc | 關閉詳情，返回列表 |
| s | 一鍵全部儲存（JSON + Markdown + HTML）至 `lcp-output/` |
| q | 離開 |

### 匯出檔案（Export 分頁）

切換至 **Export** 分頁，可選擇要輸出的檔案類型：

| 選項 | 產生的檔案 |
|------|-----------|
| JSON 報告（全部） | `routes.json` `web-entry.json` `secrets-report.json` `dependency-map.json` `openapi-lite.json` |
| Context Pack (MD) | `context-pack.md` |
| HTML 互動報告 | `report.html` |
| 全部輸出 | 以上所有檔案 |

↑↓ 選擇項目，Enter 執行輸出，完成後顯示確認訊息與路徑。

### 比較兩次掃描差異

```bash
./lcp diff ./old-output ./new-output
./lcp diff ./old-output ./new-output --output ./changes.md
```

差異報告列出新增／移除的 routes 與新偵測到或已消失的 secrets。

## 輸出檔案說明

所有匯出檔案統一寫入 lcp 工具目錄下的 `lcp-output/`：

| 檔案 | 說明 |
|------|------|
| `routes.json` | API path、HTTP method、handler 對應，含信心分數 |
| `web-entry.json` | 頁面入口、form action、fetch / axios / jQuery AJAX 呼叫 |
| `secrets-report.json` | 疑似敏感值（已遮罩），含嚴重度與信心分數 |
| `dependency-map.json` | 模組、route、config 依賴摘要與 import 關聯 |
| `openapi-lite.json` | 靜態推導的 OpenAPI 雛形（近似值，非完整 spec） |
| `context-pack.json` | 掃描摘要與統計數字（機器可讀） |
| `context-pack.md` | 整合摘要 + LLM 任務提示詞，直接貼給 AI 分析 |
| `report.html` | 互動式報告，含搜尋篩選、分頁瀏覽（瀏覽器直接開啟） |

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
lcp [ui] [projectPath]

Options:
  --no-secrets           跳過 secret 掃描（加快速度）
  -h, --help             顯示說明
  -V, --version          顯示版本

lcp diff <oldDir> <newDir>

Options:
  -o, --output <file>    差異報告輸出路徑（預設：./lcp-diff.md）
```

## 重要限制

- **OpenAPI-lite 為近似結果**，動態路由、反射與 custom middleware 無法靜態推斷
- **WAR 檔無 source code 時**，僅能從 `web.xml` 推斷路由，標注 `confidence: low`
- **Secret 偵測必有誤報**，請搭配 confidence 欄位人工複審
- **第一版不含 AST 深度解析**，採規則式 regex 掃描
