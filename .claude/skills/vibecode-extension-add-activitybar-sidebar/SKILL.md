---
name: vibecode-extension-add-activitybar-sidebar
description: "vibecode-* 확장에 액티비티 바 아이콘 + 사이드바 webview 를 추가하는 레시피 — viewsContainers + views 기여, WebviewViewProvider 골격, SVG 아이콘 컨벤션, 등록 위치. Use when: 명령 위주 확장에 사이드바를 붙이거나, 액티비티 바에 자체 아이콘이 필요하거나, 기존 명령들을 묶어 보여줄 영구 UI 가 필요할 때 (e.g., \"사이드바 추가해줘\", \"액티비티 바 아이콘 등록\", \"webview view 만들자\")."
---

# Adding Activity Bar Icon + Sidebar Webview

기존의 명령(command) 위주 vibecode-* 확장이 커져서 워크스페이스 단위로 항상 띄워두는 UI 가 필요해졌을 때 쓰는 레시피. 표준 구현체는 `vibecode-skills-viewer` 의 `vibeskills.hub` 뷰.

webview *클라이언트* 코드 구조(`contracts/`, `outFile`, `sections/` IIFE) 는 [[vibecode-webview-architecture]] 가 담당 — 이 스킬은 *확장 측* 등록과 골격만 다룬다.

## 1. package.json — viewsContainers + views

두 개의 키를 함께 기여한다. `viewsContainers.activitybar[].id` 와 `views.<id>` 의 객체 키가 *일치해야* 한다.

```json
"contributes": {
  "viewsContainers": {
    "activitybar": [
      { "id": "vibeskills", "title": "%view.container.title%", "icon": "icons/tools/claude.svg" }
    ]
  },
  "views": {
    "vibeskills": [
      { "id": "vibeskills.hub", "name": "%view.hub%", "type": "webview" }
    ]
  }
}
```

- 컨테이너 `id` ("vibeskills") 는 내부 키 — 다른 곳에서 안 보임. `views.<id>` 키로만 참조됨.
- `title` 은 hover tooltip 으로 보이므로 NLS 키(`%...%`) 사용.
- view `id` ("vibeskills.hub") 는 `registerWebviewViewProvider(id, ...)` 호출과 `menus["view/title"]` 의 `when: "view == ..."` 절에서 그대로 쓰임 — 오타 주의.
- `activationEvents` 에 `"onView:vibeskills.hub"` 추가하면 사용자가 사이드바 클릭할 때만 활성화되어 startup 비용 절감.

## 2. 아이콘 SVG — 16×16, currentColor

액티비티 바 아이콘은 monochrome SVG 만 받는다 (PNG/멀티컬러 X).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
     fill="none" stroke="currentColor" stroke-width="1.25"
     stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 1.5v3.2 ..."/>
  <circle cx="8" cy="8" r="1.8" fill="currentColor" stroke="none"/>
</svg>
```

`currentColor` 가 핵심 — 테마(라이트/다크/HC) 와 선택 상태에 자동으로 맞춰진다. 하드코딩 색(`#fff`, `fill="black"`) 쓰면 다크 테마에서 안 보임. 실제 예: `vibecode-skills-viewer/icons/tools/claude.svg`.

## 3. 파일 레이아웃 — skills-viewer 구조 따라가기

```
src/
├── webview/
│   ├── hub.ts                    # 1줄짜리 back-compat shim
│   └── hub/
│       ├── HubProvider.ts        # WebviewViewProvider 구현 (~140줄)
│       ├── view.ts               # buildHtml() — CSP + nonce + STYLE
│       └── client/               # [[vibecode-webview-architecture]] 영역
│           ├── tsconfig.json     # module:none + outFile
│           └── hub.client.ts
└── extension.ts                  # registerWebviewViewProvider 호출
```

`webview/hub.ts` 는 import 경로 안정성을 위한 1-2줄 shim:
```ts
// Back-compat shim — real code lives in src/webview/hub/.
export { HubProvider } from './hub/HubProvider';
```

## 4. Provider 골격 — WebviewViewProvider

핵심만 발췌 (`HubProvider.ts` 참고, 전체 ~140줄):

```ts
export class HubProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | null = null;

  constructor(private context: vscode.ExtensionContext) {
    context.subscriptions.push(
      bus.on(() => this.refresh()),                // 외부 신호로 재전송
      onDidChangeLocale(() => { /* html + sendAll */ })
    );
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(this.context.extensionPath)]
    };
    view.webview.html = buildHtml(view.webview, this.context.extensionPath);
    view.webview.onDidReceiveMessage((msg: MsgFromView) => {
      this.onMessage(msg).catch(e => log.error('hub onMessage', e));
    });
    view.onDidChangeVisibility(() => { if (view.visible) this.sendAll(); });
    this.sendAll();
  }

  refresh(): void { if (this.view?.visible) this.sendAll(); }
}
```

- `localResourceRoots` 는 `extensionPath` 만 — 사용자 워크스페이스 파일은 `asWebviewUri` 로 따로 변환해서 보냄.
- `visible` 체크 후 send — 숨겨진 뷰에 매번 broadcast 하지 않음.
- `onDidChangeVisibility` 로 뷰가 다시 열릴 때 최신 데이터 재전송.

## 5. buildHtml — CSP + 스크립트 URI

```ts
export function buildHtml(webview: vscode.Webview, extensionPath: string): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, 'dist', 'webview', 'client', 'hub.js'))
  );
  const csp =
    `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; ` +
    `font-src ${webview.cspSource}; script-src ${webview.cspSource};`;
  return `<!DOCTYPE html><html><head>
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <style>${STYLE}</style>
  </head><body><div id="content"></div>
    <script src="${scriptUri}"></script>
  </body></html>`;
}
```

outFile 번들을 `<script src=>` 로 로드하는 표준 패턴에서는 `script-src ${cspSource}` 만으로 충분 (별도 nonce 불필요). 인라인 스크립트가 섞이면 그때 `'nonce-${nonce}'` 를 CSP 와 `<script nonce>` 양쪽에 추가.

## 6. extension.ts 에서 등록

```ts
const hub = new HubProvider(context);
context.subscriptions.push(
  vscode.window.registerWebviewViewProvider('vibeskills.hub', hub, {
    webviewOptions: { retainContextWhenHidden: true }
  })
);
```

- 첫 인자(viewId) 는 package.json 의 `views.<container>[].id` 와 *완전히* 동일해야 함.
- `retainContextWhenHidden: true` — 사이드바 닫았다 다시 열 때 클라이언트 state 보존. 메모리는 더 쓰지만 UX 가 훨씬 매끄러움. 사용자 입력(검색/필터) 을 유지하는 뷰면 거의 항상 필요.

## 7. 상태바 동반 아이템 (선택)

사이드바 + 상태바 콤보가 자주 같이 간다 (전체 카운트 + 클릭→패널 포커스). `statusBar.ts` 23줄 패턴:

```ts
item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);
item.text = `$(book) ${count}`;          // $(book) — codicon inline
item.tooltip = t('statusBar.tooltip', count);
item.command = 'vibecodeSkills.search';  // 클릭 액션
context.subscriptions.push(item);
item.show();
```

priority `80` 정도가 일반적 (왼쪽으로 갈수록 큰 값).

## 8. view/title 메뉴 액션

리프레시/설정 같은 헤더 버튼은 `menus["view/title"]` 로 부착, `when` 절로 해당 뷰에만 한정:

```json
"menus": {
  "view/title": [
    { "command": "vibecodeSkills.refresh", "when": "view == vibeskills.hub", "group": "navigation@3" },
    { "command": "vibecodeSkills.openSettings", "when": "view == vibeskills.hub", "group": "navigation@5" }
  ]
}
```

- `group: "navigation@N"` 이 inline 버튼 (헤더에 아이콘으로 노출). N 이 정렬 순서.
- `group: "1_more@N"` 같은 형식은 `...` overflow 메뉴로 들어감.
- 정규식 매칭도 됨: `"view =~ /vibeskills\\./"` 로 같은 그룹의 모든 뷰에 일괄 적용 (multi-view 확장에서 유용).

## Common Mistakes

| 증상 | 원인 |
|---|---|
| 사이드바 클릭해도 빈 화면 | viewId 가 `registerWebviewViewProvider` 인자와 package.json `views.<>[].id` 사이에 불일치 |
| 다크 테마에서 아이콘 안 보임 | SVG 에 `currentColor` 대신 하드코딩 색(`#000`, `fill="black"`) |
| 아이콘 자체가 액티비티바에 안 뜸 | PNG/JPG 썼거나, viewBox 가 16×16 이 아니거나, path 가 viewBox 밖 |
| 스크립트가 콘솔 에러 없이 침묵 | CSP `script-src` 누락 — 브라우저는 silently block. devtools(`Developer: Open Webview Developer Tools`) 로 확인 |
| 활성화 시 `view.show()` 호출 | 안티패턴 — VSCode 가 visibility 관리. 사용자가 직접 클릭해서 열어야 함 |
| 클라이언트 TS 가 ext 와 같은 tsconfig | 빌드는 통과해도 런타임 모듈 시스템 충돌. 별도 tsconfig + `outFile` 필수 → [[vibecode-webview-architecture]] |
| 사이드바 닫았다 열면 state 리셋 | `retainContextWhenHidden: true` 누락 |
