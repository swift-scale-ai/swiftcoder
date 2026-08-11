# SwiftCoder

[English](README.md) | 简体中文 | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

SwiftCoder 是一款由 [SwiftScale](https://swift-scale.com) 驱动的轻量级 macOS AI 编程智能体。它可以将自然语言任务转化为一套可控的本地工作流：理解代码仓库、规划任务、检查和编辑文件、运行命令、审查变更并验证结果。

SwiftCoder 由 Electron 桌面外壳、专注的 SolidJS 工作台以及基于 OpenCode 衍生的内置 TypeScript Agent Server 组成。桌面客户端坚持开放、可检查和本地优先；SwiftScale 则提供身份认证、账号权限、模型访问、请求路由和商业 AI 服务。

## 产品定位

SwiftCoder 是 SwiftScale 面向软件开发者的桌面入口，服务于已有代码仓库中的真实工程任务，而不是彼此孤立的一问一答。

SwiftCoder 是：

- 能够从代码仓库分析一路完成实现和验证的 AI Coding Agent；
- 面向 macOS、具有原生体验的项目工作台，统一管理项目、编程会话、独立聊天、代码差异、任务和终端活动；
- 零配置接入 SwiftScale 账号所拥有模型和算力的入口；
- 具有明确本地执行边界和权限控制的开源桌面客户端。

SwiftCoder 不试图替代完整 IDE，不会对用户隐藏自主操作，也不以成为通用聊天客户端为目标。编辑器和 IDE 仍然是精细编写代码的主要环境；SwiftCoder 专注于委派、执行和监督完整的工程任务。

## 产品原则

- **项目优先。** 项目及其会话是一等对象。SwiftCoder 从代码仓库及其真实状态出发，而不是从一个空白聊天框开始。
- **自主但可控。** 智能体可以连续完成多个步骤，但敏感的文件、Shell、网络和系统操作保持可见，并受权限策略约束。
- **默认本地。** 代码仓库访问、工具调用、命令执行、代码差异和会话状态均在本地处理；只有 AI 推理所必需的上下文会发送给 SwiftScale。
- **过程可审查。** 计划、工具调用、命令、文件变更、错误和验证结果都会呈现在可追踪的任务时间线中。
- **模型权限跟随账号。** 可用的产品模式和模型目录来自登录账号的 SwiftScale 权限，而不是客户端中的硬编码列表。
- **保持产品聚焦。** SwiftCoder 优先提供紧凑的编程工作流，而不是暴露每个供应商、模型参数或上游功能。

## 核心能力

- 管理本地项目和项目内的编程会话，并为独立聊天提供单独区域。
- 通过文件搜索、内容检查、项目指令、Git 状态和会话上下文理解代码仓库。
- 创建和修改多个文件、展示代码差异，并支持审查或回滚变更。
- 运行终端命令、流式展示输出、停止长时间运行的任务，并汇总类型检查、测试、构建和其他验证结果。
- 在专注的桌面工作台中展示计划、进度、工具活动、生成结果和可操作的错误状态。
- 通过 SwiftScale OAuth 登录，并将凭据安全存储在 macOS Keychain 中。
- 根据 Coding Plan、API Services 或组合账号权限调整产品模式和模型选项。模型可用性由 SwiftScale 控制面提供。
- 在本地设备上按照登录账号隔离项目和聊天历史。

## 产品愿景

打造全球最轻量、最优雅、最智能的 AI 编程助手。

SwiftCoder 希望为开发者提供一种全新的 AI 编程体验：

- **轻盈（Lightweight）**
- **简洁（Simple）**
- **稳定（Reliable）**
- **开源（Open Source）**
- **智能（Intelligent）**

SwiftCoder 不希望成为另一个功能越来越复杂的 IDE，而是成为开发者每天都会自然打开的 AI Coding Agent。

我们的目标是让强大的编程智能体真正适用于日常软件开发：容易上手，有能力完成有意义的工作，并且足够透明，可以放心用于真实代码仓库。

SwiftCoder 也是连接开源桌面智能体与 SwiftScale AI 平台的产品桥梁。随着产品演进，客户端将以一致的方式提供不断进步的模型、路由、算力和团队能力，而无需开发者围绕不同模型供应商反复重建工作流。衡量长期成功的标准不是智能体生成了多少文字，而是它能否可靠地帮助开发者将意图转化为经过审查和验证的代码。

## 工作原理

```text
开发者
   |
   v
SwiftCoder Desktop（项目、会话、时间线、代码差异、终端）
   |
   +--> 本地 Agent Server（上下文、工具、权限、持久化）
   |         |
   |         +--> 本地工作区 / Git / Shell
   |
   +--> SwiftScale（身份、权限、模型路由、推理）
```

## 环境要求

- macOS 13 或更高版本
- Bun 1.3.14
- Node.js 22.19 或更高版本
- Xcode Command Line Tools

## 开发

```bash
./tools/bootstrap.sh
./tools/check-phase0.sh
./tools/run-dev.sh
./tools/package-mac-dev.sh
```

为了保证本地构建可复现，这些工具也支持使用仓库内的 `.tools/bun`。

连接已部署的 SwiftScale 开发环境运行：

```bash
./tools/run-dev-cloud.sh
```

仅构建渲染器和内置 Agent Server，不启动 Electron：

```bash
SWIFTCODER_CHANNEL=prod bun run build
```

运行当前完整实现检查：

```bash
./tools/check-phase4.sh
```

## 开源发布检查

发布源码或桌面产物前，生成并验证第三方依赖许可证清单：

```bash
bun run licenses:generate
bun run check:open-source
bun run check:security
```

生成的二进制文件、依赖、本地状态、凭据、日志、测试输出和签名材料均已通过 `.gitignore` 排除。不要通过手工上传整个目录绕过这些规则；应从经过审查的 Git 索引发布。

对于已签名的 macOS 正式版本，`bun run release:preflight` 会先执行公开源码和依赖安全检查，再检查 Apple 签名凭据。

使用仓库外 `~/.config/swiftcoder/release.env` 中保存的凭据构建、签名、公证并验证生产版 macOS 应用：

```bash
./tools/package-mac-release.sh
```

构建使用生产环境配置、采用 ad-hoc 签名并跳过 Apple 公证的内部测试版本：

```bash
./tools/package-mac-release.sh prod --local-test
```

本地测试产物不能发布到公开更新渠道。

## 源码结构

- `packages/desktop`：Electron 主进程、Preload、打包配置和渲染器入口。
- `packages/app`：SolidJS 工作区界面。
- `packages/opencode`：从上游基线保留的内置 TypeScript Agent Server。
- `packages/core`、`packages/schema`、`packages/protocol`：共享的 Agent 领域模型和 API 契约。
- `packages/ui`、`packages/session-ui`：界面和 Agent 时间线组件。
- `tools`：SwiftCoder 开发、验证、打包和发布自动化工具。
- `script`：等待后续整合的上游仓库维护工具。
- `UPSTREAM_BASELINE.json`：准确记录上游来源和保留的软件包列表。

本仓库构建时不会读取 `../opencode`；该目录仅作为上游参考。

## 许可证与归属

SwiftCoder 源码根据根目录 `LICENSE` 中的 MIT License 发布。项目的重要部分衍生自 OpenCode，并在 `THIRD_PARTY_NOTICES.md` 和 `legal/OpenCode-LICENSE.txt` 中保留上游版权及 MIT License 声明。

依赖和资源许可证记录在：

- `THIRD_PARTY_NOTICES.md`
- `THIRD_PARTY_DEPENDENCIES.md`
- `legal/`
- `TRADEMARKS.md`

源码许可证不授予修改后发行版本使用 SwiftScale 或 SwiftCoder 商标的权利。

## 安全

请勿在公开 Issue 中报告疑似安全漏洞。请遵循 `SECURITY.md` 中的私密报告流程。

贡献与支持规范请参阅 `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md` 和 `SUPPORT.md`。
