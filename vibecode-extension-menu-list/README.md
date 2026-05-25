# vibecode-extension-menu-list

모든 vibecode-* 확장의 우클릭/에디터 메뉴를 한 군데에 묶어주는 **공용 `Vibecode` 서브메뉴 호스트**.
보조로 설치된 vibecode-* 확장의 모든 명령을 한 번에 조회/실행하는 **카탈로그 팔레트 명령**도 제공.

```
우클릭 메뉴
└─ Vibecode ▶
     ├─ (이 확장의 Show Catalog)
     ├─ (vibecode-commit-lint-check 의 Init From Template)
     ├─ (vibecode-right-click-sh-actions 의 Run in Terminal)
     └─ ...
```

## 노출되는 서브메뉴

| 서브메뉴 id | 노출 위치 | 그룹 |
|---|---|---|
| `vibecodeMenu.explorerContext` | `explorer/context` | `6_rca@5` |
| `vibecodeMenu.editorContext` | `editor/context` | `6_rca@5` |
| `vibecodeMenu.editorTitle` | `editor/title` | `navigation@99` |

서브메뉴 라벨은 i18n 으로 관리. 한국어 환경에서도 `Vibecode` 로 유지.

## 다른 vibecode-* 확장이 슬롯하는 방법

기존에 `explorer/context` 같은 네이티브 위치에 직접 contribute 하던 항목을 위 서브메뉴 id 로 옮기면 된다. 두 가지 경로:

### A) 수동 (package.json 편집)

```json
"contributes": {
  "menus": {
    "vibecodeMenu.explorerContext": [
      {
        "command": "myExt.doThing",
        "when": "explorerResourceIsFolder",
        "group": "6_rca@10"
      }
    ]
  }
}
```

### B) 모노레포의 sync-contributions 패턴

이 모노레포의 다른 확장처럼 `src/apps/*/manifest.ts` 의 `menus[].where` 값을 다음으로 바꾸면 됨:

```ts
menus: [
  { where: 'vibecodeMenu.explorerContext', when: 'explorerResourceIsFolder', group: '6_rca@10' }
]
```

각 확장의 `_types.ts` 의 `MenuLocation` 타입에 위 3개 서브메뉴 id 를 추가하고 `npm run sync` 한 번. 이 확장의 [src/apps/_types.ts](src/apps/_types.ts) 가 참고용.

> **소프트 의존성**: 슬롯하는 확장이 vibecode-extension-menu-list 를 `extensionDependencies` 로 선언하지 **않는다**. 이 확장이 미설치면 해당 항목들은 그냥 노출되지 않을 뿐 — 다른 동작에 영향 없음.

## 액션

| Trigger | 위치 | 동작 |
|---|---|---|
| `카탈로그 열기` | 팔레트 + 서브메뉴 안 (`9_meta` 그룹 끝) | 설치된 모든 vibecode-* 확장의 commands 를 한 QuickPick 으로 모아 보여줌. 선택하면 즉시 실행. |

## 아키텍처

```
vibecode-extension-menu-list/
├── package.json                          # contributes.{submenus,commands,menus} 자동 생성
├── package.nls.json / package.nls.ko.json
├── i18n/ko.json                          # ext + submenus + commands + runtime
├── l10n/bundle.l10n.ko.json
├── scripts/
│   ├── sync-contributions.mjs            # 표준 sync + submenu 호스팅
│   ├── nls-defaults.json                 # 기본(영문) NLS
│   └── submenu-surfaces.json             # 서브메뉴 선언 + 네이티브 위치 surface
└── src/
    ├── extension.ts
    └── apps/
        ├── _types.ts                     # MenuLocation 에 vibecodeMenu.* 포함, SUBMENU_IDS 노출
        ├── index.ts
        └── show-catalog/{manifest,handler,index}.ts
```

## 개발

```bash
npm install
npm run build       # sync → tsc
npm run typecheck
npm run lint
npm run sync        # package.json + nls 재생성
npm run sync:check  # CI 게이트
npm run package     # .vsix
```
