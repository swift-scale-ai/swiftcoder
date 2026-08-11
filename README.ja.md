# SwiftCoder

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | 日本語 | [한국어](README.ko.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

SwiftCoder は [SwiftScale](https://swift-scale.com) を搭載した、macOS 向けの軽量 AI コーディングエージェントです。自然言語による依頼を、リポジトリの理解、作業計画、ファイルの調査と編集、コマンド実行、変更レビュー、結果検証からなる制御可能なローカルワークフローへ変換します。

SwiftCoder は Electron デスクトップシェル、作業に集中できる SolidJS ワークベンチ、OpenCode から派生した組み込み TypeScript Agent Server で構成されています。デスクトップクライアントはオープンで検証可能なローカルファースト設計です。SwiftScale は認証、アカウント権限、モデルアクセス、ルーティング、商用 AI サービスを提供します。

## 製品の位置付け

SwiftCoder はソフトウェア開発者向けの SwiftScale デスクトップエントリーポイントです。単発の質問と回答ではなく、既存リポジトリでの実際の開発作業を対象とします。

SwiftCoder は次のものです。

- リポジトリ分析から実装、検証までタスクを完遂できる AI Coding Agent
- プロジェクト、コーディングセッション、独立チャット、差分、タスク、ターミナル操作を管理する macOS ネイティブ感のあるワークベンチ
- SwiftScale アカウントで利用可能なモデルと容量へ、設定なしでアクセスするための入口
- ローカル実行と権限の境界が明確なオープンソースのデスクトップクライアント

SwiftCoder は完全な IDE の置き換え、自律操作の隠蔽、汎用チャットクライアント化を目的としていません。細かなコード編集には引き続きエディターや IDE を利用し、SwiftCoder は一連の開発タスクの委任、実行、監督に集中します。

## 製品原則

- **プロジェクト中心。** プロジェクトとそのセッションを第一級の対象として扱い、空のチャット欄ではなく、リポジトリと実際の状態から開始します。
- **自律的かつ制御可能。** エージェントは複数の手順を進められますが、機密性のあるファイル、Shell、ネットワーク、システム操作は可視化され、権限ポリシーに従います。
- **ローカルが標準。** リポジトリアクセス、ツール、コマンド実行、差分、セッション状態はローカルで処理し、AI 推論に必要なコンテキストだけを SwiftScale に送信します。
- **レビュー可能。** 計画、ツール呼び出し、コマンド、ファイル変更、エラー、検証結果を追跡可能なタイムラインに表示します。
- **アカウントに応じたモデル。** 製品モードとモデル一覧は、クライアント内の固定リストではなく、ログイン中の SwiftScale 権限から取得します。
- **機能を絞った製品設計。** あらゆるプロバイダーやパラメーターを公開するのではなく、簡潔なコーディングワークフローを優先します。

## 主な機能

- ローカルプロジェクトとプロジェクト単位のコーディングセッションを管理し、独立チャットを別領域に整理します。
- ファイル検索、内容調査、プロジェクト指示、Git 状態、セッションコンテキストを使ってリポジトリを理解します。
- 複数ファイルを作成・編集し、差分を表示して変更のレビューやロールバックを支援します。
- ターミナルコマンドの実行、出力のストリーミング、長時間処理の停止、型チェック・テスト・ビルド結果の要約を行います。
- 計画、進捗、ツール操作、生成物、対処可能なエラーをデスクトップワークベンチに表示します。
- SwiftScale OAuth でログインし、認証情報を macOS Keychain に保存します。
- Coding Plan、API Services、または両方の権限に応じて製品モードとモデルを調整します。利用可能なモデルは SwiftScale コントロールプレーンから提供されます。
- ローカル端末上のプロジェクトとチャット履歴をログインアカウントごとに分離します。

## ビジョン

世界で最も軽量で、洗練され、インテリジェントな AI コーディングアシスタントをつくること。

SwiftCoder は開発者に新しい AI コーディング体験を提供します。

- **軽量（Lightweight）**
- **シンプル（Simple）**
- **安定（Reliable）**
- **オープンソース（Open Source）**
- **インテリジェント（Intelligent）**

SwiftCoder は機能が増え続ける別の IDE ではなく、開発者が毎日自然に起動する AI Coding Agent を目指します。

高性能なコーディングエージェントを日常のソフトウェア開発で実用的なものにすることが目標です。すぐに始められ、意味のある作業を完了でき、実際のリポジトリで信頼して使える透明性を備えます。

SwiftCoder はオープンなデスクトップエージェントと SwiftScale AI プラットフォームをつなぐ製品でもあります。モデル、ルーティング、容量、チーム機能が進化しても、開発者がベンダーごとにワークフローを作り直す必要のない一貫した入口を提供します。成功の尺度は生成した文章量ではなく、意図をレビュー済み・検証済みのコードへどれだけ確実に変換できるかです。

## 動作の仕組み

```text
開発者
   |
   v
SwiftCoder Desktop（プロジェクト、セッション、タイムライン、差分、ターミナル）
   |
   +--> Local Agent Server（コンテキスト、ツール、権限、永続化）
   |         |
   |         +--> ローカルワークスペース / Git / Shell
   |
   +--> SwiftScale（認証、権限、モデルルーティング、推論）
```

## 必要環境

- macOS 13 以降
- Bun 1.3.14
- Node.js 22.19 以降
- Xcode Command Line Tools

## 開発

```bash
./tools/bootstrap.sh
./tools/check-phase0.sh
./tools/run-dev.sh
./tools/package-mac-dev.sh
```

再現可能なローカルビルドのため、各ツールはリポジトリ内の `.tools/bun` も認識します。

デプロイ済みの SwiftScale 開発環境に接続して実行する場合：

```bash
./tools/run-dev-cloud.sh
```

Electron を起動せず、レンダラーと組み込み Agent Server だけをビルドする場合：

```bash
SWIFTCODER_CHANNEL=prod bun run build
```

現在の実装に対する完全なチェックを実行する場合：

```bash
./tools/check-phase4.sh
```

## オープンソース公開チェック

ソースまたはデスクトップ成果物を公開する前に、依存ライセンス一覧を生成して検証します。

```bash
bun run licenses:generate
bun run check:open-source
bun run check:security
```

生成バイナリ、依存関係、ローカル状態、認証情報、ログ、テスト出力、署名資料は `.gitignore` で除外されています。ディレクトリを手動アップロードせず、レビューした Git インデックスから公開してください。

署名付き macOS リリースでは、`bun run release:preflight` が公開ソースと依存関係のセキュリティチェックを実行してから Apple 署名情報を確認します。

リポジトリ外の `~/.config/swiftcoder/release.env` に保存した認証情報を使用して、本番 macOS アプリをビルド、署名、公証、検証します。

```bash
./tools/package-mac-release.sh
```

本番設定を使用し、ad-hoc 署名で Apple 公証を省略した社内テスト版を作成する場合：

```bash
./tools/package-mac-release.sh prod --local-test
```

ローカルテスト成果物を公開更新チャネルへ配置することはできません。

## ソース構成

- `packages/desktop`：Electron メインプロセス、Preload、パッケージング、レンダラー入口
- `packages/app`：SolidJS ワークスペース UI
- `packages/opencode`：上流ベースラインから維持した組み込み TypeScript Agent Server
- `packages/core`、`packages/schema`、`packages/protocol`：共有 Agent ドメインと API 契約
- `packages/ui`、`packages/session-ui`：UI と Agent タイムラインコンポーネント
- `tools`：開発、検証、パッケージング、リリース自動化
- `script`：今後統合予定の上流リポジトリ保守ユーティリティ
- `UPSTREAM_BASELINE.json`：正確な上流由来と維持パッケージ一覧

ビルド時に `../opencode` を読み込むことはありません。このディレクトリは上流参照専用です。

## ライセンスと帰属

SwiftCoder のソースはルート `LICENSE` の MIT License で公開されます。重要な部分は OpenCode から派生しており、上流の著作権と MIT 表示を `THIRD_PARTY_NOTICES.md` および `legal/OpenCode-LICENSE.txt` に保持しています。

依存関係とアセットのライセンス：

- `THIRD_PARTY_NOTICES.md`
- `THIRD_PARTY_DEPENDENCIES.md`
- `legal/`
- `TRADEMARKS.md`

ソースライセンスは、変更版の配布に SwiftScale または SwiftCoder の商標を使用する権利を付与しません。

## セキュリティ

疑わしい脆弱性を公開 Issue で報告しないでください。`SECURITY.md` の非公開報告手順に従ってください。

コントリビューションとサポートの方針は `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`SUPPORT.md` に記載されています。
