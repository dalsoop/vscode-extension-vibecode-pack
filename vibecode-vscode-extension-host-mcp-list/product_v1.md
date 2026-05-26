# Vibecode VSCode Host — MCP List

> **User · Workspace · 확장 contributes 의 MCP 서버를 한 트리뷰로.**
> 어디서 어떤 MCP 서버가 살아있는지 한눈에.

---

## 누구를 위한 거?

- VSCode 안의 MCP (Model Context Protocol) 생태계를 다루는 AI 도구 사용자
- User `mcp.json` + Workspace `mcp.json` + 확장이 contributes 하는 MCP 가 섞여있어 "지금 어느 MCP 서버가 떠 있지?" 헷갈리는 사람
- MCP 서버의 실행 명령을 다른 도구 (Claude Desktop, Cline, ...) 에도 복사해 쓰고 싶은 멀티 도구 사용자
- MCP 추가/수정 시 mcp.json 파일을 바로 열고 싶은 운영자

## 풀어주는 문제

| 평소 흔한 상황 | 이 확장으로 |
|---|---|
| MCP 서버가 user vs workspace vs ext 어디에 정의됐는지 모름 | 트리에 **User / Workspace / Extension** 3 그룹으로 정렬 |
| `mcp.json` 파일 위치를 매번 검색 | 토글: **Open User mcp.json** / **Open Workspace mcp.json** |
| 다른 도구에 같은 MCP 서버 셋업하려고 명령 복사 | 항목 옆 **⎘ 명령어 복사** 버튼 |
| MCP 추가했는데 리스트 갱신 안 됨 | ↻ 새로 고침 — 즉시 재스캔 |
| 어떤 확장이 어떤 MCP 를 기여했는지 안 보임 | Extension 그룹에 contributes-MCP 가 확장 이름과 함께 표시 |

## 핵심 셀링 포인트

1. **3 소스 통합** — User mcp.json + Workspace mcp.json + 설치된 확장의 `contributes.mcp` 한 트리에 묶음.
2. **명령어 복사 1버튼** — MCP 항목 옆 ⎘ 클릭이면 실행 명령이 클립보드로. Claude Desktop, Cline, Codex 등 다른 호스트에 그대로 붙여넣기.
3. **mcp.json 빠른 열기** — User / Workspace 각각 명령으로 즉시 열기.
4. **상세 webview** — 항목 선택 → 자세한 args / env / cwd / source 확인.
5. **자동 갱신** — Refresh 명령으로 mcp.json + ext contributes 재스캔.
6. **jsonc 지원** — 주석 들어간 mcp.json 도 `jsonc-parser` 로 정상 파싱.

## 사용 흐름 (시각)

```
[Activity bar: MCP 목록]
        ↓
┌────────────────────────────────────────────┐
│  MCP 서버                       ▸ ▸ ↻    │  ← user / workspace mcp.json / refresh
│  ─────────────────────────────────────     │
│  ▾ User                                    │
│    ● filesystem        ⎘                 │ ← 복사 버튼
│    ● github            ⎘                 │
│    ● memory            ⎘                 │
│  ▾ Workspace                               │
│    ● project-tools     ⎘                 │
│  ▾ Extension                               │
│    ● dalsoop.vibecode-foo / bar  ⎘       │
│  ─────────────────────────────────────     │
└────────────────────────────────────────────┘
        ↓ 항목 클릭
   ┌─ MCP 서버 상세 ───────────────────┐
   │ name:    github                    │
   │ command: npx                       │
   │ args:    [-y, @modelcontextprotocol│
   │           /server-github]          │
   │ env:     GITHUB_TOKEN=•••          │
   │ source:  ~/.config/Code/User/      │
   │          mcp.json:12               │
   └────────────────────────────────────┘
```

## 썸네일 아이디어

- **메인 컷**: 가운데에 트리뷰 — 위에서부터 `User` / `Workspace` / `Extension` 3 그룹이 명확히 분리, 각 그룹 안에 MCP 서버 카드 2-3개
- **각 카드 우측**: 작은 ⎘ 클립보드 아이콘 강조 (복사 버튼)
- **상단**: 큰 `MCP` 글자 — 그 옆에 작은 글자로 `Model Context Protocol`
- **컬러 키**: 다크 배경 + 그룹 헤더는 시안 + 카드는 elevated 그레이 + 복사 버튼은 골드
- **부제**: "User · Workspace · Extension — one list"
- **사이드**: 우상단에 두 개의 폴더 아이콘 (user / workspace mcp.json) + ↻ 리프레시

## 한 줄 후크

> "VSCode 호스트의 모든 MCP 서버를 한 트리뷰로."
> 클릭 한 번에 실행 명령 복사.
