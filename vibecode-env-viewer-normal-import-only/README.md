# vibecode-env-import-only

`.env` 파일을 **붙여넣기 전용 보안 뷰**로 연다. 키는 보이지만 값은 어떤 경우에도 화면에 표시되지 않는다.

## 동작

- `.env` 파일 클릭 → VSCode 가 자동으로 커스텀 에디터로 연다 (텍스트 에디터로는 안 열림)
- 키 목록 표시: 현재 `.env` 의 `KEY=` 라인을 파싱
- 각 키 옆에 paste-only 입력 칸:
  - 키 입력 차단 (`keydown` / `beforeinput` 양쪽에서 막음)
  - `⌘V` / `Ctrl+V` 만 허용
  - 붙여넣은 값은 즉시 화면에서 사라짐 (input.value = '')
- 상태 표시: `··· (설정됨)` 또는 `(비어있음)` — 길이도 노출 안 함
- 저장: `⌘S` / `Ctrl+S` (VSCode 표준 흐름)
- 비상 우회: "Open With… → Text Editor" 로 원본 텍스트 편집 가능

## 우회

확장이 잘못 동작하거나 새 KEY 를 추가해야 할 때:
1. Explorer 에서 `.env` 우클릭 → **Open With…** → **Text Editor**
2. 또는 명령 팔레트 → **Reopen Editor With…** → **Text Editor**

## 보안 고려사항

- 값은 webview JS 안에서만 잠깐 거쳐 갔다가 `setValue` 메시지로 extension 으로 넘긴 뒤 바로 `input.value = ''` 로 지워짐. DOM 에 남지 않음.
- webview CSP: `default-src 'none'` + script nonce. 외부 fetch 불가.
- 단점/주의:
  - 디스크에는 평문 `.env` 그대로 저장됨 (암호화 X — 이 확장의 책임 범위 밖)
  - 클립보드 자체가 외부 도구에 노출될 위험은 막을 수 없음
  - 화면 캡처 도구가 활성화돼 있으면 paste 전 클립보드 단계에서 노출 가능

## 아키텍처

```
vibecode-env-import-only/
├── package.json                  # contributes.customEditors 수동 선언 (정적)
├── package.nls.json              # 자동 생성 — 영문 라벨
├── package.nls.ko.json           # 자동 생성 — 한국어 라벨
├── i18n/
│   └── ko.json                   # 한국어 원본 ({ nls, runtime })
├── l10n/
│   └── bundle.l10n.ko.json       # 자동 생성 — 런타임 문자열
├── scripts/
│   ├── sync-nls.mjs              # 간소 버전 (NLS 만, contributes 자동생성 없음)
│   └── nls-defaults.json
└── src/
    ├── extension.ts              # provider 등록
    ├── editor-provider.ts        # CustomTextEditorProvider + webview HTML
    └── env-parser.ts             # 파싱/시리얼라이즈 (코멘트·순서 보존)
```

### 다른 vibecode-* 확장들과 차이점

다른 확장들은 `src/apps/<name>/` 모듈 패턴이지만, 이 확장은 **명령이 아니라 커스텀 에디터**가 메인이라 패턴이 다르다:
- `contributes.customEditors` 는 정적으로 `package.json` 에 직접 선언
- `sync` 스크립트는 NLS 만 동기화 (commands/menus 자동생성 없음)
- i18n 구조는 `nls` + `runtime` 2블록 (다른 확장의 `ext` + `commands` + `runtime` 3블록과 다름)

## 개발

```bash
npm install
npm run build       # sync → tsc
npm run typecheck
npm run lint
npm run sync        # package.nls + l10n 재생성
npm run sync:check  # CI 게이트
npm run package     # .vsix
```

## v0.1 한계

- `.env` 파일만 인터셉트 (`.env.local`, `.env.production` 등은 일반 텍스트 에디터로 열림)
- 새 KEY 추가는 텍스트 에디터로 우회 후 가능
- 값 변경 이력/diff 표시 없음
- 한 줄짜리 값만 지원 (multi-line 값 미지원)
