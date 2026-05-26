---
name: scaffold-vibecode-extension
description: 이 모노레포에 새 vibecode-* VSCode 확장을 스캐폴드한다. 정착된 apps/-패턴 + i18n + sync-스크립트 컨벤션을 따른다. 사용자가 새 확장을 만들고자 할 때 사용 (예- "vibecode-X 만들자", "scaffold a new extension"). 초기 스캐폴드, 컨벤션, 빌드/설치 워크플로우, 두 가지 주요 variant (command-based vs custom-editor) 를 모두 다룬다.
---

# vibecode-* VSCode 확장 스캐폴드

이 모노레포 경로: `/Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono/`
각 확장은 `vibecode-<kebab-case>` 이름의 루트 직속 폴더.

## 발동 조건
- 사용자가 "vibecode-X 만들자", "새 확장 만들자", "scaffold a new extension" 또는 유사한 표현 사용
- 항상 이 모노레포 안인지 먼저 확인 (git remote 또는 cwd 에 `vscode-extension-mono/` 포함 여부)

## 1단계 — Variant 결정

| Variant | 언제 쓰나 | 템플릿 확장 |
|---|---|---|
| **Command-based** (기본) | 우클릭 액션, 팔레트 명령 | `vibecode-right-click-sh-actions/` (가장 단순 — 앱 1개) |
| **Custom editor** | 파일 타입 인터셉트 (예- `.X` → 커스텀 뷰) | `vibecode-env-import-only/` |

애매하면 command-based 가 기본.

## 2단계 — 입력값 수집

사용자가 미리 안 줬으면 한 번에 묶어서 질문:
1. **폴더/패키지 이름** — `vibecode-` 로 시작 필수. 예- `vibecode-foo-actions`.
2. **한 줄짜리 영문 설명** — `package.json` 과 루트 README 용.
3. **명령 namespace** — 짧은 camelCase, 명령 ID 가 `<ns>.<appId>` 형태로 생성됨. 예- `rcaActions`, `vibecodeAgentInit`, `rcaShActions`.
4. **한국어 short-name** — 메뉴 라벨 프리픽스 `바이브코드 <short-name> - <행동>` 에 들어감. 예- `파일`, `Sh`, `에이전트`.
5. **첫 앱** (command-based 전용) — id, 영문 title, 한글 title, 메뉴 위치 (`explorer/context` / `editor/title` / `editor/context`), `when` clause, 선택적 icon (Codicon 이름).

## 3단계 — 템플릿에서 복사

템플릿 확장 (`vibecode-right-click-sh-actions/` 또는 `vibecode-env-import-only/`) 의 모든 파일을 읽어서 새 폴더에 쓰면서 다음 치환:

| 템플릿 | 치환할 값 |
|---|---|
| 경로 안의 폴더 이름 | 새 폴더 이름 |
| `package.json` 의 `name` (`vibecode-right-click-sh-actions` / `vibecode-env-import-only`) | 새 이름 |
| `rcaShActions` / `vibecodeEnvImport` (`src/apps/_types.ts` AND `scripts/sync-contributions.mjs` 의 COMMAND_PREFIX) | 새 namespace |
| `runShInTerminal` (템플릿의 첫 앱 id) | 첫 앱 id |
| `manifest.ts`, `handler.ts`, `scripts/nls-defaults.json` 의 모든 영문 문자열 | 새 컨텐츠 |
| `i18n/ko.json` 의 모든 한글 문자열 | 새 번역 |

## 4단계 — 빌드 + 검증

```bash
cd <새 폴더>
npm install --no-audit --no-fund --loglevel=error
npm run build                # sync → tsc
npm run typecheck            # 통과해야 함
npm run lint                 # 통과해야 함 (errors 만 — warnings 는 OK)
npm run sync:check           # "in sync" 보고해야 함
```

하나라도 실패하면 진행 전에 수정.

## 5단계 — 패키징 + 설치

```bash
find . -maxdepth 1 -name "*.vsix" -delete    # `rm -f *.vsix` 쓰지 마라 — zsh nomatch 에러
npx --yes @vscode/vsce@latest package \
  --no-dependencies --allow-missing-repository --skip-license \
  --baseContentUrl https://dalsoop.com
code --install-extension <이름>-0.1.0.vsix --force
```

사용자에게 **⌘R** (Developer: Reload Window) 눌러 새 확장 로드하라고 알릴 것.

## 6단계 — 루트 README 업데이트

`/Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono/README.md` 편집:
1. 확장 표에 행 추가: `| [이름](이름/) | <설명> |`.

---

## 컨벤션

### 명명 규칙
- 폴더/패키지: `vibecode-<kebab>`
- Publisher: `dalsoop`
- 초기 버전: `0.1.0`
- VSCode engine: `^1.95.0`
- 메뉴 라벨: `Vibecode <ShortName> - <Action>` / `바이브코드 <짧은이름> - <행동>`
  - 예- `Vibecode Files - Open in Default Browser`, `바이브코드 Sh - 터미널에서 .sh 실행`

### Command-based 구조
```
vibecode-X/
├── package.json                          # contributes 자동 생성
├── package.nls.json / package.nls.ko.json   # 자동 생성
├── i18n/ko.json                          # 원본 (ext + commands + runtime 블록)
├── l10n/bundle.l10n.ko.json              # 자동 생성 (runtime 블록에서)
├── scripts/
│   ├── sync-contributions.mjs            # src/apps/* + i18n/* → package.json + NLS
│   └── nls-defaults.json                 # 영문 ext.* 기본값
└── src/
    ├── extension.ts                      # 진입점 — apps 레지스트리를 돌며 command 등록
    └── apps/
        ├── _types.ts                     # AppManifest, AppModule, COMMAND_PREFIX
        ├── index.ts                      # 활성 apps 레지스트리
        └── <app-name>/
            ├── manifest.ts               # id, title, description, icon, menus[]
            ├── handler.ts                # (uri?, allUris?) => unknown
            └── index.ts                  # { manifest, handler } 묶음
```

### Custom-editor 구조
```
vibecode-X/
├── package.json                          # contributes.customEditors 를 직접 선언
├── package.nls.json / package.nls.ko.json
├── i18n/ko.json                          # nls + runtime 블록 (commands 없음)
├── l10n/bundle.l10n.ko.json
├── scripts/
│   ├── sync-nls.mjs                      # 간소 버전 — NLS 만
│   └── nls-defaults.json
└── src/
    ├── extension.ts                      # 커스텀 에디터 provider 등록
    ├── editor-provider.ts                # 슬림 — orchestration 만
    ├── handlers.ts                       # 메시지 핸들러
    ├── messages.ts                       # 프로토콜 인터페이스 (HostToWebview / WebviewToHost)
    ├── l10n-bundle.ts                    # L10nBundle 인터페이스 + getL10nBundle()
    ├── <domain-parser>.ts                # 예- env-parser.ts
    └── webview/
        ├── html.ts                       # buildHtml() + CSP/nonce
        ├── styles.ts                     # CSS 문자열 상수
        └── client-script.ts              # 클라이언트 JS 문자열 상수
```

### i18n 파이프라인
- **1언어 = 1파일**: `i18n/<locale>.json`
- **3블록**: `ext` (displayName/description/category), `commands` (앱 id 별), `runtime` (영문 → 번역 매핑)
- **자동 생성**: `package.nls.json`, `package.nls.<locale>.json`, `l10n/bundle.l10n.<locale>.json`
- **영문 원본**: `manifest.title` + `scripts/nls-defaults.json`
- **Custom editor 변형**: `ext`+`commands` 대신 `nls` 블록, 명령 생성 없음

### package.json scripts (표준)
```json
{
  "build": "npm run sync && tsc -p .",
  "watch": "tsc -p . -w",
  "sync": "node scripts/sync-contributions.mjs",
  "sync:check": "node scripts/sync-contributions.mjs --check",
  "typecheck": "tsc -p . --noEmit",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "vscode:prepublish": "npm run build",
  "package": "npx --yes @vscode/vsce@latest package --no-dependencies --allow-missing-repository --skip-license --baseContentUrl https://dalsoop.com"
}
```

### tsconfig.json (표준)
- `target: "ES2022"`, `module: "commonjs"`, `lib: ["ES2022"]`
- `strict: true` 단 `noUnusedLocals: false`, `noUnusedParameters: false`, `noImplicitAny: false`
- `rootDir: "src"`, `outDir: "dist"`

### .gitlab-ci.yml 게이트
- `format-check` (allow_failure)
- `eslint` (필수 통과)
- `typecheck` (필수 통과)
- `sync-check` (필수 통과 — `npm run sync:check`)
- `build` (필수 통과 — `vsce package` 를 `--baseContentUrl` 와 실행)

### Optional: Activity bar 사이드바
명령/우클릭 메뉴 외에 좌측 activity bar 진입점이 필요하면 추가:
- `package.json` 에 `contributes.viewsContainers.activitybar` + `contributes.views` 수동 선언 (sync 가 자동 생성하지 않음)
- `icons/<name>.svg` — monochrome SVG, `currentColor` 사용 (24x24)
- `src/sidebar.ts` — `TreeDataProvider` 구현 + `vscode.window.createTreeView()` 등록
- 액션은 `apps/-패턴` 그대로 — `manifest.menus[]` 에 `where: 'view/title'`, `when: 'view == <viewId>'`, `group: 'navigation@N'` 으로 추가 (`MenuLocation` 타입에 `view/title` 포함되어 있어야 함)
- 예시: `vibecode-agent-init-this-folder/` ([sidebar.ts](../../../vibecode-agent-init-this-folder/src/sidebar.ts), [add-template/](../../../vibecode-agent-init-this-folder/src/apps/add-template/))
- i18n: `ext.viewContainerTitle`, `ext.viewTemplates` 같은 키를 `i18n/<locale>.json` 의 `ext` 블록에 추가하면 sync 가 처리

---

## 함정 (직접 겪고 배운 것들)

| 증상 | 원인 | 해결 |
|---|---|---|
| `rm -f *.vsix` → `no matches found` | .vsix 가 없을 때 zsh `nomatch` 옵션 | `find . -maxdepth 1 -name "*.vsix" -delete` 사용 |
| `vsce package` → `Couldn't detect the repository where this extension is published. The link 'X' will be broken` | README.md 안의 상대 경로 링크 (sibling 폴더나 미번들 경로) | `--baseContentUrl https://dalsoop.com` 추가 |
| 재설치 후에도 옛 확장이 살아있음 | VSCode 실행 중에 uninstall → 폴더가 `~/.vscode/extensions/.obsolete` 에 큐잉되어 다음 재시작까지 삭제 안 됨 | 정리: `rm -rf ~/.vscode/extensions/<publisher>.<old-name>-<ver>` + `echo '{}' > ~/.vscode/extensions/.obsolete`. 이후 윈도우 reload. (파괴적 — 사용자에게 확인) |
| `vsce` 경고: "This activation event can be removed because VS Code automatically generates it" | `onCustomEditor:*` activationEvent 를 수동 선언 | 제거 — VSCode 가 `contributes.customEditors` 에서 자동 생성. `"activationEvents": []` 로 둘 것. |
| 메뉴 항목이 중복 표시 | 위 "옛 확장 살아있음" 과 동일 | 윈도우 reload 먼저; 그래도 중복이면 위 obsolete 정리 수행. |

---

## 스캐폴드 이후 (다음 단계 레시피)

### 기존 확장에 새 앱 추가 (command-based)
1. `mkdir src/apps/<새-앱>`
2. `manifest.ts` + `handler.ts` + `index.ts` 작성 (기존 앱에서 복사)
3. `src/apps/index.ts` 에 import + push 추가
4. `i18n/ko.json` 의 `commands` 블록에 한글 title 추가
5. `npm run build` (sync 가 package.json + NLS 재생성)
6. 패키징 + 설치 (5단계 참조)

### 새 로케일 추가
1. `i18n/<locale>.json` 을 ko.json 의 형태에 맞춰 생성 — ext + commands + runtime 번역
2. `npm run sync` 가 `package.nls.<locale>.json` + `l10n/bundle.l10n.<locale>.json` 재생성

### 기존 앱에 새 메뉴 위치 추가
해당 앱의 `manifest.ts` 의 `menus` 배열 편집. `npm run sync` 실행. 사용 가능 위치: `explorer/context`, `editor/context`, `editor/title` (타이틀 바 버튼은 `group: 'navigation@N'` 사용), `editor/title/context`.
