# SwiftCoder

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | 한국어 | [Français](README.fr.md) | [Deutsch](README.de.md)

SwiftCoder는 [SwiftScale](https://swift-scale.com)이 제공하는 macOS용 경량 AI 코딩 에이전트입니다. 자연어 작업을 저장소 이해, 작업 계획, 파일 검사 및 편집, 명령 실행, 변경 검토, 결과 검증으로 이어지는 통제 가능한 로컬 워크플로로 전환합니다.

SwiftCoder는 Electron 데스크톱 셸, 집중도 높은 SolidJS 워크벤치, OpenCode에서 파생된 내장 TypeScript Agent Server로 구성됩니다. 데스크톱 클라이언트는 개방적이고 검토 가능하며 로컬 우선으로 설계되었습니다. SwiftScale은 인증, 계정 권한, 모델 접근, 라우팅 및 상용 AI 서비스를 제공합니다.

## 제품 포지셔닝

SwiftCoder는 소프트웨어 개발자를 위한 SwiftScale의 데스크톱 진입점입니다. 분리된 질의응답이 아니라 기존 저장소에서 수행하는 실제 엔지니어링 작업을 대상으로 합니다.

SwiftCoder는 다음을 제공합니다.

- 저장소 분석부터 구현과 검증까지 작업을 완수하는 AI Coding Agent
- 프로젝트, 코딩 세션, 독립 채팅, Diff, 작업 및 터미널 활동을 관리하는 macOS 네이티브 스타일 워크벤치
- SwiftScale 계정에서 사용할 수 있는 모델과 용량에 별도 설정 없이 접근하는 경로
- 로컬 실행과 권한 경계가 명확한 오픈 소스 데스크톱 클라이언트

SwiftCoder는 완전한 IDE를 대체하거나, 자율 작업을 사용자에게 숨기거나, 범용 채팅 클라이언트가 되는 것을 목표로 하지 않습니다. 세밀한 코드 작성에는 편집기와 IDE를 계속 사용하며, SwiftCoder는 완전한 엔지니어링 작업을 위임하고 실행하며 감독하는 데 집중합니다.

## 제품 원칙

- **프로젝트 우선.** 프로젝트와 그 세션을 일급 대상으로 다루며 빈 채팅창이 아니라 저장소와 실제 상태에서 시작합니다.
- **자율적이지만 통제 가능.** 에이전트는 여러 단계를 진행할 수 있지만 민감한 파일, Shell, 네트워크 및 시스템 작업은 표시되며 권한 정책을 따릅니다.
- **기본은 로컬.** 저장소 접근, 도구, 명령 실행, Diff 및 세션 상태는 로컬에서 처리하고 AI 추론에 필요한 컨텍스트만 SwiftScale로 전송합니다.
- **검토 가능한 작업.** 계획, 도구 호출, 명령, 파일 변경, 오류 및 검증 결과를 추적 가능한 작업 타임라인에 표시합니다.
- **계정 기반 모델 접근.** 제품 모드와 모델 카탈로그는 하드코딩된 목록이 아니라 로그인한 SwiftScale 계정의 권한에서 결정됩니다.
- **집중된 제품 범위.** 모든 공급자와 모델 매개변수를 노출하기보다 간결한 코딩 워크플로를 우선합니다.

## 주요 기능

- 로컬 프로젝트와 프로젝트별 코딩 세션을 관리하고 독립 채팅을 별도 영역에 구성합니다.
- 파일 검색, 콘텐츠 검사, 프로젝트 지침, Git 상태 및 세션 컨텍스트를 사용해 저장소를 이해합니다.
- 여러 파일을 생성하고 수정하며 Diff를 표시하고 변경 검토 또는 롤백을 지원합니다.
- 터미널 명령 실행, 출력 스트리밍, 장시간 작업 중단, 타입 검사·테스트·빌드 결과 요약을 지원합니다.
- 계획, 진행 상황, 도구 활동, 생성 결과와 조치 가능한 오류를 데스크톱 워크벤치에 표시합니다.
- SwiftScale OAuth로 로그인하고 자격 증명을 macOS Keychain에 안전하게 저장합니다.
- Coding Plan, API Services 또는 결합된 계정 권한에 따라 제품 모드와 모델 선택을 조정합니다. 모델 가용성은 SwiftScale 컨트롤 플레인에서 제공됩니다.
- 로컬 장치에서 프로젝트와 채팅 기록을 로그인 계정별로 격리합니다.

## 비전

세계에서 가장 가볍고 우아하며 지능적인 AI 코딩 도우미를 만드는 것.

SwiftCoder는 개발자에게 새로운 AI 코딩 경험을 제공합니다.

- **가벼움（Lightweight）**
- **단순함（Simple）**
- **안정성（Reliable）**
- **오픈 소스（Open Source）**
- **지능성（Intelligent）**

SwiftCoder는 기능이 계속 복잡해지는 또 하나의 IDE가 아니라 개발자가 매일 자연스럽게 실행하는 AI Coding Agent를 지향합니다.

강력한 코딩 에이전트를 일상적인 소프트웨어 개발에 실용적으로 만드는 것이 목표입니다. 쉽게 시작할 수 있고 의미 있는 작업을 완료할 만큼 강력하며 실제 저장소에서 신뢰할 수 있을 만큼 투명해야 합니다.

SwiftCoder는 개방형 데스크톱 에이전트와 SwiftScale AI 플랫폼을 연결하는 제품이기도 합니다. 모델, 라우팅, 용량 및 팀 기능이 발전해도 개발자가 공급자마다 워크플로를 다시 구축할 필요 없는 일관된 접근 방식을 제공합니다. 성공의 기준은 생성한 텍스트의 양이 아니라 개발자의 의도를 검토되고 검증된 코드로 얼마나 안정적으로 전환하는가입니다.

## 작동 방식

```text
개발자
   |
   v
SwiftCoder Desktop (프로젝트, 세션, 타임라인, Diff, 터미널)
   |
   +--> Local Agent Server (컨텍스트, 도구, 권한, 영속성)
   |         |
   |         +--> 로컬 워크스페이스 / Git / Shell
   |
   +--> SwiftScale (인증, 권한, 모델 라우팅, 추론)
```

## 요구 사항

- macOS 13 이상
- Bun 1.3.14
- Node.js 22.22.2 이상
- Xcode Command Line Tools

## 개발

```bash
./tools/bootstrap.sh
./tools/check-phase0.sh
./tools/run-dev.sh
./tools/package-mac-dev.sh
```

재현 가능한 로컬 빌드를 위해 도구는 저장소 내부의 `.tools/bun`도 인식합니다.

배포된 SwiftScale 개발 환경에 연결하여 실행하려면:

```bash
./tools/run-dev-cloud.sh
```

Electron을 시작하지 않고 렌더러와 내장 Agent Server만 빌드하려면:

```bash
SWIFTCODER_CHANNEL=prod bun run build
```

현재 구현에 대한 전체 검사를 실행하려면:

```bash
./tools/check-phase4.sh
```

## 오픈 소스 릴리스 검사

소스 또는 데스크톱 결과물을 공개하기 전에 의존성 라이선스 목록을 생성하고 검증합니다.

```bash
bun run licenses:generate
bun run check:open-source
bun run check:security
```

생성된 바이너리, 의존성, 로컬 상태, 자격 증명, 로그, 테스트 출력 및 서명 자료는 `.gitignore`에서 제외됩니다. 디렉터리를 수동으로 업로드하지 말고 검토된 Git 인덱스에서 게시하십시오.

서명된 macOS 릴리스의 경우 `bun run release:preflight`가 공개 소스와 의존성 보안 검사를 실행한 후 Apple 서명 자격 증명을 확인합니다.

저장소 외부의 `~/.config/swiftcoder/release.env`에 저장된 자격 증명으로 프로덕션 macOS 앱을 빌드, 서명, 공증 및 검증합니다.

```bash
./tools/package-mac-release.sh
```

프로덕션 설정을 사용하고 ad-hoc 서명으로 Apple 공증을 건너뛴 내부 테스트 빌드:

```bash
./tools/package-mac-release.sh prod --local-test
```

로컬 테스트 결과물은 공개 업데이트 채널에 배포할 수 없습니다.

## 소스 구조

- `packages/desktop`: Electron 메인 프로세스, Preload, 패키징 및 렌더러 진입점
- `packages/app`: SolidJS 워크스페이스 UI
- `packages/opencode`: 업스트림 기준에서 유지한 내장 TypeScript Agent Server
- `packages/core`, `packages/schema`, `packages/protocol`: 공유 Agent 도메인과 API 계약
- `packages/ui`, `packages/session-ui`: UI 및 Agent 타임라인 컴포넌트
- `tools`: 개발, 검증, 패키징 및 릴리스 자동화
- `script`: 향후 통합할 업스트림 저장소 유지관리 도구
- `UPSTREAM_BASELINE.json`: 정확한 업스트림 출처와 유지 패키지 목록

## 라이선스 및 귀속

SwiftCoder 소스는 루트 `LICENSE`의 MIT License로 공개됩니다. 주요 부분은 OpenCode에서 파생되었으며 업스트림 저작권과 MIT 고지를 `THIRD_PARTY_NOTICES.md` 및 `legal/OpenCode-LICENSE.txt`에 유지합니다.

의존성과 에셋 라이선스:

- `THIRD_PARTY_NOTICES.md`
- `THIRD_PARTY_DEPENDENCIES.md`
- `legal/`
- `TRADEMARKS.md`

소스 라이선스는 수정 배포판에서 SwiftScale 또는 SwiftCoder 상표를 사용할 권리를 부여하지 않습니다.

## 보안

의심되는 취약점을 공개 Issue에 보고하지 마십시오. `SECURITY.md`의 비공개 보고 절차를 따르십시오.

기여 및 지원 정책은 `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`에 설명되어 있습니다.
