# vscode-extension-mono

VSCode 확장 모노레포 (dalsoop).

## 구조

각 확장은 루트 직속 폴더로 둔다.

```
vscode-extension-mono/
├── claude-codex-skills-viewer/   # Claude/Codex/Copilot 등 스킬 통합 사이드바
├── _seed/                         # 새 확장 시작용 placeholder
├── tools/                         # 공용 스크립트 (pre-commit, secret-scan 등)
├── .gitlab-ci.yml                 # 푸시 시 CI (typecheck/lint/test, allow_failure)
└── .policy-ci.yml                 # MR/default branch CI (+ secret-scan hard-gate)
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
| [claude-codex-skills-viewer](claude-codex-skills-viewer/) | 0.5.0 | Claude/Codex/Copilot/Cursor/Windsurf/Cline 스킬을 통합 사이드바로 표시. 프리뷰, 검색, 원격 카탈로그, AI 채팅 참가자, 인스트럭션 파일 동기화. |
