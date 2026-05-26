# Vibecode Skills Viewer

> **Claude · Codex · Copilot · Cursor · Windsurf · Cline 의 AI 스킬을 한 사이드바에서.**
> 프리뷰 / 검색 / 동기화 / 즐겨찾기 / AI 챗 통합까지.

---

## 누구를 위한 거?

- 여러 AI 도구 (Claude Code, Codex, Cursor, ...) 를 동시에 쓰는 멀티 툴체인 사용자
- `~/.claude/skills` 와 `.cursor/rules`, `.windsurf`, `.clinerules` 가 따로따로 흩어져있어 어디에 뭐 있는지 모르는 사람
- `CLAUDE.md` / `AGENTS.md` / `.cursorrules` 등 instruction 파일을 한 번에 sync 시키고 싶은 팀
- Copilot Chat 에서 `@skills list` 같이 자기 스킬을 조회·추천받고 싶은 파워유저

## 풀어주는 문제

| 평소 흔한 상황 | 이 확장으로 |
|---|---|
| 도구마다 스킬이 흩어져있음 (`~/.claude/skills`, `.cursor/rules`, ...) | **하나의 사이드바**에 global + workspace + ext-bundled 다 보임 |
| 어떤 스킬이 어떤 도구용인지 헷갈림 | 상단 chip row 로 Claude / Codex / Copilot / Cursor / Windsurf / Cline 필터 |
| `SKILL.md` 일일이 열어봐야 함 | 클릭 한 번 = webview 프리뷰 + 점수 breakdown 옵션 |
| `CLAUDE.md` 에 어떤 스킬 쓸지 매번 직접 적기 | **Sync to Instruction Files** 로 marker-bounded 블록을 자동 작성 |
| 같은 스킬을 여러 도구 폴더에 중복 복사 | `mirrorSkillsByName` 옵션으로 자동 미러 |
| 자주 쓰는 스킬 빠르게 접근 | 즐겨찾기 ⭐ 핀 |
| Copilot Chat 에서 내 스킬 활용 | `@skills` 챗 참가자 — list / search / read / recommend tools 노출 |

## 핵심 셀링 포인트

1. **통합 사이드바** — Global (`~/.claude`, `~/.codex`, ...) + Workspace (`.claude`, `.cursor`, `.windsurf`, `.clinerules`, `.github`) + Extension-bundled.
2. **Tool chips 필터** — Claude · Codex · Copilot · Cursor · Windsurf · Cline · custom. 한 번에 도구 필터링.
3. **Webview 프리뷰** — `SKILL.md` 를 렌더 + 옵션: 섹션별 score breakdown.
4. **Fuzzy 검색 + 즐겨찾기** — 모든 소스 가로질러 빠른 매칭.
5. **Marker-bounded 동기화** — `<!-- vibecode-skills:START -->...<!-- vibecode-skills:END -->` 블록만 안전하게 재생성. 주변 내용 보존.
6. **`@skills` AI 챗 참가자** — `list_skills` / `search_skills` / `read_skill` / `recommend_skills` / `list_categories` ... 모두 노출.
7. **MEMORY 파일 단축** — Claude Code auto-memory 의 MEMORY.md / 폴더 / 인덱스 접근.
8. **Skill mirroring** — 같은 이름 스킬을 여러 도구 루트에 자동 미러.

## 사용 흐름 (시각)

```
[Activity bar: Vibecode Skills]
        ↓
┌──────────────────────────────────────────┐
│ Skills · Memory · MD             ⌕ ⊛ ↻  │
│ ─────────────────────────────────────    │
│ [ Claude ][ Codex ][ Copilot ][ Cursor ] │
│ [ Windsurf ][ Cline ][ + custom ]        │
│ ─────────────────────────────────────    │
│ ▾ Global (~)                             │
│   ⭐ using-superpowers       (claude)     │
│      systematic-debugging    (claude)     │
│      brainstorming           (claude)     │
│ ▾ Workspace                              │
│   ⭐ vibecode-build-release   (claude)     │
│      vibecode-extension-rev. (claude)     │
│ ▾ Extension-bundled                      │
│      mcp-builder             (claude)     │
└──────────────────────────────────────────┘
        ↓ 우클릭
   → Sync to Instruction Files…
   → CLAUDE.md / AGENTS.md / .cursorrules 에 블록 갱신

GitHub Copilot Chat:
  > @skills recommend "I want to debug a flaky test"
  → systematic-debugging, verification-before-completion
```

## 썸네일 아이디어

- **메인 컷**: 사이드바 트리뷰가 중앙. 위쪽에 6개 도구 로고가 chip row 처럼 나열 — Claude / Codex / Copilot / Cursor / Windsurf / Cline
- **트리 안**: ⭐ 핀 + 스킬 카드 3-4개 + 각 카드 옆에 작은 도구 로고
- **하단 강조**: `CLAUDE.md` 파일 아이콘 위에 `<!-- vibecode-skills:START -->` 마커 → 화살표로 sync 표현
- **컬러 키**: 다크 + 도구별 컬러 (Claude 오렌지, Cursor 보라, Copilot 검정, Windsurf 시안, Cline 그린)
- **부제**: "All AI skills · One sidebar"

## 한 줄 후크

> "6가지 AI 도구의 스킬을 한 사이드바에서 관리."
> 검색하고, 미리보고, instruction 파일에 박는다.
