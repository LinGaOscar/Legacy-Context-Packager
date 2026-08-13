# Legacy Context Packager

企業遺留系統的 LLM 前處理器。在將 Java、WAR、C#、PHP、Node.js、Python 專案交給 LLM 分析前，先離線抽取路由、DB Entity、頁面入口、敏感資訊與模組關聯，輸出高密度、低風險的 context pack。

## 環境需求

| 環境 | 需求 |
|------|------|
| macOS / Linux | Node.js 18+ |
| Windows | Node.js 18+、Windows Terminal 或 PowerShell（TUI 需要 ANSI 支援，不相容舊版 cmd.exe） |

## 資料夾結構

```
lcp/
├── dist/                  # 編譯後的執行檔（npm run build 產生）
├── node_modules/          # 執行期依賴
├── lcp-output/            # 所有匯出檔案統一存放此處（首次匯出自動建立）
│   ├── context-pack.md
│   └── report.html
├── src/                   # TypeScript 原始碼
├── package.json
├── lcp                    # macOS / Linux 啟動腳本
└── lcp.bat                # Windows 啟動腳本
```

> `lcp-output/` 固定位於 lcp 工具目錄下，與被掃描的目標專案無關。

## 部署

### macOS / Linux

```bash
git clone https://github.com/LinGaOscar/Legacy-Context-Packager.git
npm install && npm run build && chmod +x lcp
```

### Windows

```powershell
git clone https://github.com/LinGaOscar/Legacy-Context-Packager.git
npm install
npm run build
```

之後直接執行 `lcp.bat`。

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
| q | 離開 |

### 匯出檔案（Export 分頁）

切換至 **Export** 分頁，選擇要輸出的檔案類型，Enter 執行：

| 選項 | 產生的檔案 |
|------|-----------|
| Context Pack (MD) | `context-pack.md` |
| HTML 互動報告 | `report.html` |
| 全部輸出 | `context-pack.md` + `report.html` |

## 輸出檔案說明

所有匯出檔案統一寫入 lcp 工具目錄下的 `lcp-output/`：

| 檔案 | 說明 |
|------|------|
| `context-pack.md` | ★ 主要輸出：系統盤點摘要 + LLM 任務提示詞，直接貼給 AI 分析 |
| `report.html` | 互動式報告，含搜尋篩選、分頁瀏覽（瀏覽器直接開啟） |

`context-pack.md` 包含：
- 系統摘要（語言、框架、路由數、DB Entity 數）
- **API Map**：依 Controller / Handler 分組的路由表
- **DB Map**：ORM Entity 欄位對應（JPA / EF Core / Eloquent / Django ORM / TypeORM）
- Web Entries（前端頁面入口與 API 呼叫）
- Secrets（已遮罩的疑似敏感值）

## 支援專案類型

| 語言 | 框架 | 掃描內容 |
|------|------|---------|
| Java | Spring Boot / Spring MVC | `@GetMapping`、`@PostMapping`、`@RequestMapping` 等 annotation |
| Java | JAX-RS | `@GET`、`@POST`、`@Path` 等 annotation |
| Java | WAR 檔 | 解壓後掃描 `web.xml` servlet mapping，有 source 時掃 annotation |
| C# | ASP.NET Core / MVC | `[HttpGet]`、`[HttpPost]`、`[Route]` 等 attribute |
| PHP | Laravel | `Route::get()`、`Route::post()` 等，支援 `Route::group` 巢狀前綴 |
| Node.js | Express | `app.get()`、`router.post()` 等，動態收集 Router 變數名 |
| Python | Flask | `@*.route()` decorator |
| Python | Django | `urlpatterns` 中的 `path()` / `re_path()` / `url()` |

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

若有誤報，可在目標專案根目錄放 `.lcp-allowlist.json` 過濾：

```json
[
  { "ruleId": "generic-password", "filePath": "src/test" }
]
```

## 選項說明

```
lcp [ui] [projectPath]

Options:
  --no-secrets           跳過 secret 掃描（加快速度）
  -h, --help             顯示說明
  -V, --version          顯示版本
```

## 開發

本機開發設定、執行方式與專案結構筆記見 [`dev.md`](./dev.md)；架構細節見 [`CLAUDE.md`](./CLAUDE.md)。

## 重要限制

- **動態路由、反射、custom middleware** 無法靜態推斷，不會出現在 API Map 中
- **DB Map 為近似結果**：純 convention-based EF 實體（無 `[Table]`/`[Column]`）、Django abstract/proxy model 無法偵測
- **WAR 檔無 source code 時**，僅能從 `web.xml` 推斷路由，標注 `confidence: low`
- **Secret 偵測必有誤報**，請搭配 confidence 欄位人工複審
- **第一版不含 AST 深度解析**，採規則式 regex 掃描
