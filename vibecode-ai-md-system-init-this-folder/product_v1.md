# Vibecode AI MD System — Init This Folder

> **새 프로젝트 폴더에 "AI 에이전트 셋팅" 을 1클릭으로 깔아준다.**
> Claude / Codex / Cursor / Gemini 4가지 도구 중 골라서.

---

## 누구를 위한 거?

- "이 폴더에 Claude Code 처음 깔건데 `.claude/CLAUDE.md` 부터 어떻게 쓰지?" 하는 사람
- 팀에 Claude/Cursor/Gemini 가 섞여있어서 **같은 규칙을 4가지 도구 포맷으로 다 적어둬야** 하는 사람
- 회사 표준 에이전트 prompt 를 모든 신규 레포에 똑같이 박고 싶은 리드 엔지니어

## 풀어주는 문제

| 평소 흔한 상황 | 이 확장으로 |
|---|---|
| `.claude/CLAUDE.md`, `.cursorrules`, `.gemini/`, `.codex/` ... 매번 손으로 만들기 | 사이드바에서 **템플릿 1번 클릭** |
| 도구 4개에 같은 규칙을 4번 베껴쓰기 | `.template_md` 1소스 → 4 target 자동 렌더 |
| 팀원마다 셋업 미묘하게 다름 | 회사 표준 템플릿을 `templates/` SSOT 로 박제 |
| Claude skills/agents 폴더 구조가 어떻게 생겨야 하는지 매번 찾기 | `with-vibecode-agents` 번들에 이미 4개 skill + 4개 agent 포함 |

## 핵심 셀링 포인트

1. **2-step 마법사** — 템플릿 → 도구 → 폴더. 3클릭이면 끝.
2. **4가지 AI 도구 동시 지원** — Claude, Codex, Cursor, Gemini. 기본 도구는 설정에서 ✓ 표시.
3. **SSOT 템플릿 카탈로그** — 사이드바 ▸ 버튼이 Finder 로 열어줘서 그 자리에서 편집.
4. **충돌 가드** — 기존 파일 있으면 "덮어쓰기 / 건너뛰기" 모달.
5. **`.template_md` 다중 렌더** — agent 정의를 markdown 1소스로 적으면 `this-extension` / `claude-skill` / `claude-agent` 형태로 자동 분산.

## 사용 흐름 (시각)

```
[Activity bar ⎘ 클릭]
        ↓
┌─────────────────────────────────┐
│  바이브코드 에이전트              │
│  ▸ Open Templates Folder       │
│  ▶ Apply…                      │
│  ↻ Refresh                      │
├─────────────────────────────────┤
│  ▸ minimal                      │
│      claude · codex · cursor ·  │
│      gemini                     │
│  ▸ with-vibecode-agents         │
│      claude (4 skills + 4 agts) │
└─────────────────────────────────┘
        ↓ 템플릿 클릭
   QuickPick: 도구 선택 (✓=기본)
        ↓
   폴더 picker → 설치 → Explorer reveal
```

## 썸네일 아이디어

- **중앙**: 빈 폴더 아이콘 → "마법사 wand" → `.claude/` `.cursorrules` `.gemini/` `.codex/` 4개 아이콘이 폴더에 박히는 모습
- **부제**: "1 click → 4 tools"
- **컬러 키**: Claude 오렌지, Codex 다크그레이, Cursor 보라, Gemini 블루 — 4도구 로고가 폴더 입구에서 쏟아져 들어가는 구도
- **포인트**: 사이드바 트리뷰의 ▸ 펼치는 모션이 핵심 — 트리 → QuickPick → 폴더 까지 3단 흐름이 한 컷에

## 한 줄 후크

> "새 폴더 → 마법사 → AI 에이전트 셋업 완료."
> 도구가 4개여도 마법사는 하나.
