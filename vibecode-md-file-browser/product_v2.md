# Vibecode Markdown File Browser — v0.1 selling brief

## One-liner
모든 Markdown 문서를 워크스페이스 한 곳에서 모아 보고, 한 클릭으로 미리보기 또는 원본을 연다.

## Why this exists
프로젝트가 커질수록 README, 기획서, 운영 문서, AGENTS.md, CHANGELOG 같은 Markdown 이 폴더 곳곳에 흩어진다. 평범한 Explorer 트리에서는 코드 사이에 묻혀 찾기 어렵다. 이 확장은 Explorer 사이드바에 **Markdown 전용 트리**를 띄워 문서만 골라 보여준다.

## What you get
- Explorer 사이드바에 `Markdown Files` 뷰 추가
- 워크스페이스 전체에서 `.md` / `.mdx` / `.markdown` 자동 수집
- 폴더 구조 그대로 트리로 표시
- 클릭 시 기본 동작 — 미리보기 또는 원본 (설정 선택)
- 우클릭 메뉴 — 미리보기, 원본, Explorer 위치 보기, 상대 경로 복사
- 파일 변경 감지 → 자동 새로고침 (debounced)
- include / exclude Glob 사용자 정의

## Settings
- `vibecodeMdFileBrowser.includeGlobs` — 탐색 패턴
- `vibecodeMdFileBrowser.excludeGlob` — 제외 패턴
- `vibecodeMdFileBrowser.openMode` — `preview` 또는 `source`

## Not in scope
- Markdown 내용 검색 — 워크스페이스 검색이 더 잘함
- 외부 파일 추가 — 워크스페이스 내부만
