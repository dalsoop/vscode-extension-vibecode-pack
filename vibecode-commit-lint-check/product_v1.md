# Vibecode Commit Lint Check

> **설치만 하면 어떤 레포든 즉시 커밋 메시지 lint.**
> commitlint 셋업 0, husky 와이어링 0. 그 다음 단계는 1클릭 스캐폴드.

---

## 누구를 위한 거?

- "팀에 Conventional Commits 도입하고 싶은데 셋업 가이드 만들기 귀찮은" 리드
- 회사 레포 50개에 똑같이 commitlint + husky 깔아야 하는 DevX
- Node / PHP-Laravel / Python 섞인 멀티스택 환경에서 각각 다른 lint 셋업이 필요한 팀
- `npm i -D @commitlint/*` 시작도 안 한 신규 레포에서 **지금 당장** 커밋 메시지가 컨벤션에 맞는지 보고 싶은 사람

## 풀어주는 문제

| 평소 흔한 상황 | 이 확장으로 |
|---|---|
| commitlint 셋업 = `npm i` + config + husky 와이어링 + .husky 권한 설정 | **0단계: 설치만 하면** ext 내장 validator 가 즉시 검사 |
| Conventional Commits 룰 깜빡함 | 직전 커밋 메시지를 ✓ 버튼으로 즉시 검사 |
| 스택마다 다른 commitlint 셋업 (Node husky / PHP / Python pre-commit) | 4가지 번들 템플릿 → 폴더 우클릭 1번 |
| 커밋 외 임의 셸 체크 (lint / test / typecheck) 를 한 군데서 돌리고 싶음 | `.vibecode/code-lint/<id>/check.json` → 사이드바 트리에서 run / runAll |
| 팀별 커스텀 룰 박제 | `commit-lint-templates/<id>/` 에 사용자 템플릿 추가, QuickPick 에 자동 노출 |

## 핵심 셀링 포인트

1. **Layer 0 — 외부 도구 0** — 설치 직후 `Check Last Commit Message` 가 동작. commitlint config 도 cli 도 필요 없음.
2. **Layer 1 — 1클릭 스캐폴드** — 폴더 우클릭 → 4가지 템플릿 (`conventional` / `php-laravel` / `node-husky` / `python-pre-commit`) 중 선택 → 파일 작성 + postInstall.
3. **Layer 2 — 외부 commitlint 강제** — 설정 `preferExternal: true` 면 내장 대신 `npx commitlint` 로 위임.
4. **Layer 3 — 임의 셸 체크 트리** — `.vibecode/code-lint/` 에 check.json 들 모아두면 사이드바에서 run/runAll/output 한 번에.
5. **2개 트리뷰** — Templates (번들 + 사용자) / Checks (워크스페이스 스캔). 둘 다 file watcher 로 즉시 갱신.
6. **COMMIT_EDITMSG 인테그레이션** — 커밋 메시지 작성 중 에디터 우상단 ✓ 버튼으로 검사.

## 사용 흐름 (시각)

```
[Activity bar: Commit Lint]
        ↓
┌─────────────────────────────────┐
│  Commit-Lint Templates          │
│  ▾ 번들 템플릿                   │
│    ┃ Conventional Commits       │
│    ┃ PHP / Laravel              │
│    ┃ Node.js (husky v9)         │
│    ┃ Python (pre-commit)        │
│  ▾ 사용자 정의                   │
│    ┃ 260525-foo                 │
├─────────────────────────────────┤
│  Checks                         │
│  ✓ 010-subject-length           │
│  ✗ 020-no-wip                   │
│  ⏸ 030-issue-ref                │
└─────────────────────────────────┘

  ┌─[ COMMIT_EDITMSG ]───┐
  │ feat(api): add login │  ◄── ✓ 버튼 클릭 → 즉시 lint
  └──────────────────────┘
```

## 썸네일 아이디어

- **메인 컷**: 커밋 메시지 입력 박스 위에 `feat(api): add login ✓` 와 `wip: stuff ✗` 가 나란히 — 좌측 OK, 우측 X 마크
- **하단 칩 4개**: `JS·Node` `PHP·Laravel` `Python` `Conventional` — 4 스택 템플릿
- **컬러 키**: 그린 ✓ + 레드 ✗ + VSCode 다크 배경
- **부제**: "0 setup → instant lint"
- **포인트**: 우상단 ✓ 체크 버튼이 강조 — "에디터에서 직접 누름"

## 한 줄 후크

> "설치 = lint 시작."
> 그 다음 단계는 우클릭 1번이면 commitlint + husky 까지.
