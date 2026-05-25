---
name: vibecode-webview-architecture
description: "vibecode-* 확장의 webview 클라이언트 아키텍처 — contracts/ 앰비언트 네임스페이스로 ext↔webview 타입 공유, outFile + reference-path 지시자로 emit 순서 강제, sections/ 분할 + namespace IIFE 패턴. Use when: 새 webview 패널/뷰를 추가하거나, 기존 클라이언트(.client.ts)가 ~500줄 넘어 쪼개야 할 때 (e.g., \"새 패널 만들자\", \"settings.client.ts 너무 커서 분할하자\")."
---

# Vibecode Webview Architecture

vibecode-* 확장 (대표: `vibecode-skills-viewer`) 의 webview 클라이언트 코드를 일관되게 구성하기 위한 패턴.

세 가지 축:
1. **Contracts** — 앰비언트 `declare namespace Contracts` 로 ext↔webview 타입 공유 (import/export 없음)
2. **outFile 컴파일** — webview 클라이언트는 `module: "none"` + `outFile` 로 단일 .js 번들
3. **Section 분할** — 모놀리식 client.ts 가 커지면 `sections/` 로 IIFE namespace 패턴으로 쪼개고 `/// <reference path />` 로 emit 순서 강제

## 1. Contracts — 단일 진실 공급원

webview 클라이언트는 별도 tsconfig 로 빌드되므로 ext 의 `import type` 를 못 쓴다. 해결책: `src/contracts/*.d.ts` 에 앰비언트 네임스페이스 선언.

```ts
// src/contracts/messages.d.ts
declare namespace Contracts {
  type HubMsgFromExt =
    | { type: 'init'; tabs: Tab[]; ... }
    | { type: 'data'; tab: TabId; items: Group[] };

  type HubMsgFromView =
    | { type: 'refresh' }
    | { type: 'action'; action: ActionName; payload: ItemPayload };
}
```

ext 쪽은 `src/types.ts` 에서 alias 로 재-export 해서 기존 import 스타일 유지:
```ts
export type MsgFromExt = Contracts.HubMsgFromExt;
```

webview 클라이언트는 `Contracts.*` 를 그대로 사용 (전역 네임스페이스). 별도 import 불필요.

**파일 분할 규칙:** `scoping.d.ts` (id/enum), `config.d.ts` (설정 스키마), `payloads.d.ts` (DTO), `messages.d.ts` (메시지 union).

## 2. outFile — webview 번들 빌드

각 webview 클라이언트 폴더에 자체 `tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "none",
    "outFile": "../../../../dist/webview/client/hub.js",
    "target": "ES2020",
    "lib": ["ES2020", "DOM"]
  },
  "include": ["./**/*.ts", "../../contracts/**/*.d.ts"]
}
```

- `module: "none"` + `outFile` → 모든 .ts 파일이 단일 .js 로 알파벳 순 concat
- `contracts/**/*.d.ts` 를 include 해야 `Contracts.*` 가 인식됨
- 번들이므로 import/export 금지 — 전역 함수/namespace 만 사용

## 3. Section 분할 — 큰 client.ts 쪼개기

client.ts 가 ~500줄 넘으면 `sections/` 로 분할.

### 구조
```
preview/client/
├── _shared.ts          # 공통 helper (P 네임스페이스: payload(), $, send 등)
├── sections/
│   ├── aux.ts          # namespace AuxSection { export function render() {...} }
│   ├── header.ts       # namespace HeaderSection { ... }
│   └── ...
└── preview.client.ts   # orchestrator
```

### Namespace IIFE 패턴 (sections/*.ts)
```ts
namespace HeaderSection {
  export function render(): void {
    const p = P.payload();
    // ...
  }
}
```

`_shared.ts` 는 underscore-prefix 로 알파벳 정렬에서 가장 앞으로 — orchestrator/section 들이 의존하는 `P.*` 가 먼저 정의되도록.

### Orchestrator — reference-path 지시자 필수

```ts
// preview/client/preview.client.ts
/// <reference path="./_shared.ts" />
/// <reference path="./sections/aux.ts" />
/// <reference path="./sections/code-copy.ts" />
/// <reference path="./sections/header.ts" />

function render(): void {
  HeaderSection.render();
  AuxSection.render();
}
```

**왜 필요한가:** outFile 은 알파벳 순 concat 이지만, orchestrator 가 top-level 에서 `const SECTIONS = [HeaderSection, AuxSection]` 같은 식으로 namespace 를 참조하면 IIFE 가 실행되기 *전에* undefined 가 캡처되어 silent crash. `/// <reference path />` 는 TypeScript 가 emit 위상정렬을 다시 하도록 강제 → section IIFE 가 orchestrator 보다 먼저 실행됨.

**증상:** 패널이 안 열림, 콘솔에 `Cannot read property 'render' of undefined` 또는 그냥 빈 화면. 이전 회차에서 settings 패널이 안 열려서 추가했던 패턴.

## 메시지 라우팅 패턴

ext 측 controller:
```ts
view.webview.onDidReceiveMessage((msg: Contracts.PreviewMsgFromView) => {
  this.onMessage(msg).catch(e => log.error('preview onMessage', e));
});

private async onMessage(msg: Contracts.PreviewMsgFromView) {
  switch (msg.type) {
    case 'ready': return this.sendPayload();
    case 'open':  return this.openInEditor();
    // ...
  }
}
```

Discriminated union 이므로 `switch` 안에서 자동 type narrowing — 각 case 에서 추가 필드 안전하게 접근.

## 함정

- `module: "none"` 빌드에서 실수로 ES import 쓰면 빌드는 통과하지만 런타임에 깨짐. ESLint `no-restricted-syntax` 로 막아도 좋음.
- `contracts/*.d.ts` 수정 후 webview 빌드 캐시 안 지우면 새 타입이 안 잡힘. `rm -rf dist/webview && npm run build` 로 강제.
- section 새로 추가하면 orchestrator 의 `/// <reference path />` 목록에 *반드시* 추가. 빠뜨리면 위 silent crash.
- `_shared.ts` 의 `P` 같은 글로벌 헬퍼 네임스페이스 이름은 짧게 (한 글자 추천) — 모든 section 에서 반복 호출되므로.

## 적용 사례

- `vibecode-skills-viewer/src/contracts/` — 4-file split
- `vibecode-skills-viewer/src/preview/client/` — 621줄 → 7 section + 69줄 orchestrator
- `vibecode-skills-viewer/src/settings/client/` — 동일 패턴
- `vibecode-skills-viewer/src/webview/hub/` — contracts 만 적용 (단일 hub.client.ts)
