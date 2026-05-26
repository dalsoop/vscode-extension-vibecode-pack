# Vibecode Show File Lines

> **워크스페이스의 모든 파일을 줄 수 기준으로 랭킹.**
> 어느 파일이 2,000줄짜리 괴물인지 한 눈에.

---

## 누구를 위한 거?

- 레거시 코드베이스 인수받은 신규 입사자 — "어디부터 봐야 하지?"
- 리팩토링 대상 발굴이 일상인 시니어 / 테크 리드
- "한 파일이 너무 길어지면 안 됨" 정책을 팀에 도입하고 싶은 리드
- 각 확장자(.ts, .py, .css)별로 어디에 코드가 쏠려있는지 보고 싶은 아키텍트

## 풀어주는 문제

| 평소 흔한 상황 | 이 확장으로 |
|---|---|
| 어느 파일이 가장 큰지 모름 | **상위 N개 파일 랭킹** (기본 50개) |
| `find . -name "*.ts" -exec wc -l {} \;` 직접 짜기 | 사이드바 한 줄. binary skip, gitignore 존중 |
| `.gitignore`, `node_modules` 다 포함돼서 노이즈 | **`.gitignore` / `.lineignore` / `files.exclude` 모두 존중**, binary 자동 스킵 |
| 어느 확장자가 가장 무거운지? | **Group-by-extension 뷰** 토글 |
| 임계치 넘는 파일 한 번에 표시 | `warnThreshold` (기본 500줄) 넘으면 시각 마커 |
| 큰 binary 열다가 VSCode 뻗음 | `maxFileSizeKB` (기본 2MB) 넘으면 안 읽음 |

## 핵심 셀링 포인트

1. **Flat 랭킹 + Group-by-extension** — 토글 1번으로 두 뷰 전환.
2. **임계치 시각 마커** — 500줄 넘는 파일이 트리에서 한눈에 띔.
3. **3가지 ignore 존중** — `.gitignore` / `.lineignore` / `files.exclude` 각각 토글 가능.
4. **Binary 자동 스킵** — 확장자 allow-list 기반 (빠름) + 사용자 정의 추가 가능.
5. **Size cap** — 큰 파일은 읽지도 않음. VSCode 안 죽음.
6. **수동 refresh** — 저장할 때마다 다시 스캔하지 않음. 편집 중에 트리 안 흔들림.

## 사용 흐름 (시각)

```
[Activity bar: Vibecode File Lines]
        ↓
┌────────────────────────────────────┐
│  Line Ranking          ↻  ⊛        │
│  ──────────────────────────────    │
│  ■ src/legacy/giant.ts    2,341 ⚠ │  ← warn 임계치 초과
│  ■ src/api/handlers.ts    1,820 ⚠ │
│  ■ src/utils/index.ts     1,124 ⚠ │
│  ■ src/views/dash.tsx       643 ⚠ │
│  ■ src/ext/main.ts          412   │
│  ■ src/lib/parser.ts        287   │
│  ■ README.md                234   │
│  ...                               │
└────────────────────────────────────┘

토글 → Group-by-extension
┌────────────────────────────────────┐
│  ▾ .ts     12,341 lines (38 files) │
│  ▾ .tsx     4,820 lines (24 files) │
│  ▾ .css     2,124 lines  (8 files) │
│  ▾ .md      1,034 lines (12 files) │
└────────────────────────────────────┘
```

## 썸네일 아이디어

- **메인 컷**: 가로 막대 차트 형태로 파일 5-6개가 줄 수 순서로 위에서 아래로 점점 짧아지는 그래프 — 가장 위 막대는 **빨간 ⚠** 마커
- **막대 위 텍스트**: `giant.ts 2,341` `handlers.ts 1,820` ...
- **컬러 키**: 다크 배경 + 막대는 시안 → 노란 → 빨간 (줄 수 증가에 따라 그라데이션)
- **부제**: "Find the 2,000-line monsters"
- **사이드**: 우측에 작은 도넛/파이로 확장자별 비중 (.ts 가 가장 큼)

## 한 줄 후크

> "워크스페이스의 모든 파일, 줄 수 기준으로 랭킹."
> 리팩토링 대상이 보인다.
