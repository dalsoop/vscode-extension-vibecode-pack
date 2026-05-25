# vscode-extension-mono

VSCode 확장 모노레포 (dalsoop).

## 구조

각 확장은 루트 직속 폴더로 둔다.

```
vscode-extension-mono/
├── vibecode-skills-viewer/           # Claude/Codex/Copilot 등 스킬 통합 사이드바
├── vibecode-right-click-action-open-to-file/  # 파일/폴더 우클릭 컨텍스트 메뉴 액션 모음
├── vibecode-right-click-sh-actions/           # .sh 우클릭 → 터미널 실행 + 에디터 상단 ▶ 버튼
├── vibecode-agent-init-this-folder/           # 폴더 우클릭 → 에이전트 템플릿 엔트리 스캐폴드
├── vibecode-env-import-only/                  # .env 를 paste-only 보안 뷰로 인터셉트 (값 비표시)
├── vibecode-commit-lint-check/                # 폴더 우클릭 → commitlint 템플릿 스캐폴드 + CLI 로 직전 커밋 검사
├── vibecode-extension-menu-list/              # 공용 `Vibecode` 서브메뉴 호스트 + 모든 vibecode-* 명령 카탈로그
├── _seed/                             # 새 확장 시작용 placeholder
├── tools/                             # 공용 스크립트 (pre-commit, secret-scan 등)
├── .gitlab-ci.yml                     # 푸시 시 CI (typecheck/lint/test, allow_failure)
└── .policy-ci.yml                     # MR/default branch CI (+ secret-scan hard-gate)
```

## 새 확장 추가

```bash
# 1. 루트 직속으로 폴더 생성
mkdir my-new-extension
cd my-new-extension

# 2. VSCode 확장 스캐폴드 (package.json + extension.js 등)
#    또는 yo code 사용

# 3. 패키징
npx @vscode/vsce package --allow-missing-repository --skip-license

# 4. 로컬 설치
code --install-extension my-new-extension-0.1.0.vsix --force
```

## 빌드/패키징

각 확장 폴더에서:

```bash
cd <extension>/
npx @vscode/vsce package --allow-missing-repository --skip-license
```

## 확장 목록

| 확장 | 버전 | 설명 |
|---|---|---|
| [vibecode-skills-viewer](vibecode-skills-viewer/) | 2.3.0 | Claude/Codex/Copilot/Cursor/Windsurf/Cline 스킬을 통합 사이드바로 표시. 프리뷰, 검색, 원격 카탈로그, AI 채팅 참가자, 인스트럭션 파일 동기화. |
| [vibecode-right-click-action-open-to-file](vibecode-right-click-action-open-to-file/) | 0.1.0 | 파일/폴더 우클릭 컨텍스트 메뉴 액션 (브라우저 열기, 새 창 열기, Finder 열기, 경로 복사, 터미널 열기). 각 액션이 `src/apps/<name>/` 모듈 묶음. |
| [vibecode-right-click-sh-actions](vibecode-right-click-sh-actions/) | 0.1.0 | `.sh` 파일 우클릭 또는 에디터 상단 ▶ 플레이 버튼으로 통합 터미널에서 스크립트 실행. |
| [vibecode-agent-init-this-folder](vibecode-agent-init-this-folder/) | 0.1.0 | 폴더 우클릭으로 `templates/{yymmddhhmmss}-{name}/template.json` 에이전트 템플릿 엔트리 생성 (title, content, prompts, upstream_url, ssot). 업스트림 동기화는 stub. |
| [vibecode-env-import-only](vibecode-env-import-only/) | 0.1.0 | `.env` 파일을 paste-only 커스텀 에디터로 인터셉트. 키만 노출, 값은 화면에 표시되지 않음 (타이핑 차단, ⌘V 만 허용). 일반 텍스트 에디터는 "Open With…" 우회로만. |
| [vibecode-commit-lint-check](vibecode-commit-lint-check/) | 0.1.0 | 폴더 우클릭으로 commitlint 설정을 템플릿(Conventional / PHP·Laravel / Node·husky / Python·pre-commit)으로 스캐폴드하고, 팔레트에서 `npx commitlint --from HEAD~1 --to HEAD` 로 직전 커밋을 검사. 사용자 정의 템플릿 추가 가능. |
| [vibecode-extension-menu-list](vibecode-extension-menu-list/) | 0.1.0 | 모든 vibecode-* 확장이 우클릭/에디터 메뉴를 슬롯할 공용 `Vibecode` 서브메뉴 (`vibecodeMenu.explorerContext` / `editorContext` / `editorTitle`) 호스팅 + 설치된 모든 vibecode-* 명령을 한 QuickPick 으로 보여주는 카탈로그 명령. |
