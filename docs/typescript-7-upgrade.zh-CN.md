# TypeScript 7 升级说明

SwiftCoder 的 TypeScript 7 升级目前位于 `experiment/typescript-7` 实验分支。
在桌面客户端、Agent Runtime 和发布流程完成回归验证前，不直接合并到 `main`。

## 升级目标

- 让全部 workspace 使用稳定版 TypeScript 7 编译器执行类型检查。
- 移除旧的 `@typescript/native-preview` 依赖和 `tsgo` 命令。
- 为仍使用 JavaScript TypeScript Compiler API 的工具保留运行时兼容性。
- 同时验证 Electron 构建和原生依赖，不能只以类型检查通过作为完成标准。

## 编译器和配置变更

- 使用 `@typescript/native` 作为 `typescript@7.0.2` 的别名，其 `tsc` 是
  workspace 类型检查实际调用的 TypeScript 7 编译器。
- 暂时保留 `typescript@6.0.2`，作为仍导入 JavaScript Compiler API 的工具
  所需的运行时兼容依赖。
- 将各个 workspace 的 `tsgo` 类型检查命令统一替换为 `tsc`。
- 增加 `@types/bun`，并在使用 Bun 全局类型的 `tsconfig.json` 中显式配置
  `types: ["bun"]`。
- 桌面包改为使用 workspace 统一的 TypeScript 版本配置。
- 声明文件构建命令由旧的 `bunx tsc` 调整为 `bun x tsc`。
- 移除输入框中的零宽字符伪元素，修复打包后界面显示 `\200B` 的问题。

## 同步完成的依赖升级

| 依赖 | 原版本 | 升级版本 |
| --- | --- | --- |
| `@lydell/node-pty` 及 macOS 二进制包 | `1.2.0-beta.12` | `1.2.0-beta.15` |
| `@solid-primitives/active-element` | `2.1.3` | `2.1.6` |
| `@solid-primitives/bounds` | `0.1.3` | `0.1.7` |
| `@shikijs/transformers` | `3.9.2` | `4.4.2` |
| `chokidar` | `4.0.3` | `5.0.0` |
| `which` | `6.0.1` | `7.0.0` |
| `@actions/core` | `1.11.1` | `3.0.1` |
| `clipboardy` | `4.0.0` | `5.3.2` |
| `motion-utils` | `12.29.2` | `13.0.0` |

由于 `which@7` 要求 Node.js `22.22.2` 或更高版本，GitHub Actions 和项目
文档中的 Node.js 最低版本已同步更新为 `22.22.2`。

## 暂缓升级的依赖

`@ai-sdk/groq@4.0.26` 暂未升级。Groq 4 使用 AI SDK Provider v4 模型协议，
而 SwiftCoder 当前基于 `ai@6` 和 Provider v3。单独升级会产生
`LanguageModelV4` 与 `LanguageModelV3` 的协议冲突。

该依赖需要与 AI SDK 及其他 Provider 进行整体迁移，因此当前继续使用
`@ai-sdk/groq@3.0.31`，不能通过类型断言绕过协议不兼容问题。

## 已完成验证

- 20 个 workspace 包全部通过 TypeScript 类型检查；
- UI 单元测试 27 项通过；
- `which` 和 Groq Provider 定向测试 11 项通过；
- lint 为 0 errors；
- native PTY 创建进程冒烟测试通过；
- Electron 主进程、Preload 和 Renderer production build 通过；
- macOS ARM64 Dev 包构建、启动和进程检查通过。

文件监听测试在受限测试环境中无法初始化 macOS FSEvents。该问题属于测试
环境限制，仍需在 GitHub Actions 或不受限的本地环境中完成回归验证。

## 本地验证命令

```bash
bun install --frozen-lockfile
bun turbo typecheck --force
bun run lint
./tools/package-mac-dev.sh
```

合并到 `main` 前，还需要使用打包后的应用重点检查项目加载、会话创建、终端
命令、模型切换和 Provider 登录认证流程。
