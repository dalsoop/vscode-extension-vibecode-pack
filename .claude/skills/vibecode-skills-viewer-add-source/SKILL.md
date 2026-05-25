---
name: vibecode-skills-viewer-add-source
description: "vibecode-skills-viewer 의 hub 사이드바에 새 탭/데이터 소스/스코프/툴 칩을 추가한다. Use when: 새 카테고리(예- prompts, snippets, chatmodes)를 viewer 에 노출시키거나, 스코프/툴 필터를 늘릴 때 (e.g., \"hub 에 prompts 탭 추가해줘\", \"새 도구 chip 추가\")."
---

# Vibecode Skills Viewer — Source/Tab 확장

`vibecode-skills-viewer` (이 모노레포의 메인 viewer 확장) 의 hub 사이드바에 새 분류를 추가하는 절차.

핵심 구조 (`/Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono/vibecode-skills-viewer/src/`):
```
contracts/       # 앰비언트 타입 (TabId, ScopeId, ToolId)
data/
├── constants.ts # TABS, SCOPES 리스트
├── index.ts     # getDataSources()
├── skills.ts    # SkillSource 등 각 탭별 DataSource
├── md.ts        # rootmd / agent
├── memory.ts    # MEMORY.md
└── browse.ts    # browse 탭
webview/hub/
├── HubProvider.ts # sendAll() 에서 각 source.fetch() 호출
└── view.ts        # html shell
webview/client/hub.client.ts # 렌더 + 필터
l10n/bundle.{en,ko}.json     # i18n 키
```

## 새 탭 추가하기 (예: `prompts` 탭)

### 1. 타입 등록 — `src/contracts/scoping.d.ts`
```ts
type TabId = 'all' | 'skill' | 'rootmd' | 'agent' | 'memory' | 'prompts';
```

### 2. TABS 상수 — `src/data/constants.ts`
```ts
export const TABS: Tab[] = [
  { id: 'all', label: 'All', desc: 'Everything in one view' },
  // ...
  { id: 'prompts', label: 'Prompts', desc: 'Reusable prompt files' }
];
```

### 3. DataSource 구현 — `src/data/prompts.ts`
```ts
import type { DataSource, FetchContext, Group, ItemPayload } from '../types';

export class PromptsSource implements DataSource {
  readonly id = 'prompts' as const;
  readonly label = 'Prompts';
  readonly desc = 'Reusable prompt files';

  fetch(ctx: FetchContext): Group[] {
    // Scope 는 client-side 필터 → 항상 전체 반환, item 마다 scope 스탬프
    const all = collectPromptsForAllScopes(ctx);
    const items: ItemPayload[] = all.map(p => ({
      id: p.path,
      label: p.name,
      kind: 'prompt',
      tool: p.tool,         // chip 필터용
      scope: p.scope,       // 'global' | 'workspace' | 'this'
      subtitle: p.relPath,
      metric: { count: p.lineCount, unit: 'lines' },
      // children?: ItemPayload[]  // 폴더 트리 표현 시
    }));
    return [{ id: 'prompts', label: 'Prompts', items }];
  }
}
```

### 4. 레지스트리 등록 — `src/data/index.ts`
```ts
import { PromptsSource } from './prompts';
export function getDataSources(): DataSource[] {
  return [..., new PromptsSource()];
}
```

### 5. i18n — `l10n/bundle.en.json` + `bundle.ko.json`
```json
{
  "hub.tabs.prompts.label": "Prompts",
  "hub.tabs.prompts.desc": "Reusable prompt files"
}
```
KO 도 반드시 같이 추가 (parity).

### 6. 빌드 + 설치
```sh
cd vibecode-skills-viewer
npm run build && npm run typecheck
find . -maxdepth 1 -name '*.vsix' -delete
npx --yes @vscode/vsce@latest package --no-dependencies --allow-missing-repository --skip-license --baseContentUrl https://dalsoop.com
code --install-extension vibecode-skills-viewer-*.vsix --force
```
유저에게 `⌘R` (Reload Window) 안내.

## 새 스코프 추가 (예: `team`)

1. `contracts/scoping.d.ts` 의 `ScopeId` 에 추가
2. `data/constants.ts` 의 `SCOPES` 에 `{ id: 'team', label: 'Team' }`
3. 각 DataSource 가 ItemPayload 에 `scope: 'team'` 스탬프 (조건 만족 시)
4. i18n: `hub.scopes.team`
5. 자동으로 chip + (N) count 작동 — client-side `passesScopeChip` 가 처리

스코프는 client-side 필터이므로 round-trip 없음. 각 ItemPayload 가 `scope` 필드를 갖고 있으면 됨.

## 새 도구(tool) 추가 (예: `aider`)

1. `src/config.ts` 의 `DEFAULT_TOOLS` 에 `{ id: 'aider', label: 'Aider', enabled: true, builtin: true }`
2. (선택) source 에서 `passesEnabledTools(it.source.tool, ctx.enabledTools)` 가 작동하도록 ItemPayload 에 `tool: 'aider'` 스탬프
3. i18n 라벨 추가 (선택 — `td.label` 이 chip 라벨로 그대로 노출됨)
4. 사용자가 settings 패널에서 활성/비활성 토글, chip row 자동 표시/숨김

## ItemPayload 필드 reference

```ts
{
  id: string;          // 고유 (보통 절대경로)
  label: string;       // 표시 이름
  kind?: ItemKind;     // 'skill' | 'rootmd' | 'agent' | 'memory' | ...
  tool?: ToolId;       // chip 필터 + 아이콘
  scope?: ScopeId;     // 'global' | 'workspace' | 'this'
  subtitle?: string;   // 부제 (보통 상대경로)
  meta?: string;       // 작은 회색 텍스트
  badge?: 'new' | 'star' | string;
  score?: ScoreResult; // 점수 배지
  children?: ItemPayload[];  // 폴더 트리 (트리 자동 렌더)
  metric?: { count: number; unit: string };  // 우측 (N lines)
  // ... + ActionName 들에 매핑되는 콜백 트리거 키들
}
```

## 함정

- 신규 탭에 `scope` 스탬프를 빠뜨리면 chip 클릭해도 안 걸러져서 빈 화면. 모든 ItemPayload 는 가능한 한 `scope` 를 가져야 함.
- `TABS` 에서 'all' 은 항상 첫 번째. 다른 위치에 추가하지 말 것.
- `bundle.en.json` 에만 키 넣고 `ko.json` 누락하면 한국어 환경에서 키가 raw 노출. 항상 parity 유지.
- DataSource.fetch 가 동기 / Promise<Group[]> 둘 다 OK. `HubProvider.sendAll` 가 `Promise.resolve()` 로 감쌈.
- `vibecodeSkills.tools` 는 ToolDef[] 배열 — 사용자가 settings 에서 직접 편집 가능. builtin: true 인 항목은 삭제 불가하게 UI 가 막음.

## MR 워크플로우

작업 완료 후:
```sh
# 1) 변경사항 확인
git status
git diff vibecode-skills-viewer/src/

# 2) 빌드 통과 확인
cd vibecode-skills-viewer && npm run build && npm run typecheck && npm run lint && cd ..

# 3) 커밋 (post-commit hook 이 'chore: auto-commit session artifacts' 로 메시지 덮어쓰니
#    중요 컨텍스트는 MR 제목/설명에)
git add -p
git commit -m "feat(skills-viewer): add Prompts tab"

# 4) MR — SSH alias 인식 안되면 GITLAB_HOST 강제
GITLAB_HOST=gitlab.ranode.net glab api --method POST \
  projects/359/merge_requests \
  -f source_branch=feat/prompts-tab \
  -f target_branch=main \
  -f title="feat(skills-viewer): add Prompts tab"
```
