# vibecode-commit-lint-check

VSCode 에 설치하면 어떤 repo 든 즉시 커밋 메시지 lint 가 가능하다. 더 엄격한 룰이 필요하면 commitlint 셋업까지 한 번에 스캐폴드하고, 프로젝트 단위의 임의 셸 체크도 `.vibecode/code-lint/` 트리로 관리한다.

## 동작 레이어

| Layer | 사용자가 할 일 | 검증기 |
|---|---|---|
| **0 — 즉시** | 설치만 | **내장 Conventional Commits validator (외부 도구 0)** |
| 1 — 강한 룰 도입 | 폴더 우클릭 → Init From Template | 스캐폴드된 `commitlint.config.js` |
| 2 — 외부 commitlint 강제 | 설정에서 `vibecodeCommitLint.checkLastCommit.preferExternal: true` | `npx commitlint --from HEAD~1 --to HEAD` (터미널) |
| 3 — 임의 셸 체크 | 팔레트 → Scaffold Default Commit-Lint Checks | `.vibecode/code-lint/*/check.json` (Checks 트리에서 run/runAll) |

설치 직후 (`Layer 0`) 에 `Vibecode - Check Last Commit Message` 를 실행하면 `commitlint.config` 도 `@commitlint/cli` 도 필요 없이 ext 내장 검증기로 결과가 즉시 나온다.

```
<우클릭한 폴더>/
├── commitlint.config.js              ← 템플릿이 작성
├── .husky/commit-msg                 ← Node 템플릿일 때만
├── commit-lint-templates/            ← Add Custom Template 액션이 사용자 템플릿을 여기에 추가
│   └── 260525143012-foo/
│       └── template.json
└── .vibecode/code-lint/              ← Checks (사이드바 트리에서 run/runAll)
    └── 010-subject-length/
        └── check.json
```

## 사이드바 뷰

활성화 시 액티비티 바에 새 컨테이너가 노출되고, 그 안에 두 트리뷰가 있다.

| View ID | 이름 | 내용 |
|---|---|---|
| `vibecodeCommitLint.checks` | Checks | 워크스페이스의 `.vibecode/code-lint/*/check.json` 자동 스캔 → 트리에 카드 1행씩. run/runAll/output 명령으로 실행 |
| `vibecodeCommitLint.templates` | Commit-Lint Templates | 번들 템플릿 (`templates/`) + 워크스페이스의 `commit-lint-templates/*` 사용자 템플릿을 둘 다 카테고리로 분리해서 노출 |

## 액션 / 명령

12개 모두 명령 팔레트에서 접근 가능. 메뉴 등록된 것은 표시.

### 템플릿 워크플로우

| 명령 (`vibecodeCommitLint.*`) | 노출 위치 | 동작 |
|---|---|---|
| `initFromTemplate` | Explorer 우클릭한 폴더 | 번들/사용자 템플릿을 QuickPick → 파일 작성 → postInstall 명령을 통합 터미널에서 실행할지 묻기 |
| `addTemplate` | Explorer 우클릭한 폴더 | `<folder>/commit-lint-templates/{ts}-{name}/template.json` 빈 스켈레톤 생성 후 자동 열기 |
| `applyTemplate` | 트리뷰 항목 인라인 액션 | 특정 트리 항목을 골라 init 흐름 트리거 |
| `refreshTree` | 트리 타이틀바 | `templates` 트리 재스캔 |
| `checkLastCommit` | 팔레트, `COMMIT_EDITMSG` 에디터 우상단 ✓ 버튼 | 워크스페이스 루트에서 `npx --yes commitlint --from HEAD~1 --to HEAD --verbose` 실행. config 가 없으면 init 액션으로 안내 |

### Checks 워크플로우

| 명령 (`vibecodeCommitLint.*`) | 노출 위치 | 동작 |
|---|---|---|
| `scaffoldDefaultChecks` | 팔레트 | 번들된 기본 check 들을 워크스페이스의 `.vibecode/code-lint/` 로 복사 (있으면 건너뜀) |
| `revealChecksFolder` | 팔레트, 트리 타이틀바 | `.vibecode/code-lint/` 를 OS 파일 매니저로 열기 |
| `refreshChecks` | 트리 타이틀바 | `checks` 트리 재스캔 |
| `runCheck` | 트리 항목 인라인 | 한 check 실행 → 결과를 트리 항목 색상/상태로 표시, stdout/stderr 는 출력 채널 |
| `runAllChecks` | 트리 타이틀바, 팔레트 | 모든 valid check 순차 실행 |
| `showCheckOutput` | 팔레트 | 출력 채널 보이기 |

### 기타

| 명령 (`vibecodeCommitLint.*`) | 동작 |
|---|---|
| `openSettings` | 이 확장의 설정 페이지로 점프 |

## 번들 템플릿

| ID | 제목 | 비고 |
|---|---|---|
| [010-conventional](templates/010-conventional/template.json) | Conventional Commits (default) | 베이스라인 `@commitlint/config-conventional`. 훅 와이어링 없음 |
| [020-php-laravel](templates/020-php-laravel/template.json) | PHP / Laravel | scope-enum 힌트 (app, artisan, composer, config, database, …) + COMMITLINT.md 가이드 |
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

## Check JSON 스키마

```ts
interface CheckDefinition {
  command: string;          // 필수. 셸 명령 (shell=false 면 argv 로 파싱)
  label?: string;           // 기본: 폴더 이름에서 `NNN-` 접두 제거
  description?: string;     // 트리 항목 description / tooltip
  expectExit?: number;      // pass 로 간주할 exit code. 기본 0
  cwd?: string;             // 워크스페이스 루트 기준 상대경로. `..` 탈출 금지. 기본 `.`
  shell?: boolean;          // 기본 true. false 면 shell-quote 규칙으로 argv 분해
}
```

위치: `<workspace>/.vibecode/code-lint/<id>/check.json`. id 는 폴더 이름(예: `010-subject-length`). 트리는 파일 시스템 watcher 로 변경 즉시 갱신.

## 아키텍처

[vibecode-right-click-action-open-to-file](../vibecode-right-click-action-open-to-file/) 의 manifest-driven 모듈 구조 (액션 1개 = `src/apps/<name>/` 폴더 1개).

```
vibecode-commit-lint-check/
├── package.json                              # contributes 자동 생성
├── package.nls.json / package.nls.ko.json    # 자동 생성
├── i18n/ko.json                              # 한국어 원본 (ext + commands + runtime)
├── l10n/bundle.l10n.ko.json                  # 자동 생성
├── scripts/{sync-contributions.mjs, nls-defaults.json, build-ext.mjs}
├── templates/                                # 번들된 commitlint 템플릿 카탈로그
│   ├── 010-conventional/template.json
│   ├── 020-php-laravel/template.json
│   ├── 030-node/template.json
│   └── 040-python/template.json
├── bundled-checks/                           # `scaffoldDefaultChecks` 가 복사하는 시드 check 들
└── src/
    ├── extension.ts                          # apps 루프 + 인라인 inline command/view 등록
    ├── treeProvider.ts                       # templates 트리
    ├── checks/                               # Checks 트리 + runner + watcher + output
    │   ├── checksState.ts
    │   ├── checksTreeProvider.ts
    │   ├── checkLoader.ts
    │   ├── checkRunner.ts
    │   ├── seedChecks.ts
    │   ├── outputChannel.ts
    │   └── types.ts
    ├── lib/templateUtils.ts
    └── apps/                                 # 12개 액션 (1폴더 = 1 명령)
        ├── _types.ts                         # COMMAND_PREFIX, AppManifest, fullCommandId
        ├── index.ts
        ├── add-template/{manifest,handler,index}.ts
        ├── apply-template/{manifest,handler,index}.ts
        ├── check-last-commit/{manifest,handler,index}.ts
        ├── init-from-template/{manifest,handler,index}.ts
        ├── open-settings/{manifest,handler,index}.ts
        ├── refresh-checks/{manifest,handler,index}.ts
        ├── refresh-tree/{manifest,handler,index}.ts
        ├── reveal-checks-folder/{manifest,handler,index}.ts
        ├── run-all-checks/{manifest,handler,index}.ts
        ├── run-check/{manifest,handler,index}.ts
        ├── scaffold-default-checks/{manifest,handler,index}.ts
        └── show-check-output/{manifest,handler,index}.ts
```

## 개발

```bash
npm install
npm run build            # sync → esbuild bundle → dist/extension.js
npm run typecheck
npm run lint
npm test                 # 활성화 스모크 테스트 (vibecode-extension-testing skill)
npm run sync             # package.json + nls 재생성
npm run sync:check       # CI 게이트
npm run package          # .vsix
```

빌드는 esbuild 로 단일 번들 (`dist/extension.js`) — `vsce package --no-dependencies` 가 `node_modules` 를 제외하므로 런타임 의존성은 반드시 번들에 인라인되어야 한다. 활성화 스모크 테스트가 런타임 모듈 누락을 잡는다.
