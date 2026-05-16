# Legacy Context Packager

企業遺留系統的 LLM 前處理器。在將 Java、WAR、C#、PHP 專案交給 LLM 分析前，先離線抽取路由、頁面入口、敏感資訊與模組關聯，輸出高密度、低風險的 context pack。

## 操作方式

**CLI 為主，掃描完自動產出靜態 `report.html`，瀏覽器直接開啟即可。不需啟動 server，不需安裝額外工具。**

```bash
# 掃描資料夾
lcp scan ./my-java-project

# 掃描 WAR 檔
lcp scan ./app.war

# 指定輸出目錄
lcp scan ./my-project --output ./output
```

掃描完成後，`output/` 目錄會包含：

| 檔案 | 說明 |
|---|---|
| `report.html` | 可視化報告，瀏覽器開啟，含分頁瀏覽與搜尋 |
| `routes.json` | API path、method、handler 對應 |
| `web-entry.json` | 頁面入口、form action、JS API 呼叫 |
| `secrets-report.json` | 疑似敏感值（已遮罩），含信心分數 |
| `dependency-map.json` | 模組、route、config 依賴摘要 |
| `openapi-lite.json` | 靜態推導的 OpenAPI 雛形 |
| `context-pack.md` | 給 LLM 使用的精簡上下文包 |

## 支援專案類型

- Java（Spring MVC / Spring Boot / JAX-RS）
- WAR 檔（解壓後掃描 `WEB-INF/classes`、`web.xml`、JSP）
- C#（ASP.NET Core Controller routing）
- PHP（Laravel，含一般 PHP route / config 掃描）

## 核心價值

- **省 token**：只輸出結構化摘要，不送完整 source code
- **降風險**：Secret 先遮罩再輸出，避免敏感資訊外流
- **不依賴 LLM**：本地即可完成盤點，適合內網與資安敏感環境

## 開發狀態

目前為規劃階段，尚未有可執行版本。
