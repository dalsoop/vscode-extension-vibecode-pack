# Vibecode Browser Preview **Pro**

> **HTML 라이브 프리뷰 + 페이지 안 인스펙터 + 퍼블리싱용 스냅샷.**
> 디자이너 ↔ 퍼블리셔 핸드오프 한 번에 끝낸다.

---

## 누구를 위한 거?

- 시안 받아서 **요소별로 디자이너 피드백 메모를 남겨야 하는** 퍼블리셔
- "이 div 의 padding 좀 바꿔봐" 를 화면에서 클릭으로 시뮬레이션하고 싶은 디자이너
- 시안 ↔ 최종 HTML 의 차이를 markdown 으로 그대로 정리해서 핸드오프 받는 PM
- 디바이스별 (desktop / tablet / mobile) 뷰 확인이 잦은 반응형 작업자

## 풀어주는 문제

| 평소 흔한 상황 | 이 확장으로 |
|---|---|
| 시안 보다가 "이 텍스트 색깔 좀..." → Slack 으로 일일이 적기 | **요소 클릭 → 우측 핀 카드 → Notes textarea** 에 메모 |
| DevTools 로 임시 수정 → 새로고침 하면 사라짐 | **변경사항 자동 누적** + Snapshot 으로 ZIP 박제 |
| 컴포넌트 단위 핸드오프 문서 직접 작성 | `changes.md` 로 핀별 변경 + Notes + computed delta 자동 생성 |
| `:hover` `:focus` 상태 확인하기 어려움 | **Force-state chip** 으로 4가지 상태 즉시 시뮬레이션 |
| 반응형 작업 시 창 크기 일일이 조절 | Auto / Desktop 1280 / Tablet 768 / Mobile 375 **원클릭 전환** |

## 핵심 셀링 포인트

1. **페이지 안 Inspector** — 호버 outline + 클릭 핀. matched CSS / computed style / 클래스 토글 / 인라인 스타일 모두 한 패널에서.
2. **Notes 필드 = 퍼블리셔 메모용** — 핀마다 자유 텍스트. 스냅샷에 그대로 들어감.
3. **Snapshot 1클릭** — `.vibecode/browser-preview/<timestamp>/` 에 6파일 + ZIP 자동 동봉. 핸드오프 그대로 압축 전달.
4. **`changes.md` 자동 생성** — 핀별 변경사항 + Notes + computed delta 가 markdown 으로 정리. 디자이너가 그대로 읽음.
5. **Force-state 실제 시뮬레이션** — `:hover` `:focus` `:focus-visible` `:active` chip 토글. stylesheet 룰 자동 복제 적용.
6. **3-tab 패널** — Pins / Changes / Assets. 사용된 CSS·JS·이미지·폰트 자동 수집.
7. **디바이스 프리셋** — 툴바에서 desktop / tablet / mobile 즉시 전환.
8. **VSCode Codicons UI** — 다크/라이트/하이콘트라스트 자동 적응.

## 사용 흐름 (시각)

```
┌─────────────────────────┬───────────────────────────┐
│  렌더된 페이지 (iframe)   │  Inspector 패널            │
│                         │  ┌─ Pins ── Changes ── Assets ┐│
│  ┌─[ 호버 시 outline ]┐  │  │  PIN #1  selector .btn    │
│  │   <button class=  │  │  │  ▲2 (override 개수)        │
│  │     "btn-primary">│  │  │  ─ matched CSS            │
│  │     Sign up      │←─────│  ─ computed (24 props)    │
│  │   </button>      │  │  │  ─ class toggle           │
│  └───────────────────┘  │  │  ─ inline style           │
│                         │  │  ─ Force [:hover]✓ [:focus]│
│         ▭ ⌨ ▯       │  │  ─ Notes: "padding 16→24"  │
│       Desktop ▼        │  └───────────────────────────┘│
└─────────────────────────┴───────────────────────────┘
            ↓
     [ Save Snapshot ]
            ↓
.vibecode/browser-preview/20260525143012/
  ├─ state.html        ← force-state 보존된 단독 HTML
  ├─ picks.json
  ├─ assets.json
  ├─ changes.json
  ├─ changes.md        ← 디자이너용 마크다운 리포트
  ├─ meta.json
  └─ 20260525143012.zip ← 통째로 압축
```

## 썸네일 아이디어

- **메인 컷**: 렌더된 웹 페이지 위에 **돋보기/포인터** 가 어떤 요소를 가리키고, 그 옆에 **포스트잇 같은 핀 카드**가 떠 있는 모습
- **핀 카드 안**: `.btn-primary` / `padding 16→24` / `Notes: "더 크게..."` 같은 텍스트
- **하단 띠**: `▭ 1280 / ⌨ 768 / ▯ 375` 디바이스 아이콘 라인업
- **컬러 키**: Pro 라는 느낌의 골드/딥블루, 핀은 옐로우 포스트잇
- **부제**: "Inspect · Annotate · Ship"

## 한 줄 후크

> "라이브 프리뷰에 인스펙터와 메모를 얹었다."
> 한 번 클릭으로 디자이너 핸드오프 문서까지.
