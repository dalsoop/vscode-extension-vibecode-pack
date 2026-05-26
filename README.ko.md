# Vibecode

[English](README.md)

VSCode 안에서 반복 작업을 줄이는 개발자 생산성 확장 모음입니다. AI 도구 셋업, HTML 프리뷰, 보안 `.env` 편집, 커밋 검사, 파일 액션, MCP 목록 확인까지 자주 쓰는 흐름을 우클릭과 사이드바로 정리합니다.

## 왜 Vibecode인가

개발자는 하루에도 수십 번 같은 동작을 반복합니다. 폴더를 열고, 경로를 복사하고, 셸 스크립트를 실행하고, HTML 결과를 확인하고, `.env` 값을 숨기고, 커밋 메시지를 검사하고, AI 에이전트 지침 파일을 맞춥니다.

Vibecode는 이런 작은 작업들을 VSCode 안에서 끝내도록 만든 확장 묶음입니다. 하나의 거대한 앱이 아니라, 필요한 기능을 확장 단위로 설치해 조합하는 방식입니다.

## 대표 화면

각 확장 폴더에는 판매용 썸네일과 상품 설명 문서가 들어 있습니다.

```text
vibecode-*/selling-thumbnail.png
vibecode-*/product_v2.md
```

## 핵심 기능

### AI 셋업 자동화

새 프로젝트 폴더에 Claude, Codex, Cursor, Gemini 같은 AI 코딩 도구용 지침 파일을 템플릿으로 설치합니다.

- 템플릿 선택
- 도구 선택
- 설치할 폴더 선택
- `.claude/`, `AGENTS.md`, `.cursorrules`, `.gemini/`, `.codex/` 생성

[상품 설명](vibecode-ai-md-system-init-this-folder/product_v2.md)

![AI MD System](vibecode-ai-md-system-init-this-folder/selling-thumbnail.png)

### HTML 라이브 프리뷰

HTML 파일을 더블클릭하면 VSCode 안에서 바로 프리뷰가 열립니다. 저장하면 자동으로 새로고침됩니다.

- 로컬 HTTP 서버 자동 실행
- 워크스페이스 저장 감지
- 원본 편집과 외부 브라우저 열기
- Pro 버전은 인스펙터, 메모, 스냅샷 저장 지원

[기본 프리뷰 설명](vibecode-browser-preview/product_v2.md)  
[Pro 프리뷰 설명](vibecode-browser-preview-pro/product_v2.md)

![Browser Preview](vibecode-browser-preview/selling-thumbnail.png)

### 보안 `.env` 편집

`.env` 키는 보여주되 값은 화면에 표시하지 않습니다. 암호화 버전은 디스크에도 암호문만 저장합니다.

- 붙여넣기 전용 입력
- 값 길이도 노출하지 않는 마스킹
- `.env.example`과 스키마 비교
- dotenvx 호환 암호화 저장

[Import-Only 설명](vibecode-env-viewer-normal-import-only/product_v2.md)  
[Encrypted 설명](vibecode-env-viewer-encryption-import-only/product_v2.md)

![Env Viewer](vibecode-env-viewer-normal-import-only/selling-thumbnail.png)

### 커밋과 코드베이스 점검

커밋 메시지를 검사하고, 라인 수가 큰 파일을 찾아 리팩토링 후보를 확인합니다.

- Conventional Commits 검사
- Node, PHP/Laravel, Python 템플릿
- 마지막 커밋 즉시 검사
- 파일 라인 수 랭킹

[Commit Lint 설명](vibecode-commit-lint-check/product_v2.md)  
[File Lines 설명](vibecode-show-file-lines/product_v2.md)

![Commit Lint](vibecode-commit-lint-check/selling-thumbnail.png)

### 우클릭 생산성 액션

파일과 폴더에서 자주 쓰는 액션을 VSCode 컨텍스트 메뉴에 추가합니다.

- 브라우저로 열기
- Finder 또는 Explorer에서 보기
- 절대 경로 복사
- 여기서 터미널 열기
- `.sh` 스크립트 실행
- VSCode 확장 폴더를 `.vsix`로 패키징하고 설치

[파일 액션 설명](vibecode-right-click-action-open-to-file/product_v2.md)  
[셸 액션 설명](vibecode-right-click-sh-actions/product_v2.md)  
[VSIX 패키지 설명](vibecode-right-click-vscode-extension-vsix-packege-and-install/product_v2.md)

![Right Click Actions](vibecode-right-click-action-open-to-file/selling-thumbnail.png)

### 확장, 스킬, MCP 통합 보기

흩어진 Vibecode 명령, AI 스킬, MCP 서버 설정을 한곳에서 봅니다.

- 설치된 `vibecode-*` 확장 명령 카드
- Claude, Codex, Cursor, Windsurf, Cline 스킬 통합 탐색
- instruction file 동기화
- User, Workspace, Extension 출처별 MCP 서버 목록

[Extension Menu 설명](vibecode-extension-menu-list/product_v2.md)  
[Skills Viewer 설명](vibecode-skills-viewer/product_v2.md)  
[MCP List 설명](vibecode-vscode-extension-host-mcp-list/product_v2.md)

![Skills Viewer](vibecode-skills-viewer/selling-thumbnail.png)

## 확장 목록

| 확장 | 목적 |
|---|---|
| [vibecode-ai-md-system-init-this-folder](vibecode-ai-md-system-init-this-folder/) | AI 도구 지침 파일 템플릿 설치 |
| [vibecode-browser-preview](vibecode-browser-preview/) | HTML 라이브 프리뷰 |
| [vibecode-browser-preview-pro](vibecode-browser-preview-pro/) | 인스펙터와 스냅샷이 있는 Pro 프리뷰 |
| [vibecode-env-viewer-normal-import-only](vibecode-env-viewer-normal-import-only/) | 값 노출 없는 `.env` 편집 |
| [vibecode-env-viewer-encryption-import-only](vibecode-env-viewer-encryption-import-only/) | 암호화 저장을 지원하는 `.env` 편집 |
| [vibecode-commit-lint-check](vibecode-commit-lint-check/) | 커밋 메시지 검사와 템플릿 스캐폴드 |
| [vibecode-file-lint-check](vibecode-file-lint-check/) | 사이드바에서 ESLint·Prettier·TS·JSON 파일 품질 체크 실행 |
| [vibecode-show-file-lines](vibecode-show-file-lines/) | 라인 수 기준 리팩토링 후보 탐색 |
| [vibecode-right-click-action-open-to-file](vibecode-right-click-action-open-to-file/) | 파일과 폴더 우클릭 액션 |
| [vibecode-right-click-sh-actions](vibecode-right-click-sh-actions/) | `.sh` 스크립트 실행 액션 |
| [vibecode-right-click-vscode-extension-vsix-packege-and-install](vibecode-right-click-vscode-extension-vsix-packege-and-install/) | VSIX 패키징과 설치 |
| [vibecode-extension-menu-list](vibecode-extension-menu-list/) | Vibecode 명령 런처 |
| [vibecode-skills-viewer](vibecode-skills-viewer/) | AI 에이전트 스킬 통합 뷰어 |
| [vibecode-vscode-extension-host-mcp-list](vibecode-vscode-extension-host-mcp-list/) | VSCode MCP 서버 목록 |
| [vibecode-md-file-browser](vibecode-md-file-browser/) | Explorer 사이드 Markdown 트리 + 미리보기·원본 열기 |
| [vibecode-image-viewer](vibecode-image-viewer/) | 이미지 커스텀 에디터 + EXIF 메타데이터 + 카메라 요약 + GPS→구글맵 |
| [packages/vibecode-core](packages/vibecode-core/) | `.env` 암호화 전략 공용 코어 |

## 개발과 패키징

각 확장은 독립적인 VSCode extension 폴더입니다.

```bash
cd <extension>
npm install
npm run build
npm run package
```

로컬 설치:

```bash
code --install-extension <extension>-<version>.vsix --force
```

## 상품 자료

각 확장 폴더의 `product_v2.md`는 판매용 메시지와 썸네일 제작 지시를 담고 있습니다. `selling-thumbnail.png`는 마켓플레이스, 소개 페이지, 릴리즈 노트에 사용할 수 있는 래스터 썸네일입니다.

