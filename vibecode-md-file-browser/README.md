# Vibecode Markdown File Browser

VSCode Explorer 사이드바에서 워크스페이스의 Markdown 문서를 폴더별로 모아 보는 확장입니다. 문서가 많은 저장소에서 `README`, 기획서, 운영 문서, 제품 설명서를 빠르게 찾고 바로 미리보기로 열 수 있게 만드는 것이 목적입니다.

## 기능

- `.md`, `.mdx`, `.markdown` 파일 자동 수집
- 폴더 구조 기준 트리 탐색
- 클릭 시 Markdown 미리보기 또는 원본 편집기 열기
- 우클릭으로 미리보기, 원본 열기, Explorer 위치 보기, 상대 경로 복사
- include/exclude Glob 설정

## 사용법

1. VSCode에서 워크스페이스 폴더를 엽니다.
2. Explorer 사이드바의 `마크다운 파일` 뷰를 엽니다.
3. 문서를 클릭해 미리보기를 열거나, 우클릭 메뉴에서 원본 편집기를 선택합니다.
4. 문서 목록이 바뀌면 상단 새로고침 버튼을 누릅니다.

## 설정

- `vibecodeMdFileBrowser.includeGlobs`: 탐색할 Markdown Glob 목록
- `vibecodeMdFileBrowser.excludeGlob`: 제외할 디렉터리 Glob
- `vibecodeMdFileBrowser.openMode`: 클릭 기본 동작, `preview` 또는 `source`

## 빌드

```bash
npm install
npm run typecheck
npm run build
```
