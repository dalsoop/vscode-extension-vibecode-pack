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
- **Edit Source** — 같은 `.html` 을 옆에 텍스트 편집기로 열기
- **↗ Open in External Browser** — 같은 URL 을 기본 브라우저로 열기

## Pro 전용 (v0.5 shipped)

- **Inspector toggle** — 호버 시 요소 outline + selector tooltip, 클릭 시 우측 패널에 핀
- 핀 카드: matched CSS (heuristic) / computed style (화이트리스트 24 properties) / class toggle / 인라인 스타일 / force state chip / **Notes textarea (퍼블리셔용 자유 메모)**
- **▲N 뱃지** — 핀 카드 헤더에서 현재 적용된 override 개수 실시간 표시
- **자동 에셋 수집** — CSS / JS / 이미지 / 폰트 (DOM 초기 스캔 + PerformanceObserver)
- **Save Snapshot** — `.vibecode/browser-preview/YYYYMMDDHHMMSS/` 에 6 파일 (`state.html`, `picks.json`, `assets.json`, `changes.json`, `changes.md`, `meta.json`) + 같은 위치에 `YYYYMMDDHHMMSS.zip` 자동 동봉.
- `changes.md` 는 퍼블리셔가 그대로 읽도록 마크다운으로 렌더 — 핀별 변경사항 + Notes + computed delta.
- `.vibecode/.gitignore` 자동 생성, ZIP 작성 실패해도 폴더는 안전.
- Toast 알림 + "스냅샷 폴더 열기" 액션
- **디바이스 프리셋** — 툴바에서 Auto / Desktop 1280 / Tablet 768 / Mobile 375 즉시 전환
- **Changes 탭** — 인스펙터 패널에 Pins/Changes 탭. 현재 적용된 override 들이 `changes.md` 와 동일 구조로 실시간 렌더, 셀렉터 클릭으로 Pins 탭 점프
- **Force state 실제 시뮬레이션** — `:hover` / `:focus` / `:focus-visible` / `:active` chip 토글. 동일 origin stylesheet 의 룰을 자동 복제·적용. 스냅샷 `state.html` 에도 `<style id="vibecode-force-rules">` 로 보존되어 단독 렌더 가능.
- **VSCode Codicons UI** — 이모지/유니코드 글리프 모두 VSCode 네이티브 아이콘 폰트로 교체, 다크/라이트 테마 자동 적응
- **3-tab 패널** — Pins / Changes / Assets 탭 구조. snapshot hint 는 footer 로
- **Force-state chip** — 4 체크박스 → 1줄 button chip 토글 (aria-pressed)
- **Cross-origin 경고 닫기** — × 버튼 (sessionStorage 로 reload 까지 dismiss 유지)
- **Device select 우측 고정** — URL 라벨 길어도 device 선택은 툴바 우측 끝

## 알려진 한계 (v0.5)

- Cross-origin stylesheet 의 `:hover`/`:focus` 룰은 시뮬레이션 불가 (패널 상단에 경고 표시)
- 페이지 리로드 시 핀/override/force state 는 초기화됨 (Inspector toggle 만 유지)
- 5MB 초과 HTML 은 inspector 자동 비활성 (성능)
- 요소 영역 스크린샷, 핀 영속화는 v0.5+

## Security

HTTP 서버는 `127.0.0.1` 에만 바인딩되어 외부 머신에서는 접근 불가. 다만 **같은 머신의 다른 프로세스** 는 프리뷰가 열려있는 동안 워크스페이스 파일을 해당 포트로 읽을 수 있음 — `.env`, 시크릿, 워크스페이스 트리의 모든 것 포함. 신뢰할 수 없는 멀티유저 환경에서 사용 금지.

## Limitations (v0.1 기준 — base 와 동일)

- 리로드는 풀 페이지 (HMR 식 부분 업데이트 아님).
- `.gitignore` 미적용 — 매 저장마다 리로드 (위 하드코딩된 무시 패턴 제외).
- DevTools / 콘솔 패널 없음.
- localhost dev 서버 프록시 없음 (`npm run dev` 프로젝트는 일반 브라우저 사용).
