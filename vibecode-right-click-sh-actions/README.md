# vibecode-right-click-sh-actions

`.sh` 스크립트를 VSCode 통합 터미널에서 바로 실행하는 액션 모음.

## 동작

| 트리거 | 위치 | 동작 |
|---|---|---|
| 우클릭 | Explorer 의 `.sh` 파일 | 통합 터미널을 스크립트 위치에 열고 `bash ./script.sh` 실행 |
| 플레이 버튼 ▶ | `.sh` 파일을 연 에디터 우상단 | 동일 |
| 우클릭 | `.sh` 에디터 본문 | 동일 |
| 명령 팔레트 | 어디서나 | 활성 에디터 기준으로 실행 |

실행 전에 파일이 dirty 상태면 자동 저장한다 (최신 버전이 돌도록).

## 아키텍처

[vibecode-right-click-action-open-to-file](../vibecode-right-click-action-open-to-file/) 과 동일한 구조 — 액션 1개 = 폴더 1개 (`src/apps/<name>/`).

```
vibecode-right-click-sh-actions/
├── package.json                # contributes 는 자동 생성
├── package.nls.json            # 자동 생성 — 영문 라벨
├── package.nls.ko.json         # 자동 생성 — 한국어 라벨
├── i18n/
│   └── ko.json                 # 한국어 원본 (ext + commands + runtime)
├── l10n/
│   └── bundle.l10n.ko.json     # 자동 생성 — 런타임 문자열
├── scripts/
│   ├── sync-contributions.mjs
│   └── nls-defaults.json
└── src/
    ├── extension.ts
    └── apps/
        ├── _types.ts
        ├── index.ts
        └── run-sh-in-terminal/
            ├── manifest.ts
            ├── handler.ts
            └── index.ts
```

## 개발

```bash
npm install
npm run build       # sync → tsc
npm run typecheck
npm run lint
npm run sync        # package.json + nls 재생성
npm run sync:check  # 동기화 검증 (CI)
npm run package     # .vsix 빌드
```

## 보안 메모

스크립트는 `bash <quoted-path>` 로 실행되며 파일명은 single-quote 로 escape 한다. 워크스페이스에 신뢰할 수 없는 `.sh` 파일이 있다면 실행 전에 내용을 확인하자 — 이건 코드 실행 명령이다.
