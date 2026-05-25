# vibecode-browser-preview-pro

`vibecode-browser-preview` 의 확장판. 라이브 프리뷰 위에 페이지 안 인스펙터, 사용된 에셋/CSS 자동 수집, 상태 컨트롤, 그리고 퍼블리싱 핸드오프용 스냅샷 저장을 얹는다.

> 현재 v0.1 시점에는 base 와 기능적으로 동일하다. Pro 전용 기능 (인스펙터/스냅샷) 은 v0.2 이상에서 점진적으로 추가될 예정. 두 확장은 같은 `.html` 패턴을 잡지만 viewType 이 달라서 동시 설치 가능 — VSCode 가 둘 중 하나를 기본으로 골라준다.

## How it works (base 와 동일)

- `customEditor` 로 `*.html` / `*.htm` 잡음 (`priority: default`) — 더블클릭하면 텍스트 편집기 대신 프리뷰 열림.
- Node HTTP 서버가 `127.0.0.1:0` 에 바인딩 (커널이 포트 할당) 후 워크스페이스 폴더를 정적 서빙. 워크스페이스 루트 당 하나, lazy start, 마지막 프리뷰 닫히면 close.
- Webview 는 toolbar + iframe (`http://127.0.0.1:PORT/<relative-path>`) 구조.
- 워크스페이스 `FileSystemWatcher` 가 200ms 디바운스로 파일 변경을 감지하고 iframe `src` 캐시버스팅으로 강제 리로드. `node_modules`, `.git`, `dist`, `out` 은 무시.

## Toolbar

- **↻ Reload** — 즉시 리로드
- **📝 Edit Source** — 같은 `.html` 을 옆에 텍스트 편집기로 열기
- **↗ Open in External Browser** — 같은 URL 을 기본 브라우저로 열기

## Pro 전용 (예정 / v0.2+)

- 인스펙터 모드: 호버 시 요소 셀렉터 표시, 클릭하면 매칭 CSS 룰 + 컴퓨티드 스타일 패널 노출
- 사용된 에셋 자동 수집 (CSS / JS / 이미지 / 폰트 / fetch)
- 상태 컨트롤: 클래스 토글, 인라인 스타일 편집, `:hover`/`:focus`/`:active` 시뮬레이션
- 스냅샷 저장: `.vibecode/browser-preview/YYMMDDHHMMSS/` 에 `state.html` + `picks.json` + `assets.json` + `meta.json`

## Security

HTTP 서버는 `127.0.0.1` 에만 바인딩되어 외부 머신에서는 접근 불가. 다만 **같은 머신의 다른 프로세스** 는 프리뷰가 열려있는 동안 워크스페이스 파일을 해당 포트로 읽을 수 있음 — `.env`, 시크릿, 워크스페이스 트리의 모든 것 포함. 신뢰할 수 없는 멀티유저 환경에서 사용 금지.

## Limitations (v0.1 기준 — base 와 동일)

- 리로드는 풀 페이지 (HMR 식 부분 업데이트 아님).
- `.gitignore` 미적용 — 매 저장마다 리로드 (위 하드코딩된 무시 패턴 제외).
- DevTools / 콘솔 패널 없음.
- localhost dev 서버 프록시 없음 (`npm run dev` 프로젝트는 일반 브라우저 사용).
