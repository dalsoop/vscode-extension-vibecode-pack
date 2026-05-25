# right-click-action-open-to-file

파일/폴더 우클릭 컨텍스트 메뉴 액션 모음. 각 액션은 `src/apps/<action-name>/` 폴더 안에 **manifest + handler** 모듈 묶음으로 독립되어 있어, 새 액션 추가가 단순 폴더 추가로 끝난다.

## 기본 제공 액션

| Action | 위치 | 동작 |
|---|---|---|
| `open-html-in-browser` | Explorer / Editor Tab (`.html`, `.svg`, `.pdf`) | 시스템 기본(default) 브라우저로 열기 |
| `open-folder-in-new-window` | Explorer (폴더) | 새 VSCode 창에서 폴더 열기 |
| `reveal-in-os` | Explorer / Editor Tab | Finder / Explorer 에서 열기 |
| `copy-absolute-path` | Explorer / Editor Tab | 절대 경로 클립보드 복사 |
| `open-in-terminal` | Explorer | 해당 위치에 통합 터미널 열기 |

## 아키텍처

```
right-click-action-open-to-file/
├── package.json                # contributes.commands/menus 는 자동 생성 (%nls% placeholders)
├── package.nls.json            # 자동 생성 — 영문(기본) 라벨
├── package.nls.ko.json         # 자동 생성 — 한국어 라벨
├── i18n/                       # 언어별 원본 (1언어 = 1파일)
│   └── ko.json                 # { ext, commands, runtime } 한국어 번역 모음
├── l10n/                       # VSCode 런타임이 읽는 번들 (자동 생성)
│   └── bundle.l10n.ko.json     # i18n/ko.json 의 runtime 블록
├── scripts/
│   ├── sync-contributions.mjs  # src/apps/* + i18n/*.json → 위 모든 산출물 동기화
│   └── nls-defaults.json       # 영문 ext.displayName/description/category 기본값
└── src/
    ├── extension.ts            # entry: apps 레지스트리를 돌며 command 등록
    └── apps/
        ├── _types.ts           # AppModule / AppManifest 타입
        ├── index.ts            # 활성 apps 레지스트리
        ├── open-html-in-browser/
        │   ├── manifest.ts     # 선언: id, title(영문), menus, when, group
        │   ├── handler.ts      # 실행: (uri) => void
        │   └── index.ts        # { manifest, handler } 묶음 export
        ├── open-folder-in-new-window/
        ├── reveal-in-os/
        ├── copy-absolute-path/
        └── open-in-terminal/
```

## i18n

번역은 **`i18n/<locale>.json` 1개 파일에 1개 언어**로 분리되어 있다. 새 언어를 추가해도 manifest 나 핸들러 코드는 건드릴 필요 없다.

```json
// i18n/ko.json
{
  "ext": {
    "displayName": "우클릭 액션",
    "description": "...",
    "category": "우클릭 액션"
  },
  "commands": {
    "openHtmlInBrowser": "기본 브라우저로 열기",
    "openFolderInNewWindow": "새 VSCode 창에서 폴더 열기"
  },
  "runtime": {
    "No file to open.": "열 파일이 없습니다.",
    "Copied: {0}": "복사됨: {0}"
  }
}
```

세 블록의 의미:
- `ext` — 확장 자체 메타 (`displayName`, `description`, `category`). 영문 기본값은 `scripts/nls-defaults.json`.
- `commands` — 컨텍스트 메뉴/팔레트 명령 라벨. key 는 manifest 의 `id`. 영문 기본값은 manifest 의 `title`.
- `runtime` — `vscode.l10n.t('...')` 로 감싼 동적 문자열. key 는 영문 원본 문자열 그대로.

`npm run sync` 가 `i18n/ko.json` 으로부터 `package.nls.ko.json` 과 `l10n/bundle.l10n.ko.json` 을 자동 생성한다.

**새 언어 추가**: `i18n/ja.json` 같은 파일 1개만 만들고 `npm run sync` 실행하면 끝.

### 액션 1개 = 폴더 1개

각 액션은 자기 폴더 안에서 모든 책임을 가진다.

- **`manifest.ts`** — 선언적 메타데이터. id, 메뉴 위치(`explorer/context` 등), `when` clause, group 순서. `package.json` 의 `contributes` 는 여기서 자동 생성된다.
- **`handler.ts`** — 실제 동작. `(arg?: vscode.Uri) => unknown | Promise<unknown>` 시그니처.
- **`index.ts`** — `{ manifest, handler }` 한 줄 묶음 export.

### 새 액션 추가하기

```bash
# 1. 폴더 만들기
mkdir -p src/apps/my-new-action

# 2. manifest.ts / handler.ts / index.ts 작성 (기존 액션 복붙)

# 3. src/apps/index.ts 에 import 추가

# 4. 자동 동기화 후 빌드
npm run build
```

CI 에는 `sync:check` 가 들어 있어 `package.json` 이 `src/apps/*` 와 어긋나면 실패한다.

## 개발

```bash
npm install
npm run build       # sync → tsc
npm run watch       # tsc -w
npm run typecheck
npm run lint
npm run sync        # package.json contributes 재생성
npm run sync:check  # 동기화 상태 검증 (CI)
npm run package     # .vsix 빌드
```

## 메뉴 그룹

모든 액션은 `6_rca@NN` 그룹에 들어가서 컨텍스트 메뉴 하단에 한 섹션으로 묶여 보인다. 순서는 manifest 의 `group` 필드(`6_rca@10`, `@20` …)로 제어한다.
