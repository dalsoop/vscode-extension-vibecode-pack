# Vibecode Right-Click — VSIX Package & Install

> **VSCode 확장 폴더 우클릭 → 그 자리에서 `.vsix` 빌드 + 설치.**
> 모노레포에서 자기 확장 반복 테스트할 때 1클릭으로 끝낸다.

---

## 누구를 위한 거?

- VSCode 확장을 **만드는 사람** — 한 세션에 빌드 → 설치 사이클을 10번 돈다
- 확장 모노레포 (예: vscode-extension-mono) 에서 10개 이상의 확장을 굴리는 팀
- "vsce package" → 파일명 외우기 → `code --install-extension <name>-<version>.vsix --force` 매번 치기 귀찮은 사람
- 신입에게 "이 폴더 우클릭하고 이거 누르세요" 한 줄로 설치 안내하고 싶은 리드

## 풀어주는 문제

| 평소 흔한 상황 | 이 확장으로 |
|---|---|
| `cd path/to/ext && npm i && npm run package && code --install-extension foo-0.1.2.vsix --force` 매번 입력 | 폴더 우클릭 → **Package & Install**. 끝. |
| 버전 바뀌면 `.vsix` 파일명 외워야 함 | 자동으로 빌드된 파일을 잡아서 설치 |
| `npm run package` 가 없는 확장은 따로 처리 | 없으면 `npx vsce package --no-dependencies --allow-missing-repository` 로 자동 폴백 |
| 모노레포 10개 확장 굴리면서 cd 매번 | 폴더 우클릭이면 끝. cd 0번 |
| 에러 났는데 어디서 실패했는지 모름 | 모든 출력 통합 터미널에 그대로 스트리밍. 실패한 단계에서 멈춤 |

## 핵심 셀링 포인트

1. **1 우클릭 = 3단계 자동** — `npm install --silent` → `npm run package` (or vsce fallback) → `code --install-extension <vsix> --force`.
2. **확장 폴더 검증** — `package.json` 에 `engines.vscode` 있는 폴더에서만 동작. 잘못된 폴더 보호.
3. **idempotent 빌드 체인** — 이미 의존성 깔려있으면 빠르게 패스. 빌드 스크립트 없으면 자동 fallback.
4. **terminal 스트리밍** — 모든 출력이 통합 터미널에 그대로. 실패 원인이 가려지지 않음.
5. **dogfood** — 자기 자신도 이 방식으로 설치. `npm run package` 가 곧 `.vsix` 생성.

## 사용 흐름 (시각)

```
Explorer (모노레포)
  ▸ apps/
    ▸ vibecode-foo/  ◄── 우클릭
         │
         └─ "Vibecode - Package & Install VSCode Extension"
                          ↓
   ┌───────── Integrated Terminal ─────────┐
   │ cd apps/vibecode-foo                  │
   │ $ npm install --silent                │
   │ $ npm run package                     │
   │   → vibecode-foo-0.1.2.vsix           │
   │ $ code --install-extension            │
   │     vibecode-foo-0.1.2.vsix --force   │
   │ ✓ Extension installed.                │
   └───────────────────────────────────────┘
                          ↓
       › "Reload Window to activate?"  [Reload]
```

## 썸네일 아이디어

- **메인 컷**: 폴더 아이콘 위에 우클릭 → 메뉴에서 "Package & Install" 강조 → 화살표가 `.vsix` 패키지 아이콘으로 → 다시 VSCode 로고로 들어가는 사이클
- **컬러 키**: VSCode 블루 + 그린 (성공). 패키지 아이콘은 갈색 박스
- **부제**: "Build · Install · Reload — one click"
- **사이드**: 터미널 미니뷰에 ✓ 3줄 (install / package / install-extension)

## 한 줄 후크

> "확장 폴더 우클릭으로 빌드 + 설치 끝."
> 모노레포 반복 사이클이 1클릭이 된다.
