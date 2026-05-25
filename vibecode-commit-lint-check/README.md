# vibecode-commit-lint-check

폴더 우클릭으로 commitlint 설정을 템플릿으로 스캐폴드하고, 팔레트에서 직전 커밋을 CLI 로 검사한다.

```
<우클릭한 폴더>/
├── commitlint.config.js     ← 템플릿이 작성
├── .husky/commit-msg        ← Node 템플릿일 때만
└── commit-lint-templates/   ← `Add Custom Template` 액션이 사용자 템플릿을 여기에 추가
    └── 260525143012-foo/
        └── template.json
```

## 액션

| Trigger | 위치 | 동작 |
|---|---|---|
| `초기화` | Explorer 우클릭한 폴더 | 번들/사용자 템플릿을 QuickPick → 파일 작성 → postInstall 명령을 통합 터미널에서 실행할지 묻기 |
| `직전 커밋 검사` | 팔레트, `COMMIT_EDITMSG` 에디터 우상단 ✓ 버튼 | 워크스페이스 루트에서 `npx --yes commitlint --from HEAD~1 --to HEAD --verbose` 실행. config 가 없으면 초기화 액션으로 안내 |
| `사용자 템플릿 추가` | Explorer 우클릭한 폴더 | `<folder>/commit-lint-templates/{ts}-{name}/template.json` 빈 스켈레톤 생성 후 자동 열기 |

## 번들 템플릿

| ID | 제목 | 비고 |
|---|---|---|
| [010-conventional](templates/010-conventional/template.json) | Conventional Commits (default) | 베이스라인 `@commitlint/config-conventional`. 훅 와이어링 없음 |
| [020-php-laravel](templates/020-php-laravel/template.json) | PHP / Laravel | scope-enum 힌트 (app, artisan, composer, config, database, …) + COMMITLINT.md 가이드 (captainhook / 수동 git hook) |
| [030-node](templates/030-node/template.json) | Node.js (husky v9) | `.husky/commit-msg` + `npx husky init` postInstall |
| [040-python](templates/040-python/template.json) | Python (pre-commit framework) | `.pre-commit-config.yaml` + `pre-commit install --hook-type commit-msg` |

## Template JSON 스키마

```ts
interface CommitLintTemplate {
  title: string;                  // QuickPick 라벨
  description: string;            // QuickPick detail
  files: TemplateFile[];          // 대상 폴더에 작성될 파일 목록
  postInstall?: string[];         // 작성 후 터미널에서 차례로 실행
}

interface TemplateFile {
  path: string;                   // 대상 폴더 기준 상대경로
  content: string;
  overwrite?: boolean;            // 기본 false (이미 존재하면 건너뜀)
}
```

사용자 정의 템플릿은 워크스페이스의 `commit-lint-templates/<ts>-<name>/template.json` 으로 추가되며, Init QuickPick 에서 `사용자 정의` 라벨로 번들 템플릿과 함께 노출된다.

## 아키텍처

[vibecode-agent-init-this-folder](../vibecode-agent-init-this-folder/) 와 동일한 모듈 구조 (액션 1개 = `src/apps/<name>/` 폴더 1개).

```
vibecode-commit-lint-check/
├── package.json                          # contributes 자동 생성
├── package.nls.json / package.nls.ko.json  # 자동 생성
├── i18n/ko.json                          # 한국어 원본 (ext + commands + runtime)
├── l10n/bundle.l10n.ko.json              # 자동 생성
├── scripts/{sync-contributions.mjs, nls-defaults.json}
├── templates/                            # 번들된 템플릿 카탈로그 (read-only at runtime)
│   ├── 010-conventional/template.json
│   ├── 020-php-laravel/template.json
│   ├── 030-node/template.json
│   └── 040-python/template.json
└── src/
    ├── extension.ts
    └── apps/
        ├── _types.ts                     # CommitLintTemplate, AppManifest, ...
        ├── index.ts
        ├── init-from-template/{manifest,handler,index}.ts
        ├── check-last-commit/{manifest,handler,index}.ts
        └── add-template/{manifest,handler,index}.ts
```

## 개발

```bash
npm install
npm run build       # sync → tsc
npm run typecheck
npm run lint
npm run sync        # package.json + nls 재생성
npm run sync:check  # CI 게이트
npm run package     # .vsix
```
