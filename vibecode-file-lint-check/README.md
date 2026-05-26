# vibecode-file-lint-check

VS Code 사이드바에서 워크스페이스 파일 품질 체크를 실행하는 확장입니다. `vibecode-commit-lint-check`의 체크 트리/러너 구조를 복사하되, 커밋 메시지 템플릿 흐름은 제거하고 파일 린트 체크만 남겼습니다.

## 동작

설치 후 Activity Bar의 **파일 린트** 컨테이너에서 체크 목록을 봅니다.

| 명령 | 동작 |
|---|---|
| `Vibecode - Scaffold Default File Lint Checks` | 기본 체크를 `<workspace>/.vibecode/file-lint/`에 복사 |
| `Vibecode - Run File Lint Check` | 트리에서 선택한 단일 체크 실행 |
| `Vibecode - Run All File Lint Checks` | 모든 체크를 순서대로 실행 |
| `Vibecode - Refresh File Lint Checks` | 체크 폴더 다시 스캔 |
| `Vibecode - Open File Lint Checks Folder` | 체크 정의 폴더를 OS 파일 매니저로 열기 |

## 기본 체크

`bundled-checks/`의 체크를 워크스페이스로 복사합니다. 각 체크는 해당 npm script가 있으면 실행하고, 없으면 통과 처리합니다.

| ID | 내용 |
|---|---|
| `010-eslint` | `npm run lint` |
| `020-prettier-check` | `npm run format:check` |
| `030-typescript-noemit` | `npm run typecheck` |
| `040-json-parse` | git이 추적 중인 JSON 파일 파싱 |

## Check JSON 스키마

```ts
interface CheckDefinition {
  command: string;
  label?: string;
  description?: string;
  expectExit?: number;
  cwd?: string;
  shell?: boolean;
}
```

위치: `<workspace>/.vibecode/file-lint/<id>/check.json`

## 개발

```bash
npm install
npm run build
npm run typecheck
npm test
npm run package
```
