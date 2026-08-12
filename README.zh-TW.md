# SwiftCoder

[English](README.md) | [简体中文](README.zh-CN.md) | 繁體中文 | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

SwiftCoder 是一款由 [SwiftScale](https://swift-scale.com) 驅動的輕量級 macOS AI 程式設計代理。它能將自然語言任務轉化為可控的本機工作流程：理解程式碼儲存庫、規劃工作、檢查與編輯檔案、執行命令、審查變更並驗證結果。

SwiftCoder 由 Electron 桌面外殼、專注的 SolidJS 工作台，以及衍生自 OpenCode 的內建 TypeScript Agent Server 組成。桌面用戶端堅持開放、可檢查與本機優先；SwiftScale 則提供身分驗證、帳號權限、模型存取、請求路由及商業 AI 服務。

## 產品定位

SwiftCoder 是 SwiftScale 面向軟體開發者的桌面入口，服務於既有程式碼儲存庫中的真實工程工作，而非彼此孤立的一問一答。

SwiftCoder 是：

- 能從儲存庫分析一路完成實作與驗證的 AI Coding Agent；
- 具備原生 macOS 體驗的專案工作台，統一管理專案、程式設計工作階段、獨立聊天、程式碼差異、任務與終端活動；
- 零設定使用 SwiftScale 帳號所擁有模型與運算資源的入口；
- 具有明確本機執行邊界與權限控制的開源桌面用戶端。

SwiftCoder 不試圖取代完整 IDE，不會向使用者隱藏自主操作，也不以成為通用聊天用戶端為目標。編輯器和 IDE 仍是精細撰寫程式碼的主要環境；SwiftCoder 專注於委派、執行及監督完整的工程工作。

## 產品原則

- **專案優先。** 專案及其工作階段是一等物件。SwiftCoder 從儲存庫及其真實狀態出發，而不是從空白聊天框開始。
- **自主但可控。** 代理可以連續完成多個步驟，但敏感的檔案、Shell、網路和系統操作保持可見，並受權限策略約束。
- **預設本機。** 儲存庫存取、工具呼叫、命令執行、程式碼差異與工作階段狀態都在本機處理；只有 AI 推論所需的內容會傳送到 SwiftScale。
- **工作可審查。** 計畫、工具呼叫、命令、檔案變更、錯誤與驗證結果都呈現在可追蹤的任務時間線中。
- **模型權限跟隨帳號。** 可用產品模式與模型目錄來自登入帳號的 SwiftScale 權限，而非用戶端硬編碼清單。
- **保持產品聚焦。** SwiftCoder 優先提供精簡的程式設計工作流程，而不是暴露每個供應商、模型參數或上游功能。

## 核心能力

- 管理本機專案與專案內工作階段，並為獨立聊天提供單獨區域。
- 透過檔案搜尋、內容檢查、專案指令、Git 狀態和工作階段內容理解儲存庫。
- 建立及修改多個檔案、顯示程式碼差異，並支援審查或回復變更。
- 執行終端命令、串流輸出、停止長時間工作，並彙整型別檢查、測試、建置和其他驗證結果。
- 在專注的桌面工作台中顯示計畫、進度、工具活動、產出及可操作的錯誤狀態。
- 透過 SwiftScale OAuth 登入，並將憑證安全儲存在 macOS Keychain。
- 依 Coding Plan、API Services 或組合帳號權限調整產品模式與模型選項；模型可用性由 SwiftScale 控制平面提供。
- 在本機裝置上依登入帳號隔離專案與聊天記錄。

## 產品願景

打造全球最輕量、最優雅、最智慧的 AI 程式設計助手。

SwiftCoder 希望為開發者提供全新的 AI 程式設計體驗：

- **輕盈（Lightweight）**
- **簡潔（Simple）**
- **穩定（Reliable）**
- **開源（Open Source）**
- **智慧（Intelligent）**

SwiftCoder 不希望成為另一個功能日益複雜的 IDE，而是成為開發者每天都會自然開啟的 AI Coding Agent。

我們的目標是讓強大的程式設計代理真正適用於日常軟體開發：容易開始、有能力完成有意義的工作，並且足夠透明，能安心用於真實儲存庫。

SwiftCoder 也是連接開源桌面代理與 SwiftScale AI 平台的產品橋梁。隨著產品演進，用戶端將以一致方式提供持續進步的模型、路由、運算資源和團隊能力，無需開發者圍繞不同模型供應商反覆重建工作流程。長期成功的標準不是代理產生多少文字，而是它能否可靠地協助開發者將意圖轉化為經過審查及驗證的程式碼。

## 運作方式

```text
開發者
   |
   v
SwiftCoder Desktop（專案、工作階段、時間線、程式碼差異、終端）
   |
   +--> 本機 Agent Server（內容、工具、權限、持久化）
   |         |
   |         +--> 本機工作區 / Git / Shell
   |
   +--> SwiftScale（身分、權限、模型路由、推論）
```

## 環境需求

- macOS 13 或更新版本
- Bun 1.3.14
- Node.js 22.22.2 或更新版本
- Xcode Command Line Tools

## 開發

```bash
./tools/bootstrap.sh
./tools/check-phase0.sh
./tools/run-dev.sh
./tools/package-mac-dev.sh
```

為確保本機建置可重現，這些工具也支援儲存庫內的 `.tools/bun`。

連接已部署的 SwiftScale 開發環境執行：

```bash
./tools/run-dev-cloud.sh
```

只建置渲染器和內建 Agent Server，不啟動 Electron：

```bash
SWIFTCODER_CHANNEL=prod bun run build
```

執行目前完整實作檢查：

```bash
./tools/check-phase4.sh
```

## 開源發布檢查

發布原始碼或桌面產物前，產生並驗證第三方相依套件授權清單：

```bash
bun run licenses:generate
bun run check:open-source
bun run check:security
```

產生的二進位檔、相依套件、本機狀態、憑證、日誌、測試輸出和簽署材料都已由 `.gitignore` 排除。請勿手動上傳整個目錄來繞過規則；應從經過審查的 Git 索引發布。

對於已簽署的 macOS 正式版本，`bun run release:preflight` 會先執行公開原始碼及相依套件安全檢查，再檢查 Apple 簽署憑證。

使用儲存庫外 `~/.config/swiftcoder/release.env` 中的憑證建置、簽署、公證並驗證正式版 macOS 應用程式：

```bash
./tools/package-mac-release.sh
```

建置使用正式環境設定、採用 ad-hoc 簽署並略過 Apple 公證的內部測試版本：

```bash
./tools/package-mac-release.sh prod --local-test
```

本機測試產物不得發布到公開更新管道。

## 原始碼結構

- `packages/desktop`：Electron 主程序、Preload、打包設定及渲染器入口。
- `packages/app`：SolidJS 工作區介面。
- `packages/opencode`：從上游基線保留的內建 TypeScript Agent Server。
- `packages/core`、`packages/schema`、`packages/protocol`：共享 Agent 領域模型與 API 契約。
- `packages/ui`、`packages/session-ui`：介面和 Agent 時間線元件。
- `tools`：SwiftCoder 開發、驗證、打包和發布自動化工具。
- `script`：等待後續整合的上游儲存庫維護工具。
- `UPSTREAM_BASELINE.json`：準確記錄上游來源與保留套件清單。

## 授權與歸屬

SwiftCoder 原始碼依根目錄 `LICENSE` 中的 MIT License 發布。專案的重要部分衍生自 OpenCode，並在 `THIRD_PARTY_NOTICES.md` 和 `legal/OpenCode-LICENSE.txt` 中保留上游著作權及 MIT License 聲明。

相依套件和資源授權記錄於：

- `THIRD_PARTY_NOTICES.md`
- `THIRD_PARTY_DEPENDENCIES.md`
- `legal/`
- `TRADEMARKS.md`

原始碼授權不授予修改後發行版本使用 SwiftScale 或 SwiftCoder 商標的權利。

## 安全性

請勿在公開 Issue 中回報疑似安全漏洞。請遵循 `SECURITY.md` 中的私密回報流程。

貢獻與支援規範請參閱 `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md` 和 `SUPPORT.md`。
