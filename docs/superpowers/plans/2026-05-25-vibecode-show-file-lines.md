# vibecode-show-file-lines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VSCode sidebar tree view that ranks workspace files by line count for refactoring discovery, with `.gitignore` / `.lineignore` / `files.exclude` honored.

**Architecture:** Layered — `extension.ts` as composition root, thin `adapters/` wrapping `vscode.*`, pure `core/` for domain logic (no vscode imports), `view/` for TreeView integration. All policies (line counting, binary detection, ignore sources, view modes) are interfaces registered at composition time.

**Tech Stack:** TypeScript 5.6 (strict, ES2022, CommonJS for vscode host), VSCode API ^1.95.0, [`ignore`](https://www.npmjs.com/package/ignore) npm package for gitignore parsing, Vitest for unit tests, ESLint 9 + Prettier (matching sibling extensions).

**Spec:** [`docs/superpowers/specs/2026-05-25-vibecode-show-file-lines-design.md`](../specs/2026-05-25-vibecode-show-file-lines-design.md)

---

## Task 0: Scaffold the extension folder

**Files:**
- Create: `vibecode-show-file-lines/.gitignore`
- Create: `vibecode-show-file-lines/package.json`
- Create: `vibecode-show-file-lines/tsconfig.json`
- Create: `vibecode-show-file-lines/eslint.config.mjs`
- Create: `vibecode-show-file-lines/vitest.config.ts`
- Create: `vibecode-show-file-lines/package.nls.json`
- Create: `vibecode-show-file-lines/i18n/ko.json`
- Create: `vibecode-show-file-lines/scripts/nls-defaults.json`
- Create: `vibecode-show-file-lines/README.md`

- [ ] **Step 1: Create extension directory and .gitignore**

```bash
mkdir -p vibecode-show-file-lines/{src,scripts,i18n,l10n,tests}
```

Write `vibecode-show-file-lines/.gitignore`:

```
node_modules/
dist/
*.vsix
.vscode-test/
coverage/
```

- [ ] **Step 2: Write package.json (hand-written contributes for view + configuration; commands generated later by sync script)**

Write `vibecode-show-file-lines/package.json`:

```json
{
  "name": "vibecode-show-file-lines",
  "displayName": "%ext.displayName%",
  "description": "%ext.description%",
  "version": "0.1.0",
  "publisher": "dalsoop",
  "engines": {
    "vscode": "^1.95.0"
  },
  "l10n": "./l10n",
  "categories": ["Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension.js",
  "scripts": {
    "build": "npm run sync && tsc -p .",
    "watch": "tsc -p . -w",
    "sync": "node scripts/sync-contributions.mjs",
    "sync:check": "node scripts/sync-contributions.mjs --check",
    "typecheck": "tsc -p . --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "vscode:prepublish": "npm run build",
    "package": "npx --yes @vscode/vsce@latest package --no-dependencies --allow-missing-repository --skip-license"
  },
  "dependencies": {
    "ignore": "^5.3.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/vscode": "^1.95.0",
    "eslint": "^9.39.4",
    "prettier": "^3.8.3",
    "typescript": "^5.6.0",
    "typescript-eslint": "^8.59.4",
    "vitest": "^2.1.0"
  },
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "vibecodeShowFileLines",
          "title": "%view.container.title%",
          "icon": "$(list-ordered)"
        }
      ]
    },
    "views": {
      "vibecodeShowFileLines": [
        {
          "id": "vibecodeShowFileLines.lineRanking",
          "name": "%view.lineRanking.name%",
          "type": "tree"
        }
      ]
    },
    "configuration": {
      "title": "%ext.category%",
      "properties": {
        "vibecodeShowFileLines.topN": {
          "type": "number",
          "default": 100,
          "minimum": 1,
          "description": "%config.topN%"
        },
        "vibecodeShowFileLines.warnThreshold": {
          "type": "number",
          "default": 500,
          "minimum": 1,
          "description": "%config.warnThreshold%"
        },
        "vibecodeShowFileLines.maxFileSizeKB": {
          "type": "number",
          "default": 5120,
          "minimum": 1,
          "description": "%config.maxFileSizeKB%"
        },
        "vibecodeShowFileLines.respectGitignore": {
          "type": "boolean",
          "default": true,
          "description": "%config.respectGitignore%"
        },
        "vibecodeShowFileLines.respectFilesExclude": {
          "type": "boolean",
          "default": true,
          "description": "%config.respectFilesExclude%"
        },
        "vibecodeShowFileLines.defaultGrouping": {
          "type": "string",
          "default": "flat",
          "enum": ["flat", "byExtension"],
          "description": "%config.defaultGrouping%"
        },
        "vibecodeShowFileLines.additionalBinaryExtensions": {
          "type": "array",
          "default": [],
          "items": { "type": "string" },
          "description": "%config.additionalBinaryExtensions%"
        }
      }
    }
  }
}
```

- [ ] **Step 3: Write tsconfig.json (copy sibling structure)**

Write `vibecode-show-file-lines/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitAny": false
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Write eslint.config.mjs**

Write `vibecode-show-file-lines/eslint.config.mjs`:

```js
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '*.vsix', 'coverage/**']
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/core/**/*.ts', 'src/view/viewModes/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'vscode', message: 'core/ and viewModes/ must not import vscode at runtime' }]
      }]
    }
  }
);
```

- [ ] **Step 5: Write vitest.config.ts**

Write `vibecode-show-file-lines/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: { provider: 'v8', reporter: ['text', 'html'] }
  }
});
```

- [ ] **Step 6: Write package.nls.json + i18n seeds**

Write `vibecode-show-file-lines/package.nls.json`:

```json
{
  "ext.displayName": "Vibecode Show File Lines",
  "ext.description": "Sidebar view that ranks workspace files by line count to surface refactoring targets.",
  "ext.category": "Vibecode",
  "view.container.title": "Vibecode Show File Lines",
  "view.lineRanking.name": "Line Ranking",
  "config.topN": "Maximum files shown in the flat ranking view.",
  "config.warnThreshold": "Files at or above this line count are visually emphasized.",
  "config.maxFileSizeKB": "Files larger than this are skipped without reading.",
  "config.respectGitignore": "Honor .gitignore rules when scanning.",
  "config.respectFilesExclude": "Honor VSCode files.exclude when scanning.",
  "config.defaultGrouping": "Initial view mode: flat ranking or grouped by extension.",
  "config.additionalBinaryExtensions": "Additional file extensions to treat as binary (with leading dot, e.g. \".bin\")."
}
```

Write `vibecode-show-file-lines/scripts/nls-defaults.json` (English-only base for sync script; same as package.nls.json minus dynamic command entries):

```json
{
  "ext.displayName": "Vibecode Show File Lines",
  "ext.description": "Sidebar view that ranks workspace files by line count to surface refactoring targets.",
  "ext.category": "Vibecode",
  "view.container.title": "Vibecode Show File Lines",
  "view.lineRanking.name": "Line Ranking",
  "config.topN": "Maximum files shown in the flat ranking view.",
  "config.warnThreshold": "Files at or above this line count are visually emphasized.",
  "config.maxFileSizeKB": "Files larger than this are skipped without reading.",
  "config.respectGitignore": "Honor .gitignore rules when scanning.",
  "config.respectFilesExclude": "Honor VSCode files.exclude when scanning.",
  "config.defaultGrouping": "Initial view mode: flat ranking or grouped by extension.",
  "config.additionalBinaryExtensions": "Additional file extensions to treat as binary (with leading dot, e.g. \".bin\")."
}
```

Write `vibecode-show-file-lines/i18n/ko.json`:

```json
{
  "ext": {
    "displayName": "바이브코드 파일 라인 뷰어",
    "description": "워크스페이스 파일을 라인 수로 정렬해 리팩토링 타겟을 드러내는 사이드바 뷰.",
    "category": "바이브코드"
  },
  "view": {
    "container": { "title": "바이브코드 파일 라인" },
    "lineRanking": { "name": "라인 랭킹" }
  },
  "config": {
    "topN": "플랫 랭킹 뷰에 표시할 최대 파일 수.",
    "warnThreshold": "이 라인 수 이상의 파일은 시각적으로 강조됩니다.",
    "maxFileSizeKB": "이 크기를 초과하는 파일은 읽지 않고 건너뜁니다.",
    "respectGitignore": "스캔 시 .gitignore 규칙을 적용합니다.",
    "respectFilesExclude": "스캔 시 VSCode files.exclude 설정을 적용합니다.",
    "defaultGrouping": "초기 뷰 모드: 플랫 랭킹 또는 확장자별 그룹.",
    "additionalBinaryExtensions": "바이너리로 취급할 추가 확장자 (앞에 점, 예: \".bin\")."
  },
  "commands": {
    "refresh": "바이브코드 - 라인 랭킹 새로고침",
    "toggleView": "바이브코드 - 라인 랭킹 뷰 모드 전환",
    "openSettings": "바이브코드 - 라인 랭킹 설정 열기"
  },
  "runtime": {
    "Scanning {0} / {1} files...": "스캔 중 {0} / {1} ...",
    "Scan complete: {0} files indexed.": "스캔 완료: {0} 개 파일 인덱싱.",
    "View mode: {0}": "뷰 모드: {0}",
    "Flat ranking": "플랫 랭킹",
    "Grouped by extension": "확장자별 그룹",
    "No files indexed yet.": "아직 인덱싱된 파일이 없습니다.",
    "{0} files, {1} lines": "{0} 파일, {1} 라인"
  }
}
```

- [ ] **Step 7: Write README.md (short, matches sibling style)**

Write `vibecode-show-file-lines/README.md`:

```markdown
# Vibecode Show File Lines

A VSCode sidebar that ranks workspace files by line count so you can spot refactoring targets fast.

## What it does

- Activity Bar icon opens a tree view sorted by line count (descending).
- Toggle between a flat TOP N ranking and groups by file extension.
- Honors `.gitignore`, `.lineignore`, and `files.exclude` (each toggleable).
- Skips binary files and oversized files (configurable cap).

## Settings

All settings live under `vibecodeShowFileLines.*`. Open the Settings UI and filter by that prefix.

## Build

```bash
npm install
npm run build
```
```

- [ ] **Step 8: Install dependencies and verify clean install**

```bash
cd vibecode-show-file-lines
npm install
```

Expected: install succeeds; `node_modules/` populated; no peer-dep errors.

- [ ] **Step 9: Commit**

```bash
git add vibecode-show-file-lines/
git commit -m "feat(show-file-lines): scaffold extension folder with package.json, tsconfig, eslint, vitest, l10n seeds"
```

---

## Task 1: Constants module

**Files:**
- Create: `vibecode-show-file-lines/src/constants.ts`

- [ ] **Step 1: Write constants.ts (all invariants, IDs, seed data)**

Write `vibecode-show-file-lines/src/constants.ts`:

```ts
/**
 * Invariants. Nothing here should be tweakable at runtime (see settings for those).
 */

export const EXTENSION_ID = 'vibecodeShowFileLines';
export const VIEW_CONTAINER_ID = 'vibecodeShowFileLines';
export const VIEW_ID = 'vibecodeShowFileLines.lineRanking';

export const CMD_REFRESH = 'vibecodeShowFileLines.refresh';
export const CMD_TOGGLE_VIEW = 'vibecodeShowFileLines.toggleView';
export const CMD_OPEN_SETTINGS = 'vibecodeShowFileLines.openSettings';

export const CFG_TOP_N = 'topN';
export const CFG_WARN_THRESHOLD = 'warnThreshold';
export const CFG_MAX_FILE_SIZE_KB = 'maxFileSizeKB';
export const CFG_RESPECT_GITIGNORE = 'respectGitignore';
export const CFG_RESPECT_FILES_EXCLUDE = 'respectFilesExclude';
export const CFG_DEFAULT_GROUPING = 'defaultGrouping';
export const CFG_ADDITIONAL_BINARY_EXTS = 'additionalBinaryExtensions';

export const VIEW_MODE_FLAT = 'flat-by-lines';
export const VIEW_MODE_GROUP_EXT = 'group-by-ext';

export const IGNORE_SOURCE_GITIGNORE = 'gitignore';
export const IGNORE_SOURCE_LINEIGNORE = 'lineignore';
export const IGNORE_SOURCE_FILES_EXCLUDE = 'files-exclude';

export const LINE_COUNTER_RAW_NEWLINE = 'raw-newline';

export const LINEIGNORE_FILENAME = '.lineignore';
export const GITIGNORE_FILENAME = '.gitignore';

export const WATCH_DEBOUNCE_MS = 250;
export const BINARY_SNIFF_BYTES = 2048;

export const DEFAULT_BINARY_EXTS: readonly string[] = [
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.ico', '.webp', '.svgz',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.class', '.jar', '.war',
  '.woff', '.woff2', '.eot', '.ttf', '.otf',
  '.mp3', '.mp4', '.mov', '.avi', '.mkv', '.wav', '.flac', '.ogg', '.webm',
  '.db', '.sqlite', '.sqlite3',
  '.psd', '.ai', '.sketch', '.fig'
];
```

- [ ] **Step 2: Commit**

```bash
git add vibecode-show-file-lines/src/constants.ts
git commit -m "feat(show-file-lines): add constants module with extension/command/config IDs and binary-ext seed"
```

---

## Task 2: Domain types (interfaces)

**Files:**
- Create: `vibecode-show-file-lines/src/core/types.ts`

- [ ] **Step 1: Write core/types.ts (all interfaces declared in spec section 7.3)**

Write `vibecode-show-file-lines/src/core/types.ts`:

```ts
/**
 * Pure domain types. No vscode imports — this module must be runnable in node tests
 * without a vscode runtime. Adapters convert vscode.* values to these shapes.
 */

export interface Uri {
  readonly fsPath: string;
  toString(): string;
}

export interface Disposable {
  dispose(): void;
}

// ── Adapter boundary ───────────────────────────────────────────────

export interface IFileSystem {
  readFile(uri: Uri): Promise<Uint8Array>;
  stat(uri: Uri): Promise<{ size: number; mtime: number }>;
  findFiles(include: string, exclude?: string): AsyncIterable<Uri>;
  readTextFile(uri: Uri): Promise<string>;
}

export interface IConfigProvider {
  get<T>(key: string, fallback: T): T;
  onChange(keys: string[], cb: () => void): Disposable;
}

export interface IFileWatcher {
  watch(glob: string): {
    onCreate(cb: (uri: Uri) => void): Disposable;
    onChange(cb: (uri: Uri) => void): Disposable;
    onDelete(cb: (uri: Uri) => void): Disposable;
    dispose(): void;
  };
}

export interface ILogger {
  debug(msg: string, meta?: object): void;
  info(msg: string, meta?: object): void;
  warn(msg: string, meta?: object): void;
  error(msg: string, meta?: object): void;
}

// ── Domain policies ────────────────────────────────────────────────

export interface ILineCountStrategy {
  readonly id: string;
  count(content: Uint8Array): number;
}

export interface IBinaryDetector {
  isBinary(uri: Uri, sample: Uint8Array): boolean;
}

export interface IgnoreRule {
  readonly pattern: string;
  /** Relative to this base dir. Use workspace root for root-anchored rules. */
  readonly baseDirFsPath: string;
}

export interface IIgnoreSource {
  readonly id: string;
  readonly priority: number;
  loadRules(): Promise<IgnoreRule[]>;
  watch?(onChange: () => void): Disposable;
}

export interface IIgnoreResolver {
  isIgnored(uri: Uri): boolean;
  reload(): Promise<void>;
  onReload(cb: () => void): Disposable;
}

// ── Cache ──────────────────────────────────────────────────────────

export interface FileStat {
  uri: Uri;
  /** File extension including the dot, lower-cased; '' if none. */
  ext: string;
  lines: number;
  size: number;
  mtime: number;
}

export interface CacheChange {
  added: FileStat[];
  updated: FileStat[];
  removed: Uri[];
}

export interface ILineCache {
  get(uri: Uri): FileStat | undefined;
  upsert(stat: FileStat): void;
  remove(uri: Uri): void;
  all(): Iterable<FileStat>;
  size(): number;
  onChange(cb: (changes: CacheChange) => void): Disposable;
  clear(): void;
}

// ── View ───────────────────────────────────────────────────────────

export interface ViewCtx {
  topN: number;
  warnThreshold: number;
}

export type TreeNode = FileNode | GroupNode;

export interface FileNode {
  kind: 'file';
  stat: FileStat;
  /** True when stat.lines >= ctx.warnThreshold. */
  warn: boolean;
}

export interface GroupNode {
  kind: 'group';
  /** Group label (e.g. ".ts"). */
  label: string;
  fileCount: number;
  totalLines: number;
  children: FileNode[];
}

export interface ITreeViewMode {
  readonly id: string;
  /** l10n key resolved by the view layer. */
  readonly labelKey: string;
  build(stats: Iterable<FileStat>, ctx: ViewCtx): TreeNode[];
}

// ── Registry ───────────────────────────────────────────────────────

export interface IRegistry {
  registerViewMode(mode: ITreeViewMode): void;
  getViewMode(id: string): ITreeViewMode | undefined;
  listViewModes(): ITreeViewMode[];
  registerLineCounter(counter: ILineCountStrategy): void;
  getLineCounter(id: string): ILineCountStrategy | undefined;
  registerBinaryDetector(detector: IBinaryDetector): void;
  getBinaryDetector(): IBinaryDetector;
}
```

- [ ] **Step 2: Verify it typechecks**

```bash
cd vibecode-show-file-lines && npx tsc -p . --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add vibecode-show-file-lines/src/core/types.ts
git commit -m "feat(show-file-lines): declare core domain interfaces (no vscode dependency)"
```

---

## Task 3: Raw-newline line counter (TDD)

**Files:**
- Create: `vibecode-show-file-lines/src/core/lineCounters/rawNewlineCounter.ts`
- Create: `vibecode-show-file-lines/tests/core/lineCounters/rawNewlineCounter.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `vibecode-show-file-lines/tests/core/lineCounters/rawNewlineCounter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { RawNewlineCounter } from '../../../src/core/lineCounters/rawNewlineCounter';
import { LINE_COUNTER_RAW_NEWLINE } from '../../../src/constants';

const enc = (s: string) => new TextEncoder().encode(s);

describe('RawNewlineCounter', () => {
  const counter = new RawNewlineCounter();

  it('has stable id', () => {
    expect(counter.id).toBe(LINE_COUNTER_RAW_NEWLINE);
  });

  it('returns 0 for an empty file', () => {
    expect(counter.count(new Uint8Array())).toBe(0);
  });

  it('returns 1 for "a" with no trailing newline', () => {
    expect(counter.count(enc('a'))).toBe(1);
  });

  it('returns 1 for "a\\n"', () => {
    expect(counter.count(enc('a\n'))).toBe(1);
  });

  it('returns 3 for "a\\nb\\nc"', () => {
    expect(counter.count(enc('a\nb\nc'))).toBe(3);
  });

  it('returns 3 for "a\\nb\\nc\\n"', () => {
    expect(counter.count(enc('a\nb\nc\n'))).toBe(3);
  });

  it('counts only newlines for "\\n\\n\\n" (three empty lines)', () => {
    expect(counter.count(enc('\n\n\n'))).toBe(3);
  });

  it('treats CRLF as one line each (\\n counted, \\r ignored)', () => {
    expect(counter.count(enc('a\r\nb\r\n'))).toBe(2);
  });

  it('handles a large buffer efficiently', () => {
    const big = enc('x\n'.repeat(100000));
    expect(counter.count(big)).toBe(100000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/lineCounters/rawNewlineCounter.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement RawNewlineCounter**

Write `vibecode-show-file-lines/src/core/lineCounters/rawNewlineCounter.ts`:

```ts
import { LINE_COUNTER_RAW_NEWLINE } from '../../constants';
import type { ILineCountStrategy } from '../types';

export class RawNewlineCounter implements ILineCountStrategy {
  readonly id = LINE_COUNTER_RAW_NEWLINE;

  count(content: Uint8Array): number {
    if (content.length === 0) return 0;
    let newlines = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === 0x0a) newlines++;
    }
    const endsWithNewline = content[content.length - 1] === 0x0a;
    return endsWithNewline ? newlines : newlines + 1;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/lineCounters/rawNewlineCounter.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add vibecode-show-file-lines/src/core/lineCounters/rawNewlineCounter.ts vibecode-show-file-lines/tests/core/lineCounters/rawNewlineCounter.test.ts
git commit -m "feat(show-file-lines): RawNewlineCounter with TDD coverage"
```

---

## Task 4: Binary detector (TDD)

**Files:**
- Create: `vibecode-show-file-lines/src/core/binaryDetectors/extensionAndNullByteDetector.ts`
- Create: `vibecode-show-file-lines/tests/core/binaryDetectors/extensionAndNullByteDetector.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `vibecode-show-file-lines/tests/core/binaryDetectors/extensionAndNullByteDetector.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ExtensionAndNullByteDetector } from '../../../src/core/binaryDetectors/extensionAndNullByteDetector';
import type { Uri } from '../../../src/core/types';

const uri = (fsPath: string): Uri => ({ fsPath, toString: () => `file://${fsPath}` });
const enc = (s: string) => new TextEncoder().encode(s);

describe('ExtensionAndNullByteDetector', () => {
  it('flags known binary extension regardless of sample', () => {
    const d = new ExtensionAndNullByteDetector(['.png'], []);
    expect(d.isBinary(uri('/x/foo.png'), enc('hello'))).toBe(true);
  });

  it('respects additional extensions from settings', () => {
    const d = new ExtensionAndNullByteDetector([], ['.proto']);
    expect(d.isBinary(uri('/x/foo.proto'), enc('text'))).toBe(true);
  });

  it('matches extensions case-insensitively', () => {
    const d = new ExtensionAndNullByteDetector(['.png'], []);
    expect(d.isBinary(uri('/x/foo.PNG'), enc('hi'))).toBe(true);
  });

  it('falls back to null-byte sniff for unknown extension', () => {
    const d = new ExtensionAndNullByteDetector([], []);
    const sample = new Uint8Array([72, 101, 0, 108, 111]); // "He\0lo"
    expect(d.isBinary(uri('/x/foo.unknown'), sample)).toBe(true);
  });

  it('treats text-only sample as non-binary for unknown extension', () => {
    const d = new ExtensionAndNullByteDetector([], []);
    expect(d.isBinary(uri('/x/foo.unknown'), enc('plain text'))).toBe(false);
  });

  it('treats empty file as non-binary', () => {
    const d = new ExtensionAndNullByteDetector([], []);
    expect(d.isBinary(uri('/x/foo.txt'), new Uint8Array())).toBe(false);
  });

  it('handles file without extension via null-byte sniff', () => {
    const d = new ExtensionAndNullByteDetector(['.png'], []);
    expect(d.isBinary(uri('/x/Makefile'), enc('all:\n\techo hi'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/binaryDetectors/extensionAndNullByteDetector.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the detector**

Write `vibecode-show-file-lines/src/core/binaryDetectors/extensionAndNullByteDetector.ts`:

```ts
import * as path from 'path';
import type { IBinaryDetector, Uri } from '../types';

export class ExtensionAndNullByteDetector implements IBinaryDetector {
  private readonly extSet: Set<string>;

  constructor(
    seedExtensions: readonly string[],
    additionalExtensions: readonly string[]
  ) {
    this.extSet = new Set(
      [...seedExtensions, ...additionalExtensions].map(e => e.toLowerCase())
    );
  }

  isBinary(uri: Uri, sample: Uint8Array): boolean {
    const ext = path.extname(uri.fsPath).toLowerCase();
    if (ext && this.extSet.has(ext)) return true;
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) return true;
    }
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/binaryDetectors/extensionAndNullByteDetector.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add vibecode-show-file-lines/src/core/binaryDetectors vibecode-show-file-lines/tests/core/binaryDetectors
git commit -m "feat(show-file-lines): ExtensionAndNullByteDetector with TDD coverage"
```

---

## Task 5: In-memory line cache (TDD)

**Files:**
- Create: `vibecode-show-file-lines/src/core/cache.ts`
- Create: `vibecode-show-file-lines/tests/core/cache.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `vibecode-show-file-lines/tests/core/cache.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { InMemoryLineCache } from '../../src/core/cache';
import type { FileStat, Uri } from '../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });
const stat = (p: string, lines: number): FileStat => ({
  uri: uri(p), ext: '.ts', lines, size: 100, mtime: 1
});

describe('InMemoryLineCache', () => {
  it('starts empty', () => {
    const c = new InMemoryLineCache();
    expect(c.size()).toBe(0);
    expect([...c.all()]).toEqual([]);
  });

  it('upsert + get round-trips', () => {
    const c = new InMemoryLineCache();
    const s = stat('/a.ts', 42);
    c.upsert(s);
    expect(c.get(uri('/a.ts'))).toEqual(s);
  });

  it('emits added event on first upsert', () => {
    const c = new InMemoryLineCache();
    const cb = vi.fn();
    c.onChange(cb);
    c.upsert(stat('/a.ts', 1));
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({
      added: [expect.objectContaining({ lines: 1 })],
      updated: [],
      removed: []
    }));
  });

  it('emits updated event on second upsert with same uri', () => {
    const c = new InMemoryLineCache();
    c.upsert(stat('/a.ts', 1));
    const cb = vi.fn();
    c.onChange(cb);
    c.upsert(stat('/a.ts', 2));
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({
      added: [],
      updated: [expect.objectContaining({ lines: 2 })],
      removed: []
    }));
  });

  it('emits removed event on remove of present uri', () => {
    const c = new InMemoryLineCache();
    c.upsert(stat('/a.ts', 1));
    const cb = vi.fn();
    c.onChange(cb);
    c.remove(uri('/a.ts'));
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({
      added: [], updated: [],
      removed: [expect.objectContaining({ fsPath: '/a.ts' })]
    }));
    expect(c.size()).toBe(0);
  });

  it('remove of absent uri is a no-op and emits nothing', () => {
    const c = new InMemoryLineCache();
    const cb = vi.fn();
    c.onChange(cb);
    c.remove(uri('/missing.ts'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('clear empties the cache and emits removed for all entries', () => {
    const c = new InMemoryLineCache();
    c.upsert(stat('/a.ts', 1));
    c.upsert(stat('/b.ts', 2));
    const cb = vi.fn();
    c.onChange(cb);
    c.clear();
    expect(c.size()).toBe(0);
    expect(cb).toHaveBeenCalledOnce();
    const arg = cb.mock.calls[0][0];
    expect(arg.removed).toHaveLength(2);
  });

  it('dispose unsubscribes the listener', () => {
    const c = new InMemoryLineCache();
    const cb = vi.fn();
    const sub = c.onChange(cb);
    sub.dispose();
    c.upsert(stat('/a.ts', 1));
    expect(cb).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/cache.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement InMemoryLineCache**

Write `vibecode-show-file-lines/src/core/cache.ts`:

```ts
import type { CacheChange, Disposable, FileStat, ILineCache, Uri } from './types';

export class InMemoryLineCache implements ILineCache {
  private readonly store = new Map<string, FileStat>();
  private readonly listeners = new Set<(c: CacheChange) => void>();

  get(uri: Uri): FileStat | undefined {
    return this.store.get(uri.fsPath);
  }

  upsert(stat: FileStat): void {
    const key = stat.uri.fsPath;
    const existed = this.store.has(key);
    this.store.set(key, stat);
    this.emit({
      added: existed ? [] : [stat],
      updated: existed ? [stat] : [],
      removed: []
    });
  }

  remove(uri: Uri): void {
    const key = uri.fsPath;
    if (!this.store.has(key)) return;
    this.store.delete(key);
    this.emit({ added: [], updated: [], removed: [uri] });
  }

  clear(): void {
    if (this.store.size === 0) return;
    const removed = [...this.store.values()].map(s => s.uri);
    this.store.clear();
    this.emit({ added: [], updated: [], removed });
  }

  all(): Iterable<FileStat> {
    return this.store.values();
  }

  size(): number {
    return this.store.size;
  }

  onChange(cb: (c: CacheChange) => void): Disposable {
    this.listeners.add(cb);
    return { dispose: () => this.listeners.delete(cb) };
  }

  private emit(change: CacheChange): void {
    for (const l of this.listeners) l(change);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/cache.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add vibecode-show-file-lines/src/core/cache.ts vibecode-show-file-lines/tests/core/cache.test.ts
git commit -m "feat(show-file-lines): InMemoryLineCache with change events and TDD coverage"
```

---

## Task 6: Ignore sources (TDD)

**Files:**
- Create: `vibecode-show-file-lines/src/core/ignoreSources/gitignoreSource.ts`
- Create: `vibecode-show-file-lines/src/core/ignoreSources/lineignoreSource.ts`
- Create: `vibecode-show-file-lines/src/core/ignoreSources/filesExcludeSource.ts`
- Create: `vibecode-show-file-lines/tests/core/ignoreSources/gitignoreSource.test.ts`
- Create: `vibecode-show-file-lines/tests/core/ignoreSources/lineignoreSource.test.ts`
- Create: `vibecode-show-file-lines/tests/core/ignoreSources/filesExcludeSource.test.ts`

Each source's only responsibility is to load `IgnoreRule[]` from its respective source. Composition is handled by `IgnoreResolver` in Task 7. The sources share a small file-based loader for the two file-backed sources (.gitignore, .lineignore) — keep that as a tiny helper rather than its own interface (YAGNI).

- [ ] **Step 1: Write the failing tests for gitignoreSource**

Write `vibecode-show-file-lines/tests/core/ignoreSources/gitignoreSource.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { GitignoreSource } from '../../../src/core/ignoreSources/gitignoreSource';
import { IGNORE_SOURCE_GITIGNORE } from '../../../src/constants';
import type { IFileSystem, Uri } from '../../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });

function mockFs(files: Record<string, string>): IFileSystem {
  return {
    readTextFile: vi.fn(async (u: Uri) => {
      if (files[u.fsPath] === undefined) throw new Error('ENOENT');
      return files[u.fsPath];
    }),
    readFile: vi.fn(),
    stat: vi.fn(),
    findFiles: vi.fn()
  } as unknown as IFileSystem;
}

describe('GitignoreSource', () => {
  it('has stable id and priority', () => {
    const src = new GitignoreSource('/root', mockFs({}));
    expect(src.id).toBe(IGNORE_SOURCE_GITIGNORE);
    expect(typeof src.priority).toBe('number');
  });

  it('returns empty rule set when no .gitignore exists', async () => {
    const src = new GitignoreSource('/root', mockFs({}));
    expect(await src.loadRules()).toEqual([]);
  });

  it('parses .gitignore at workspace root, skipping comments and blanks', async () => {
    const fs = mockFs({ '/root/.gitignore': 'node_modules\n# comment\n\ndist\n' });
    const src = new GitignoreSource('/root', fs);
    const rules = await src.loadRules();
    expect(rules.map(r => r.pattern)).toEqual(['node_modules', 'dist']);
    expect(rules.every(r => r.baseDirFsPath === '/root')).toBe(true);
  });
});
```

- [ ] **Step 2: Write the failing tests for lineignoreSource**

Write `vibecode-show-file-lines/tests/core/ignoreSources/lineignoreSource.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { LineignoreSource } from '../../../src/core/ignoreSources/lineignoreSource';
import { IGNORE_SOURCE_LINEIGNORE } from '../../../src/constants';
import type { IFileSystem, Uri } from '../../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });

function mockFs(files: Record<string, string>): IFileSystem {
  return {
    readTextFile: vi.fn(async (u: Uri) => {
      if (files[u.fsPath] === undefined) throw new Error('ENOENT');
      return files[u.fsPath];
    }),
    readFile: vi.fn(), stat: vi.fn(), findFiles: vi.fn()
  } as unknown as IFileSystem;
}

describe('LineignoreSource', () => {
  it('has stable id', () => {
    const src = new LineignoreSource('/root', mockFs({}));
    expect(src.id).toBe(IGNORE_SOURCE_LINEIGNORE);
  });

  it('returns empty when .lineignore is absent', async () => {
    const src = new LineignoreSource('/root', mockFs({}));
    expect(await src.loadRules()).toEqual([]);
  });

  it('reads .lineignore patterns relative to workspace root', async () => {
    const fs = mockFs({ '/root/.lineignore': '*.snap\nvendor/\n' });
    const src = new LineignoreSource('/root', fs);
    const rules = await src.loadRules();
    expect(rules.map(r => r.pattern)).toEqual(['*.snap', 'vendor/']);
    expect(rules.every(r => r.baseDirFsPath === '/root')).toBe(true);
  });
});
```

- [ ] **Step 3: Write the failing tests for filesExcludeSource**

Write `vibecode-show-file-lines/tests/core/ignoreSources/filesExcludeSource.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FilesExcludeSource } from '../../../src/core/ignoreSources/filesExcludeSource';
import { IGNORE_SOURCE_FILES_EXCLUDE } from '../../../src/constants';
import type { IConfigProvider, Disposable } from '../../../src/core/types';

function mockConfig(values: Record<string, unknown>): IConfigProvider {
  return {
    get: <T,>(key: string, fallback: T) => (values[key] as T) ?? fallback,
    onChange: (_keys: string[], _cb: () => void): Disposable => ({ dispose() {} })
  };
}

describe('FilesExcludeSource', () => {
  it('has stable id', () => {
    const src = new FilesExcludeSource('/root', mockConfig({}));
    expect(src.id).toBe(IGNORE_SOURCE_FILES_EXCLUDE);
  });

  it('returns empty when files.exclude is empty', async () => {
    const src = new FilesExcludeSource('/root', mockConfig({ 'files.exclude': {} }));
    expect(await src.loadRules()).toEqual([]);
  });

  it('includes only keys whose value is true', async () => {
    const src = new FilesExcludeSource('/root', mockConfig({
      'files.exclude': { '**/.DS_Store': true, '**/Thumbs.db': false, 'node_modules': true }
    }));
    const rules = await src.loadRules();
    expect(rules.map(r => r.pattern).sort()).toEqual(['**/.DS_Store', 'node_modules']);
    expect(rules.every(r => r.baseDirFsPath === '/root')).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/ignoreSources/
```

Expected: FAIL — modules not found.

- [ ] **Step 5: Implement GitignoreSource**

Write `vibecode-show-file-lines/src/core/ignoreSources/gitignoreSource.ts`:

```ts
import * as path from 'path';
import { GITIGNORE_FILENAME, IGNORE_SOURCE_GITIGNORE } from '../../constants';
import type { Disposable, IFileSystem, IIgnoreSource, IgnoreRule, Uri } from '../types';

export class GitignoreSource implements IIgnoreSource {
  readonly id = IGNORE_SOURCE_GITIGNORE;
  readonly priority = 20;

  constructor(
    private readonly workspaceRoot: string,
    private readonly fs: IFileSystem
  ) {}

  async loadRules(): Promise<IgnoreRule[]> {
    const filePath = path.join(this.workspaceRoot, GITIGNORE_FILENAME);
    const uri: Uri = { fsPath: filePath, toString: () => `file://${filePath}` };
    let text: string;
    try {
      text = await this.fs.readTextFile(uri);
    } catch {
      return [];
    }
    return parseGitignoreText(text, this.workspaceRoot);
  }
}

export function parseGitignoreText(text: string, baseDirFsPath: string): IgnoreRule[] {
  const out: IgnoreRule[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    out.push({ pattern: line, baseDirFsPath });
  }
  return out;
}
```

- [ ] **Step 6: Implement LineignoreSource**

Write `vibecode-show-file-lines/src/core/ignoreSources/lineignoreSource.ts`:

```ts
import * as path from 'path';
import { IGNORE_SOURCE_LINEIGNORE, LINEIGNORE_FILENAME } from '../../constants';
import { parseGitignoreText } from './gitignoreSource';
import type { IFileSystem, IIgnoreSource, IgnoreRule, Uri } from '../types';

export class LineignoreSource implements IIgnoreSource {
  readonly id = IGNORE_SOURCE_LINEIGNORE;
  readonly priority = 10;

  constructor(
    private readonly workspaceRoot: string,
    private readonly fs: IFileSystem
  ) {}

  async loadRules(): Promise<IgnoreRule[]> {
    const filePath = path.join(this.workspaceRoot, LINEIGNORE_FILENAME);
    const uri: Uri = { fsPath: filePath, toString: () => `file://${filePath}` };
    try {
      const text = await this.fs.readTextFile(uri);
      return parseGitignoreText(text, this.workspaceRoot);
    } catch {
      return [];
    }
  }
}
```

- [ ] **Step 7: Implement FilesExcludeSource**

Write `vibecode-show-file-lines/src/core/ignoreSources/filesExcludeSource.ts`:

```ts
import { IGNORE_SOURCE_FILES_EXCLUDE } from '../../constants';
import type { IConfigProvider, IIgnoreSource, IgnoreRule } from '../types';

export class FilesExcludeSource implements IIgnoreSource {
  readonly id = IGNORE_SOURCE_FILES_EXCLUDE;
  readonly priority = 30;

  constructor(
    private readonly workspaceRoot: string,
    private readonly config: IConfigProvider
  ) {}

  async loadRules(): Promise<IgnoreRule[]> {
    const map = this.config.get<Record<string, boolean>>('files.exclude', {});
    const rules: IgnoreRule[] = [];
    for (const [pattern, on] of Object.entries(map)) {
      if (on === true) rules.push({ pattern, baseDirFsPath: this.workspaceRoot });
    }
    return rules;
  }
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/ignoreSources/
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add vibecode-show-file-lines/src/core/ignoreSources vibecode-show-file-lines/tests/core/ignoreSources
git commit -m "feat(show-file-lines): gitignore/lineignore/files.exclude ignore sources with TDD coverage"
```

---

## Task 7: IgnoreResolver (TDD)

**Files:**
- Create: `vibecode-show-file-lines/src/core/ignoreResolver.ts`
- Create: `vibecode-show-file-lines/tests/core/ignoreResolver.test.ts`

`IgnoreResolver` composes the active `IIgnoreSource[]`, builds a single `ignore` matcher per base directory, and exposes `isIgnored(uri)`. It also offers `reload()` and an `onReload` event so the scanner/tree can react.

- [ ] **Step 1: Write the failing tests**

Write `vibecode-show-file-lines/tests/core/ignoreResolver.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { IgnoreResolver } from '../../src/core/ignoreResolver';
import type { IIgnoreSource, IgnoreRule, Uri } from '../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });

function source(id: string, priority: number, rules: IgnoreRule[]): IIgnoreSource {
  return {
    id, priority,
    loadRules: vi.fn(async () => rules)
  };
}

describe('IgnoreResolver', () => {
  it('returns false for any uri before reload()', () => {
    const r = new IgnoreResolver('/root', []);
    expect(r.isIgnored(uri('/root/a.ts'))).toBe(false);
  });

  it('matches a simple pattern from a single source after reload', async () => {
    const r = new IgnoreResolver('/root', [
      source('s1', 10, [{ pattern: 'node_modules', baseDirFsPath: '/root' }])
    ]);
    await r.reload();
    expect(r.isIgnored(uri('/root/node_modules/foo.js'))).toBe(true);
    expect(r.isIgnored(uri('/root/src/foo.ts'))).toBe(false);
  });

  it('a file is ignored if ANY active source ignores it (union semantics)', async () => {
    const r = new IgnoreResolver('/root', [
      source('a', 10, [{ pattern: 'dist', baseDirFsPath: '/root' }]),
      source('b', 20, [{ pattern: '*.snap', baseDirFsPath: '/root' }])
    ]);
    await r.reload();
    expect(r.isIgnored(uri('/root/dist/x.js'))).toBe(true);
    expect(r.isIgnored(uri('/root/x.snap'))).toBe(true);
    expect(r.isIgnored(uri('/root/src/main.ts'))).toBe(false);
  });

  it('reload() refreshes rules from sources', async () => {
    let current: IgnoreRule[] = [{ pattern: 'a', baseDirFsPath: '/root' }];
    const src: IIgnoreSource = {
      id: 's', priority: 10,
      loadRules: async () => current
    };
    const r = new IgnoreResolver('/root', [src]);
    await r.reload();
    expect(r.isIgnored(uri('/root/a/x'))).toBe(true);
    current = [{ pattern: 'b', baseDirFsPath: '/root' }];
    await r.reload();
    expect(r.isIgnored(uri('/root/a/x'))).toBe(false);
    expect(r.isIgnored(uri('/root/b/y'))).toBe(true);
  });

  it('emits onReload after reload completes', async () => {
    const r = new IgnoreResolver('/root', []);
    const cb = vi.fn();
    r.onReload(cb);
    await r.reload();
    expect(cb).toHaveBeenCalledOnce();
  });

  it('files outside workspaceRoot are never ignored', async () => {
    const r = new IgnoreResolver('/root', [
      source('s', 10, [{ pattern: '*', baseDirFsPath: '/root' }])
    ]);
    await r.reload();
    expect(r.isIgnored(uri('/other/x.ts'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/ignoreResolver.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement IgnoreResolver**

Write `vibecode-show-file-lines/src/core/ignoreResolver.ts`:

```ts
import * as path from 'path';
import ignore, { type Ignore } from 'ignore';
import type { Disposable, IIgnoreResolver, IIgnoreSource, Uri } from './types';

export class IgnoreResolver implements IIgnoreResolver {
  /** Map of baseDirFsPath -> compiled ignore matcher. */
  private matchers = new Map<string, Ignore>();
  private listeners = new Set<() => void>();

  constructor(
    private readonly workspaceRoot: string,
    private readonly sources: readonly IIgnoreSource[]
  ) {}

  isIgnored(uri: Uri): boolean {
    const rel = path.relative(this.workspaceRoot, uri.fsPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
    const matcher = this.matchers.get(this.workspaceRoot);
    if (!matcher) return false;
    return matcher.ignores(toPosix(rel));
  }

  async reload(): Promise<void> {
    const grouped = new Map<string, string[]>();
    const ordered = [...this.sources].sort((a, b) => a.priority - b.priority);
    for (const src of ordered) {
      const rules = await src.loadRules();
      for (const r of rules) {
        const bucket = grouped.get(r.baseDirFsPath) ?? [];
        bucket.push(r.pattern);
        grouped.set(r.baseDirFsPath, bucket);
      }
    }
    const next = new Map<string, Ignore>();
    for (const [base, patterns] of grouped) {
      next.set(base, ignore().add(patterns));
    }
    this.matchers = next;
    for (const l of this.listeners) l();
  }

  onReload(cb: () => void): Disposable {
    this.listeners.add(cb);
    return { dispose: () => this.listeners.delete(cb) };
  }
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/ignoreResolver.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add vibecode-show-file-lines/src/core/ignoreResolver.ts vibecode-show-file-lines/tests/core/ignoreResolver.test.ts
git commit -m "feat(show-file-lines): IgnoreResolver composes ignore sources with union semantics"
```

---

## Task 8: Scanner (TDD)

**Files:**
- Create: `vibecode-show-file-lines/src/core/scanner.ts`
- Create: `vibecode-show-file-lines/tests/core/scanner.test.ts`

The scanner walks files via `IFileSystem.findFiles`, skips ignored / oversized / binary files, computes line counts, and upserts into the cache.

- [ ] **Step 1: Write the failing tests**

Write `vibecode-show-file-lines/tests/core/scanner.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { Scanner } from '../../src/core/scanner';
import { InMemoryLineCache } from '../../src/core/cache';
import { RawNewlineCounter } from '../../src/core/lineCounters/rawNewlineCounter';
import { ExtensionAndNullByteDetector } from '../../src/core/binaryDetectors/extensionAndNullByteDetector';
import type { IFileSystem, IIgnoreResolver, ILogger, Uri } from '../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });
const enc = (s: string) => new TextEncoder().encode(s);

function makeFs(files: Record<string, { content: Uint8Array; size: number; mtime: number }>): IFileSystem {
  return {
    async *findFiles(_inc: string, _exc?: string) {
      for (const k of Object.keys(files)) yield uri(k);
    },
    async stat(u: Uri) { return { size: files[u.fsPath].size, mtime: files[u.fsPath].mtime }; },
    async readFile(u: Uri) { return files[u.fsPath].content; },
    async readTextFile(u: Uri) { return new TextDecoder().decode(files[u.fsPath].content); }
  };
}

const ignoreNone: IIgnoreResolver = {
  isIgnored: () => false, reload: async () => {}, onReload: () => ({ dispose() {} })
};
const ignoreAll: IIgnoreResolver = {
  isIgnored: () => true, reload: async () => {}, onReload: () => ({ dispose() {} })
};
const silentLogger: ILogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

describe('Scanner', () => {
  it('indexes a single text file', async () => {
    const cache = new InMemoryLineCache();
    const fs = makeFs({ '/r/a.ts': { content: enc('one\ntwo\n'), size: 8, mtime: 1 } });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    await scanner.scanAll();
    expect(cache.size()).toBe(1);
    expect(cache.get(uri('/r/a.ts'))?.lines).toBe(2);
    expect(cache.get(uri('/r/a.ts'))?.ext).toBe('.ts');
  });

  it('invokes onProgress for every processed file', async () => {
    const cache = new InMemoryLineCache();
    const fs = makeFs({
      '/r/a.ts': { content: enc('x'), size: 1, mtime: 1 },
      '/r/b.ts': { content: enc('y'), size: 1, mtime: 1 }
    });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    const onProgress = vi.fn();
    await scanner.scanAll({ onProgress });
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });

  it('skips ignored files', async () => {
    const cache = new InMemoryLineCache();
    const fs = makeFs({ '/r/a.ts': { content: enc('x'), size: 1, mtime: 1 } });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreAll,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    await scanner.scanAll();
    expect(cache.size()).toBe(0);
  });

  it('skips files larger than the size cap without reading them', async () => {
    const cache = new InMemoryLineCache();
    const readFile = vi.fn(async () => enc('big'));
    const fs: IFileSystem = {
      async *findFiles() { yield uri('/r/big.bin'); },
      async stat() { return { size: 99999, mtime: 1 }; },
      readFile, readTextFile: async () => 'big'
    };
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 100, logger: silentLogger
    });
    await scanner.scanAll();
    expect(cache.size()).toBe(0);
    expect(readFile).not.toHaveBeenCalled();
  });

  it('skips binary files detected by extension', async () => {
    const cache = new InMemoryLineCache();
    const fs = makeFs({ '/r/img.png': { content: enc('not really png'), size: 14, mtime: 1 } });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector(['.png'], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    await scanner.scanAll();
    expect(cache.size()).toBe(0);
  });

  it('skips binary files detected by null byte', async () => {
    const cache = new InMemoryLineCache();
    const sample = new Uint8Array([65, 0, 66]);
    const fs = makeFs({ '/r/x.unknown': { content: sample, size: 3, mtime: 1 } });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    await scanner.scanAll();
    expect(cache.size()).toBe(0);
  });

  it('rescanOne re-counts a single uri', async () => {
    const cache = new InMemoryLineCache();
    const fs = makeFs({ '/r/a.ts': { content: enc('one\ntwo\n'), size: 8, mtime: 1 } });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    await scanner.rescanOne(uri('/r/a.ts'));
    expect(cache.get(uri('/r/a.ts'))?.lines).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/scanner.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Scanner**

Write `vibecode-show-file-lines/src/core/scanner.ts`:

```ts
import * as path from 'path';
import { BINARY_SNIFF_BYTES } from '../constants';
import type {
  IBinaryDetector, IFileSystem, IIgnoreResolver, ILineCache,
  ILineCountStrategy, ILogger, Uri
} from './types';

export interface ScannerDeps {
  fs: IFileSystem;
  cache: ILineCache;
  ignoreResolver: IIgnoreResolver;
  lineCounter: ILineCountStrategy;
  binaryDetector: IBinaryDetector;
  maxFileSizeBytes: number;
  logger: ILogger;
}

export interface ScanOptions {
  onProgress?: (done: number, total: number) => void;
}

export class Scanner {
  constructor(private readonly deps: ScannerDeps) {}

  async scanAll(opts: ScanOptions = {}): Promise<void> {
    const { fs } = this.deps;
    const uris: Uri[] = [];
    for await (const u of fs.findFiles('**/*')) uris.push(u);
    let done = 0;
    for (const u of uris) {
      await this.processOne(u);
      done++;
      opts.onProgress?.(done, uris.length);
    }
  }

  async rescanOne(uri: Uri): Promise<void> {
    await this.processOne(uri);
  }

  private async processOne(uri: Uri): Promise<void> {
    const { fs, cache, ignoreResolver, lineCounter, binaryDetector, maxFileSizeBytes, logger } = this.deps;
    try {
      if (ignoreResolver.isIgnored(uri)) {
        cache.remove(uri);
        return;
      }
      const stat = await fs.stat(uri);
      if (stat.size > maxFileSizeBytes) {
        cache.remove(uri);
        return;
      }
      const content = await fs.readFile(uri);
      const sample = content.length > BINARY_SNIFF_BYTES
        ? content.subarray(0, BINARY_SNIFF_BYTES)
        : content;
      if (binaryDetector.isBinary(uri, sample)) {
        cache.remove(uri);
        return;
      }
      const lines = lineCounter.count(content);
      cache.upsert({
        uri, ext: path.extname(uri.fsPath).toLowerCase(),
        lines, size: stat.size, mtime: stat.mtime
      });
    } catch (err) {
      logger.warn('scan failed', { fsPath: uri.fsPath, err: String(err) });
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/scanner.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add vibecode-show-file-lines/src/core/scanner.ts vibecode-show-file-lines/tests/core/scanner.test.ts
git commit -m "feat(show-file-lines): Scanner with ignore/size/binary skip rules and TDD coverage"
```

---

## Task 9: View modes (TDD)

**Files:**
- Create: `vibecode-show-file-lines/src/view/viewModes/flatByLines.ts`
- Create: `vibecode-show-file-lines/src/view/viewModes/groupByExtension.ts`
- Create: `vibecode-show-file-lines/tests/view/viewModes/flatByLines.test.ts`
- Create: `vibecode-show-file-lines/tests/view/viewModes/groupByExtension.test.ts`

These are pure functions over `FileStat[]` — no vscode imports.

- [ ] **Step 1: Write failing tests for flatByLines**

Write `vibecode-show-file-lines/tests/view/viewModes/flatByLines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FlatByLines } from '../../../src/view/viewModes/flatByLines';
import { VIEW_MODE_FLAT } from '../../../src/constants';
import type { FileStat, Uri } from '../../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });
const stat = (p: string, lines: number, ext = '.ts'): FileStat =>
  ({ uri: uri(p), ext, lines, size: 100, mtime: 1 });

describe('FlatByLines', () => {
  const mode = new FlatByLines();

  it('id matches constant', () => {
    expect(mode.id).toBe(VIEW_MODE_FLAT);
  });

  it('sorts files descending by lines', () => {
    const nodes = mode.build(
      [stat('/a', 10), stat('/b', 100), stat('/c', 50)],
      { topN: 10, warnThreshold: 500 }
    );
    expect(nodes).toHaveLength(3);
    expect(nodes.map(n => (n.kind === 'file' ? n.stat.uri.fsPath : '')))
      .toEqual(['/b', '/c', '/a']);
  });

  it('truncates to topN', () => {
    const stats = [stat('/a', 1), stat('/b', 2), stat('/c', 3), stat('/d', 4)];
    const nodes = mode.build(stats, { topN: 2, warnThreshold: 500 });
    expect(nodes).toHaveLength(2);
    expect(nodes[0].kind === 'file' && nodes[0].stat.lines).toBe(4);
    expect(nodes[1].kind === 'file' && nodes[1].stat.lines).toBe(3);
  });

  it('marks files at/above warnThreshold with warn=true', () => {
    const nodes = mode.build([stat('/a', 500), stat('/b', 499)], { topN: 10, warnThreshold: 500 });
    expect(nodes[0].kind === 'file' && nodes[0].warn).toBe(true);
    expect(nodes[1].kind === 'file' && nodes[1].warn).toBe(false);
  });

  it('returns empty array for empty input', () => {
    expect(mode.build([], { topN: 10, warnThreshold: 500 })).toEqual([]);
  });
});
```

- [ ] **Step 2: Write failing tests for groupByExtension**

Write `vibecode-show-file-lines/tests/view/viewModes/groupByExtension.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GroupByExtension } from '../../../src/view/viewModes/groupByExtension';
import { VIEW_MODE_GROUP_EXT } from '../../../src/constants';
import type { FileStat, Uri, GroupNode } from '../../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });
const stat = (p: string, lines: number, ext: string): FileStat =>
  ({ uri: uri(p), ext, lines, size: 100, mtime: 1 });

describe('GroupByExtension', () => {
  const mode = new GroupByExtension();

  it('id matches constant', () => {
    expect(mode.id).toBe(VIEW_MODE_GROUP_EXT);
  });

  it('groups files by extension and computes counts/totals', () => {
    const nodes = mode.build([
      stat('/a.ts', 10, '.ts'), stat('/b.ts', 20, '.ts'),
      stat('/c.md', 5, '.md')
    ], { topN: 100, warnThreshold: 500 });
    expect(nodes).toHaveLength(2);
    const tsGroup = nodes.find(n => n.kind === 'group' && n.label === '.ts') as GroupNode;
    expect(tsGroup.fileCount).toBe(2);
    expect(tsGroup.totalLines).toBe(30);
    expect(tsGroup.children.map(c => c.stat.lines)).toEqual([20, 10]);
  });

  it('sorts groups by total lines descending', () => {
    const nodes = mode.build([
      stat('/a.md', 1, '.md'),
      stat('/b.ts', 100, '.ts'),
      stat('/c.json', 50, '.json')
    ], { topN: 100, warnThreshold: 500 });
    expect(nodes.map(n => n.kind === 'group' ? n.label : '')).toEqual(['.ts', '.json', '.md']);
  });

  it('uses "(no extension)" label for empty ext', () => {
    const nodes = mode.build([stat('/Makefile', 7, '')], { topN: 100, warnThreshold: 500 });
    expect(nodes[0].kind === 'group' && nodes[0].label).toBe('(no extension)');
  });

  it('does not apply topN inside groups (topN is a flat-mode concept)', () => {
    const many: FileStat[] = [];
    for (let i = 0; i < 5; i++) many.push(stat(`/f${i}.ts`, i + 1, '.ts'));
    const nodes = mode.build(many, { topN: 2, warnThreshold: 500 });
    const ts = nodes[0] as GroupNode;
    expect(ts.children).toHaveLength(5);
  });

  it('marks warn correctly inside groups', () => {
    const nodes = mode.build([stat('/a.ts', 500, '.ts'), stat('/b.ts', 1, '.ts')], { topN: 100, warnThreshold: 500 });
    const g = nodes[0] as GroupNode;
    expect(g.children[0].warn).toBe(true);
    expect(g.children[1].warn).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd vibecode-show-file-lines && npx vitest run tests/view/viewModes/
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Implement FlatByLines**

Write `vibecode-show-file-lines/src/view/viewModes/flatByLines.ts`:

```ts
import { VIEW_MODE_FLAT } from '../../constants';
import type { FileStat, ITreeViewMode, TreeNode, ViewCtx } from '../../core/types';

export class FlatByLines implements ITreeViewMode {
  readonly id = VIEW_MODE_FLAT;
  readonly labelKey = 'view.mode.flat';

  build(stats: Iterable<FileStat>, ctx: ViewCtx): TreeNode[] {
    const sorted = [...stats].sort((a, b) => b.lines - a.lines).slice(0, ctx.topN);
    return sorted.map(s => ({
      kind: 'file' as const,
      stat: s,
      warn: s.lines >= ctx.warnThreshold
    }));
  }
}
```

- [ ] **Step 5: Implement GroupByExtension**

Write `vibecode-show-file-lines/src/view/viewModes/groupByExtension.ts`:

```ts
import { VIEW_MODE_GROUP_EXT } from '../../constants';
import type { FileNode, FileStat, GroupNode, ITreeViewMode, TreeNode, ViewCtx } from '../../core/types';

const NO_EXT_LABEL = '(no extension)';

export class GroupByExtension implements ITreeViewMode {
  readonly id = VIEW_MODE_GROUP_EXT;
  readonly labelKey = 'view.mode.groupByExtension';

  build(stats: Iterable<FileStat>, ctx: ViewCtx): TreeNode[] {
    const buckets = new Map<string, FileStat[]>();
    for (const s of stats) {
      const key = s.ext === '' ? NO_EXT_LABEL : s.ext;
      const bucket = buckets.get(key) ?? [];
      bucket.push(s);
      buckets.set(key, bucket);
    }
    const groups: GroupNode[] = [];
    for (const [label, items] of buckets) {
      items.sort((a, b) => b.lines - a.lines);
      const children: FileNode[] = items.map(s => ({
        kind: 'file' as const,
        stat: s,
        warn: s.lines >= ctx.warnThreshold
      }));
      const totalLines = items.reduce((acc, s) => acc + s.lines, 0);
      groups.push({
        kind: 'group',
        label,
        fileCount: items.length,
        totalLines,
        children
      });
    }
    groups.sort((a, b) => b.totalLines - a.totalLines);
    return groups;
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd vibecode-show-file-lines && npx vitest run tests/view/viewModes/
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add vibecode-show-file-lines/src/view/viewModes vibecode-show-file-lines/tests/view/viewModes
git commit -m "feat(show-file-lines): FlatByLines + GroupByExtension view modes with TDD coverage"
```

---

## Task 10: Registry

**Files:**
- Create: `vibecode-show-file-lines/src/core/registry.ts`
- Create: `vibecode-show-file-lines/tests/core/registry.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `vibecode-show-file-lines/tests/core/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Registry } from '../../src/core/registry';
import type {
  IBinaryDetector, ILineCountStrategy, ITreeViewMode, FileStat, ViewCtx, TreeNode, Uri
} from '../../src/core/types';

const mode = (id: string): ITreeViewMode => ({
  id, labelKey: `lbl.${id}`,
  build: (_s: Iterable<FileStat>, _c: ViewCtx): TreeNode[] => []
});
const counter = (id: string): ILineCountStrategy => ({ id, count: () => 0 });
const detector: IBinaryDetector = { isBinary: () => false };

describe('Registry', () => {
  it('throws when reading binary detector before registration', () => {
    const r = new Registry();
    expect(() => r.getBinaryDetector()).toThrow();
  });

  it('registers and retrieves view modes by id', () => {
    const r = new Registry();
    r.registerViewMode(mode('m1'));
    r.registerViewMode(mode('m2'));
    expect(r.getViewMode('m1')?.id).toBe('m1');
    expect(r.getViewMode('m2')?.id).toBe('m2');
    expect(r.getViewMode('missing')).toBeUndefined();
  });

  it('lists view modes in registration order', () => {
    const r = new Registry();
    r.registerViewMode(mode('a'));
    r.registerViewMode(mode('b'));
    expect(r.listViewModes().map(m => m.id)).toEqual(['a', 'b']);
  });

  it('registers and retrieves line counters by id', () => {
    const r = new Registry();
    r.registerLineCounter(counter('raw'));
    expect(r.getLineCounter('raw')?.id).toBe('raw');
  });

  it('registers and retrieves binary detector', () => {
    const r = new Registry();
    r.registerBinaryDetector(detector);
    expect(r.getBinaryDetector()).toBe(detector);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/registry.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Registry**

Write `vibecode-show-file-lines/src/core/registry.ts`:

```ts
import type { IBinaryDetector, ILineCountStrategy, IRegistry, ITreeViewMode } from './types';

export class Registry implements IRegistry {
  private viewModes: ITreeViewMode[] = [];
  private viewModeMap = new Map<string, ITreeViewMode>();
  private lineCounters = new Map<string, ILineCountStrategy>();
  private binaryDetector?: IBinaryDetector;

  registerViewMode(mode: ITreeViewMode): void {
    if (this.viewModeMap.has(mode.id)) return;
    this.viewModes.push(mode);
    this.viewModeMap.set(mode.id, mode);
  }
  getViewMode(id: string): ITreeViewMode | undefined { return this.viewModeMap.get(id); }
  listViewModes(): ITreeViewMode[] { return [...this.viewModes]; }

  registerLineCounter(counter: ILineCountStrategy): void {
    this.lineCounters.set(counter.id, counter);
  }
  getLineCounter(id: string): ILineCountStrategy | undefined { return this.lineCounters.get(id); }

  registerBinaryDetector(detector: IBinaryDetector): void { this.binaryDetector = detector; }
  getBinaryDetector(): IBinaryDetector {
    if (!this.binaryDetector) throw new Error('binary detector not registered');
    return this.binaryDetector;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd vibecode-show-file-lines && npx vitest run tests/core/registry.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add vibecode-show-file-lines/src/core/registry.ts vibecode-show-file-lines/tests/core/registry.test.ts
git commit -m "feat(show-file-lines): Registry for policies and view modes"
```

---

## Task 11: VSCode adapters

**Files:**
- Create: `vibecode-show-file-lines/src/adapters/vscodeFileSystem.ts`
- Create: `vibecode-show-file-lines/src/adapters/vscodeConfig.ts`
- Create: `vibecode-show-file-lines/src/adapters/vscodeWatcher.ts`
- Create: `vibecode-show-file-lines/src/adapters/vscodeLogger.ts`

Adapters are thin and exercised by manual smoke tests, not unit tests.

- [ ] **Step 1: Write VsCodeFileSystem**

Write `vibecode-show-file-lines/src/adapters/vscodeFileSystem.ts`:

```ts
import * as vscode from 'vscode';
import type { IFileSystem, Uri } from '../core/types';

export class VsCodeFileSystem implements IFileSystem {
  async readFile(uri: Uri): Promise<Uint8Array> {
    return vscode.workspace.fs.readFile(toVsc(uri));
  }
  async stat(uri: Uri): Promise<{ size: number; mtime: number }> {
    const s = await vscode.workspace.fs.stat(toVsc(uri));
    return { size: s.size, mtime: s.mtime };
  }
  async *findFiles(include: string, exclude?: string): AsyncIterable<Uri> {
    const found = await vscode.workspace.findFiles(include, exclude ?? null);
    for (const u of found) yield u as unknown as Uri;
  }
  async readTextFile(uri: Uri): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(toVsc(uri));
    return new TextDecoder().decode(bytes);
  }
}

function toVsc(uri: Uri): vscode.Uri {
  return uri instanceof vscode.Uri ? uri : vscode.Uri.file(uri.fsPath);
}
```

- [ ] **Step 2: Write VsCodeConfig**

Write `vibecode-show-file-lines/src/adapters/vscodeConfig.ts`:

```ts
import * as vscode from 'vscode';
import { EXTENSION_ID } from '../constants';
import type { IConfigProvider, Disposable } from '../core/types';

/**
 * Reads from the extension namespace by default, but supports dotted absolute keys
 * (e.g. "files.exclude") by looking up the root configuration.
 */
export class VsCodeConfig implements IConfigProvider {
  get<T>(key: string, fallback: T): T {
    if (key.includes('.')) {
      const [section, ...rest] = key.split('.');
      const v = vscode.workspace.getConfiguration(section).get<T>(rest.join('.'));
      return (v ?? fallback) as T;
    }
    const v = vscode.workspace.getConfiguration(EXTENSION_ID).get<T>(key);
    return (v ?? fallback) as T;
  }
  onChange(keys: string[], cb: () => void): Disposable {
    const sub = vscode.workspace.onDidChangeConfiguration(e => {
      for (const k of keys) {
        const section = k.includes('.') ? k.split('.')[0] : EXTENSION_ID;
        const tail = k.includes('.') ? k : `${EXTENSION_ID}.${k}`;
        if (e.affectsConfiguration(tail) || e.affectsConfiguration(section)) { cb(); return; }
      }
    });
    return { dispose: () => sub.dispose() };
  }
}
```

- [ ] **Step 3: Write VsCodeWatcher**

Write `vibecode-show-file-lines/src/adapters/vscodeWatcher.ts`:

```ts
import * as vscode from 'vscode';
import type { Disposable, IFileWatcher, Uri } from '../core/types';

export class VsCodeWatcher implements IFileWatcher {
  watch(glob: string) {
    const w = vscode.workspace.createFileSystemWatcher(glob);
    return {
      onCreate(cb: (uri: Uri) => void): Disposable {
        const sub = w.onDidCreate(u => cb(u as unknown as Uri));
        return { dispose: () => sub.dispose() };
      },
      onChange(cb: (uri: Uri) => void): Disposable {
        const sub = w.onDidChange(u => cb(u as unknown as Uri));
        return { dispose: () => sub.dispose() };
      },
      onDelete(cb: (uri: Uri) => void): Disposable {
        const sub = w.onDidDelete(u => cb(u as unknown as Uri));
        return { dispose: () => sub.dispose() };
      },
      dispose: () => w.dispose()
    };
  }
}
```

- [ ] **Step 4: Write VsCodeLogger**

Write `vibecode-show-file-lines/src/adapters/vscodeLogger.ts`:

```ts
import * as vscode from 'vscode';
import type { ILogger } from '../core/types';

export class VsCodeLogger implements ILogger {
  private readonly out: vscode.LogOutputChannel;
  constructor(name: string) {
    this.out = vscode.window.createOutputChannel(name, { log: true });
  }
  debug(msg: string, meta?: object) { this.out.debug(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
  info(msg: string, meta?: object) { this.out.info(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
  warn(msg: string, meta?: object) { this.out.warn(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
  error(msg: string, meta?: object) { this.out.error(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
}
```

- [ ] **Step 5: Verify typecheck**

```bash
cd vibecode-show-file-lines && npx tsc -p . --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add vibecode-show-file-lines/src/adapters
git commit -m "feat(show-file-lines): vscode adapters for fs/config/watcher/logger"
```

---

## Task 12: Tree provider (vscode-aware view layer)

**Files:**
- Create: `vibecode-show-file-lines/src/view/lineTreeProvider.ts`

The provider holds a current `ITreeViewMode` and rebuilds when the cache changes or the mode toggles. It's vscode-aware (returns `vscode.TreeItem`) but delegates the actual node shape to the view-mode strategies.

- [ ] **Step 1: Write LineTreeProvider**

Write `vibecode-show-file-lines/src/view/lineTreeProvider.ts`:

```ts
import * as vscode from 'vscode';
import {
  CFG_TOP_N, CFG_WARN_THRESHOLD, EXTENSION_ID, VIEW_MODE_FLAT, VIEW_MODE_GROUP_EXT
} from '../constants';
import type {
  FileNode, GroupNode, ILineCache, IRegistry, ITreeViewMode, TreeNode
} from '../core/types';

type Node = TreeNode;

export class LineTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChange = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;
  private current: ITreeViewMode;

  constructor(
    private readonly cache: ILineCache,
    private readonly registry: IRegistry,
    initialModeId: string
  ) {
    this.current = registry.getViewMode(initialModeId) ?? registry.listViewModes()[0];
    cache.onChange(() => this._onDidChange.fire(undefined));
  }

  setMode(id: string): void {
    const next = this.registry.getViewMode(id);
    if (next && next.id !== this.current.id) {
      this.current = next;
      this._onDidChange.fire(undefined);
    }
  }

  currentModeId(): string { return this.current.id; }

  toggleMode(): string {
    const next = this.current.id === VIEW_MODE_FLAT ? VIEW_MODE_GROUP_EXT : VIEW_MODE_FLAT;
    this.setMode(next);
    return this.current.id;
  }

  refresh(): void { this._onDidChange.fire(undefined); }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'group') return this.groupItem(node);
    return this.fileItem(node);
  }

  getChildren(node?: Node): Node[] {
    if (!node) {
      const cfg = vscode.workspace.getConfiguration(EXTENSION_ID);
      const ctx = {
        topN: cfg.get<number>(CFG_TOP_N, 100),
        warnThreshold: cfg.get<number>(CFG_WARN_THRESHOLD, 500)
      };
      return this.current.build(this.cache.all(), ctx);
    }
    if (node.kind === 'group') return node.children;
    return [];
  }

  private fileItem(n: FileNode): vscode.TreeItem {
    const uri = vscode.Uri.file(n.stat.uri.fsPath);
    const rel = vscode.workspace.asRelativePath(uri, false);
    const item = new vscode.TreeItem(`${n.stat.lines}  ${rel}`, vscode.TreeItemCollapsibleState.None);
    item.resourceUri = uri;
    item.tooltip = `${n.stat.lines} lines\n${rel}`;
    item.command = { command: 'vscode.open', title: 'Open', arguments: [uri] };
    if (n.warn) {
      item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
    } else {
      item.iconPath = new vscode.ThemeIcon('file');
    }
    return item;
  }

  private groupItem(n: GroupNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      `${n.label}  (${n.fileCount} files, ${n.totalLines} lines)`,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    item.iconPath = new vscode.ThemeIcon('folder');
    return item;
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd vibecode-show-file-lines && npx tsc -p . --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add vibecode-show-file-lines/src/view/lineTreeProvider.ts
git commit -m "feat(show-file-lines): LineTreeProvider with mode toggle and warn highlighting"
```

---

## Task 13: Composition root (extension.ts)

**Files:**
- Create: `vibecode-show-file-lines/src/extension.ts`

This is the only file that knows the concrete classes. It wires everything up and registers commands.

- [ ] **Step 1: Write extension.ts**

Write `vibecode-show-file-lines/src/extension.ts`:

```ts
import * as vscode from 'vscode';
import {
  CFG_ADDITIONAL_BINARY_EXTS, CFG_DEFAULT_GROUPING, CFG_MAX_FILE_SIZE_KB,
  CFG_RESPECT_FILES_EXCLUDE, CFG_RESPECT_GITIGNORE,
  CMD_OPEN_SETTINGS, CMD_REFRESH, CMD_TOGGLE_VIEW,
  DEFAULT_BINARY_EXTS, EXTENSION_ID, VIEW_ID, WATCH_DEBOUNCE_MS
} from './constants';
import { VsCodeConfig } from './adapters/vscodeConfig';
import { VsCodeFileSystem } from './adapters/vscodeFileSystem';
import { VsCodeLogger } from './adapters/vscodeLogger';
import { VsCodeWatcher } from './adapters/vscodeWatcher';
import { ExtensionAndNullByteDetector } from './core/binaryDetectors/extensionAndNullByteDetector';
import { InMemoryLineCache } from './core/cache';
import { GitignoreSource } from './core/ignoreSources/gitignoreSource';
import { LineignoreSource } from './core/ignoreSources/lineignoreSource';
import { FilesExcludeSource } from './core/ignoreSources/filesExcludeSource';
import { IgnoreResolver } from './core/ignoreResolver';
import { RawNewlineCounter } from './core/lineCounters/rawNewlineCounter';
import { Registry } from './core/registry';
import { Scanner } from './core/scanner';
import type { IIgnoreSource, Uri } from './core/types';
import { LineTreeProvider } from './view/lineTreeProvider';
import { FlatByLines } from './view/viewModes/flatByLines';
import { GroupByExtension } from './view/viewModes/groupByExtension';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const workspaceRoot = folder.uri.fsPath;

  const logger = new VsCodeLogger('Vibecode Show File Lines');
  const config = new VsCodeConfig();
  const fs = new VsCodeFileSystem();
  const watcher = new VsCodeWatcher();

  const registry = new Registry();
  registry.registerLineCounter(new RawNewlineCounter());
  registry.registerBinaryDetector(new ExtensionAndNullByteDetector(
    DEFAULT_BINARY_EXTS,
    config.get<string[]>(CFG_ADDITIONAL_BINARY_EXTS, [])
  ));
  registry.registerViewMode(new FlatByLines());
  registry.registerViewMode(new GroupByExtension());

  const sources: IIgnoreSource[] = [new LineignoreSource(workspaceRoot, fs)];
  if (config.get<boolean>(CFG_RESPECT_GITIGNORE, true)) sources.push(new GitignoreSource(workspaceRoot, fs));
  if (config.get<boolean>(CFG_RESPECT_FILES_EXCLUDE, true)) sources.push(new FilesExcludeSource(workspaceRoot, config));
  const ignoreResolver = new IgnoreResolver(workspaceRoot, sources);
  await ignoreResolver.reload();

  const cache = new InMemoryLineCache();
  const scanner = new Scanner({
    fs, cache, ignoreResolver,
    lineCounter: registry.getLineCounter('raw-newline')!,
    binaryDetector: registry.getBinaryDetector(),
    maxFileSizeBytes: config.get<number>(CFG_MAX_FILE_SIZE_KB, 5120) * 1024,
    logger
  });

  const provider = new LineTreeProvider(
    cache, registry,
    config.get<string>(CFG_DEFAULT_GROUPING, 'flat') === 'byExtension' ? 'group-by-ext' : 'flat-by-lines'
  );
  const treeView = vscode.window.createTreeView(VIEW_ID, { treeDataProvider: provider, showCollapseAll: true });
  context.subscriptions.push(treeView);

  // Watcher
  const fw = watcher.watch('**/*');
  const debounce = makeDebouncer(WATCH_DEBOUNCE_MS);
  const pending = new Set<string>();
  const flushed = async () => {
    const batch = [...pending].map(p => ({ fsPath: p, toString: () => `file://${p}` }) as Uri);
    pending.clear();
    for (const u of batch) await scanner.rescanOne(u);
  };
  context.subscriptions.push(
    fw.onCreate(u => { pending.add(u.fsPath); debounce(flushed); }),
    fw.onChange(u => { pending.add(u.fsPath); debounce(flushed); }),
    fw.onDelete(u => { cache.remove(u); }),
    { dispose: () => fw.dispose() }
  );

  // Config / ignore changes
  context.subscriptions.push(
    config.onChange(
      [CFG_RESPECT_GITIGNORE, CFG_RESPECT_FILES_EXCLUDE, CFG_MAX_FILE_SIZE_KB, CFG_ADDITIONAL_BINARY_EXTS, 'files.exclude'],
      () => { void rescanAll(); }
    )
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_REFRESH, () => void rescanAll()),
    vscode.commands.registerCommand(CMD_TOGGLE_VIEW, () => {
      const next = provider.toggleMode();
      vscode.window.setStatusBarMessage(vscode.l10n.t('View mode: {0}', next), 2000);
    }),
    vscode.commands.registerCommand(CMD_OPEN_SETTINGS, () =>
      vscode.commands.executeCommand('workbench.action.openSettings', `@ext:dalsoop.${EXTENSION_ID}`))
  );

  // Initial scan with status-bar progress
  void rescanAll();

  async function rescanAll(): Promise<void> {
    cache.clear();
    await ignoreResolver.reload();
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: vscode.l10n.t('Vibecode Show File Lines') },
      async (progress) => {
        let last = 0;
        await scanner.scanAll({
          onProgress: (done, total) => {
            if (done === total || done - last >= 50) {
              progress.report({ message: vscode.l10n.t('Scanning {0} / {1} files...', done, total) });
              last = done;
            }
          }
        });
        progress.report({ message: vscode.l10n.t('Scan complete: {0} files indexed.', cache.size()) });
      }
    );
  }
}

export function deactivate(): void { /* subscriptions disposed by VSCode */ }

function makeDebouncer(ms: number): (fn: () => void) => void {
  let timer: NodeJS.Timeout | undefined;
  return (fn) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd vibecode-show-file-lines && npx tsc -p . --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add vibecode-show-file-lines/src/extension.ts
git commit -m "feat(show-file-lines): wire composition root, commands, watcher, and initial scan"
```

---

## Task 14: Command manifests + sync-contributions script

**Files:**
- Create: `vibecode-show-file-lines/src/apps/_types.ts`
- Create: `vibecode-show-file-lines/src/apps/index.ts`
- Create: `vibecode-show-file-lines/src/apps/refresh/{manifest.ts,handler.ts,index.ts}`
- Create: `vibecode-show-file-lines/src/apps/toggleView/{manifest.ts,handler.ts,index.ts}`
- Create: `vibecode-show-file-lines/src/apps/openSettings/{manifest.ts,handler.ts,index.ts}`
- Create: `vibecode-show-file-lines/scripts/sync-contributions.mjs` (adapted from sibling)

The sibling extensions express commands as "apps" with manifests, then a sync script writes them into `package.json.contributes.commands` + per-locale NLS files. For our extension the actual handler bodies just delegate to `vscode.commands.executeCommand(<our command id>)` so the truth stays in `extension.ts` (which owns DI wiring). The point of the apps pattern here is to be the single source of truth for command IDs, titles, menus, and i18n.

**Pattern:** each app declares its manifest (id, title, menus) and a `create(api)` factory that returns the handler. `extension.ts` builds the `ExtensionApi` (the cross-cutting verbs `refresh`, `toggleView`, `openSettings`), then loops over apps to register commands. This keeps DI in the composition root and avoids duplicate registration of the same command id.

- [ ] **Step 1: Write apps/_types.ts**

Write `vibecode-show-file-lines/src/apps/_types.ts`:

```ts
export type MenuLocation = 'view/title' | 'view/item/context' | 'commandPalette';

export interface MenuContribution {
  where: MenuLocation;
  when?: string;
  group?: string;
}

export interface AppManifest {
  id: string;
  title: string;
  description: string;
  icon?: string;
  menus: MenuContribution[];
  palette?: boolean;
}

export interface ExtensionApi {
  refresh(): Promise<void>;
  toggleView(): string;
  openSettings(): Thenable<unknown>;
}

export interface AppFactory {
  manifest: AppManifest;
  create(api: ExtensionApi): (arg?: unknown, all?: unknown) => unknown | Promise<unknown>;
}

export const COMMAND_PREFIX = 'vibecodeShowFileLines';
export function fullCommandId(id: string): string { return `${COMMAND_PREFIX}.${id}`; }
```

- [ ] **Step 2: Write the three command apps (manifest + handler factory + index)**

Write `vibecode-show-file-lines/src/apps/refresh/manifest.ts`:

```ts
import type { AppManifest } from '../_types';
export const manifest: AppManifest = {
  id: 'refresh',
  title: 'Vibecode - Refresh Line Ranking',
  description: 'Re-scan the workspace and rebuild the line-count cache.',
  icon: 'refresh',
  menus: [{ where: 'view/title', group: 'navigation', when: "view == vibecodeShowFileLines.lineRanking" }]
};
```

Write `vibecode-show-file-lines/src/apps/refresh/handler.ts`:

```ts
import type { ExtensionApi } from '../_types';
export const create = (api: ExtensionApi) => () => api.refresh();
```

Write `vibecode-show-file-lines/src/apps/refresh/index.ts`:

```ts
import type { AppFactory } from '../_types';
import { manifest } from './manifest';
import { create } from './handler';
export default { manifest, create } satisfies AppFactory;
```

Write `vibecode-show-file-lines/src/apps/toggleView/manifest.ts`:

```ts
import type { AppManifest } from '../_types';
export const manifest: AppManifest = {
  id: 'toggleView',
  title: 'Vibecode - Toggle Line Ranking View',
  description: 'Switch between flat and grouped-by-extension view modes.',
  icon: 'list-tree',
  menus: [{ where: 'view/title', group: 'navigation', when: "view == vibecodeShowFileLines.lineRanking" }]
};
```

Write `vibecode-show-file-lines/src/apps/toggleView/handler.ts`:

```ts
import * as vscode from 'vscode';
import type { ExtensionApi } from '../_types';
export const create = (api: ExtensionApi) => () => {
  const next = api.toggleView();
  vscode.window.setStatusBarMessage(vscode.l10n.t('View mode: {0}', next), 2000);
};
```

Write `vibecode-show-file-lines/src/apps/toggleView/index.ts`:

```ts
import type { AppFactory } from '../_types';
import { manifest } from './manifest';
import { create } from './handler';
export default { manifest, create } satisfies AppFactory;
```

Write `vibecode-show-file-lines/src/apps/openSettings/manifest.ts`:

```ts
import type { AppManifest } from '../_types';
export const manifest: AppManifest = {
  id: 'openSettings',
  title: 'Vibecode - Open Line Ranking Settings',
  description: 'Open VSCode settings filtered to this extension.',
  icon: 'gear',
  menus: [{ where: 'view/title', group: 'navigation', when: "view == vibecodeShowFileLines.lineRanking" }]
};
```

Write `vibecode-show-file-lines/src/apps/openSettings/handler.ts`:

```ts
import type { ExtensionApi } from '../_types';
export const create = (api: ExtensionApi) => () => api.openSettings();
```

Write `vibecode-show-file-lines/src/apps/openSettings/index.ts`:

```ts
import type { AppFactory } from '../_types';
import { manifest } from './manifest';
import { create } from './handler';
export default { manifest, create } satisfies AppFactory;
```

Write `vibecode-show-file-lines/src/apps/index.ts`:

```ts
import type { AppFactory } from './_types';
import refresh from './refresh';
import toggleView from './toggleView';
import openSettings from './openSettings';
export const apps: AppFactory[] = [refresh, toggleView, openSettings];
```

- [ ] **Step 3: Replace direct `registerCommand` calls in extension.ts with the apps loop**

In `vibecode-show-file-lines/src/extension.ts`:

1. Add imports at the top:

```ts
import { apps } from './apps';
import { fullCommandId, type ExtensionApi } from './apps/_types';
```

2. Remove the now-unused `CMD_REFRESH`, `CMD_TOGGLE_VIEW`, `CMD_OPEN_SETTINGS` imports from the `./constants` import list.

3. Replace the three `vscode.commands.registerCommand(CMD_*, …)` calls with:

```ts
const api: ExtensionApi = {
  refresh: rescanAll,
  toggleView: () => provider.toggleMode(),
  openSettings: () => vscode.commands.executeCommand('workbench.action.openSettings', `@ext:dalsoop.${EXTENSION_ID}`)
};
for (const app of apps) {
  context.subscriptions.push(
    vscode.commands.registerCommand(fullCommandId(app.manifest.id), app.create(api))
  );
}
```

4. Delete `CMD_REFRESH`, `CMD_TOGGLE_VIEW`, `CMD_OPEN_SETTINGS` from `constants.ts` since the command IDs now come from `fullCommandId(manifest.id)`.

- [ ] **Step 4: Write the sync-contributions script (adapted from sibling)**

Write `vibecode-show-file-lines/scripts/sync-contributions.mjs`:

```js
#!/usr/bin/env node
// Adapted from vibecode-agent-init-this-folder/scripts/sync-contributions.mjs.
// Walks src/apps/* and i18n/*.json, synthesizes commands/menus into package.json
// and rebuilds package.nls.json + package.nls.<locale>.json + l10n/bundle.l10n.<locale>.json.

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APPS_DIR = path.join(ROOT, 'src', 'apps');
const I18N_DIR = path.join(ROOT, 'i18n');
const L10N_DIR = path.join(ROOT, 'l10n');
const PKG_PATH = path.join(ROOT, 'package.json');
const DEFAULTS_PATH = path.join(__dirname, 'nls-defaults.json');
const COMMAND_PREFIX = 'vibecodeShowFileLines';
const CHECK_MODE = process.argv.includes('--check');

async function readManifest(appDir) {
  const file = path.join(APPS_DIR, appDir, 'manifest.ts');
  const src = await fs.readFile(file, 'utf8');
  const match = src.match(/export const manifest[^=]*=\s*(\{[\s\S]*?\n\});/);
  if (!match) throw new Error(`Cannot parse manifest in ${file}`);
  return new Function(`return (${match[1]});`)();
}

async function listAppDirs() {
  const entries = await fs.readdir(APPS_DIR, { withFileTypes: true });
  return entries.filter(e => e.isDirectory() && !e.name.startsWith('_')).map(e => e.name).sort();
}

async function listLocales() {
  try {
    const entries = await fs.readdir(I18N_DIR, { withFileTypes: true });
    return entries.filter(e => e.isFile() && e.name.endsWith('.json')).map(e => e.name.replace(/\.json$/, '')).sort();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

const nlsKeyForCommand = id => `cmd.${id}`;

function buildContributes(manifests, existing) {
  const commands = manifests.map(m => ({
    command: `${COMMAND_PREFIX}.${m.id}`,
    title: `%${nlsKeyForCommand(m.id)}%`,
    category: '%ext.category%',
    ...(m.icon ? { icon: `$(${m.icon})` } : {})
  }));
  const menus = { ...(existing.menus ?? {}) };
  for (const key of ['view/title', 'view/item/context', 'commandPalette']) delete menus[key];
  for (const m of manifests) {
    for (const entry of m.menus ?? []) {
      const bucket = (menus[entry.where] ??= []);
      bucket.push({
        command: `${COMMAND_PREFIX}.${m.id}`,
        ...(entry.when ? { when: entry.when } : {}),
        ...(entry.group ? { group: entry.group } : {})
      });
    }
  }
  menus['commandPalette'] = manifests
    .filter(m => m.palette !== false)
    .map(m => ({ command: `${COMMAND_PREFIX}.${m.id}` }));
  return { commands, menus };
}

function buildDefaultNls(manifests, defaults) {
  const out = { ...defaults };
  for (const m of manifests) out[nlsKeyForCommand(m.id)] = m.title;
  return out;
}

function buildLocaleNls(localeData, defaults, manifests) {
  const out = { ...defaults };
  for (const m of manifests) out[nlsKeyForCommand(m.id)] = m.title;
  if (localeData.ext) for (const [k, v] of Object.entries(localeData.ext)) out[`ext.${k}`] = v;
  if (localeData.view) {
    if (localeData.view.container?.title) out['view.container.title'] = localeData.view.container.title;
    if (localeData.view.lineRanking?.name) out['view.lineRanking.name'] = localeData.view.lineRanking.name;
  }
  if (localeData.config) for (const [k, v] of Object.entries(localeData.config)) out[`config.${k}`] = v;
  if (localeData.commands) for (const [id, v] of Object.entries(localeData.commands)) out[nlsKeyForCommand(id)] = v;
  return out;
}

async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function readRawOrNull(file) {
  try { return await fs.readFile(file, 'utf8'); }
  catch (err) { if (err.code === 'ENOENT') return null; throw err; }
}
async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }
async function writeOrCheck(file, next, changes) {
  const current = await readRawOrNull(file);
  if (current === next) return;
  changes.push(path.relative(ROOT, file));
  if (!CHECK_MODE) { await ensureDir(path.dirname(file)); await fs.writeFile(file, next); }
}

async function main() {
  const appDirs = await listAppDirs();
  const manifests = await Promise.all(appDirs.map(readManifest));
  const pkgRaw = await fs.readFile(PKG_PATH, 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const { commands, menus } = buildContributes(manifests, pkg.contributes ?? {});
  pkg.contributes = { ...(pkg.contributes ?? {}), commands, menus };
  const nextPkg = JSON.stringify(pkg, null, 2) + '\n';

  const defaults = await readJson(DEFAULTS_PATH);
  const defaultNls = buildDefaultNls(manifests, defaults);
  const nextDefaultNls = JSON.stringify(defaultNls, null, 2) + '\n';

  const locales = await listLocales();
  const localeOutputs = [];
  for (const locale of locales) {
    const data = await readJson(path.join(I18N_DIR, `${locale}.json`));
    const nls = buildLocaleNls(data, defaults, manifests);
    localeOutputs.push({
      nlsFile: path.join(ROOT, `package.nls.${locale}.json`),
      nlsContent: JSON.stringify(nls, null, 2) + '\n',
      bundleFile: path.join(L10N_DIR, `bundle.l10n.${locale}.json`),
      bundleContent: JSON.stringify(data.runtime ?? {}, null, 2) + '\n'
    });
  }

  const changes = [];
  await writeOrCheck(PKG_PATH, nextPkg, changes);
  await writeOrCheck(path.join(ROOT, 'package.nls.json'), nextDefaultNls, changes);
  for (const o of localeOutputs) {
    await writeOrCheck(o.nlsFile, o.nlsContent, changes);
    await writeOrCheck(o.bundleFile, o.bundleContent, changes);
  }

  if (CHECK_MODE) {
    if (changes.length) {
      console.error('Out of sync — run `npm run sync`:');
      for (const c of changes) console.error(`  - ${c}`);
      process.exit(1);
    }
    console.log('package.json, package.nls.*.json, and l10n/bundle.l10n.*.json are in sync.');
    return;
  }
  console.log(`Synced ${manifests.length} apps -> ${commands.length} commands, ${Object.keys(menus).length} menus, ${locales.length} locales (${locales.join(', ') || 'default only'}).`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 5: Run sync and verify outputs**

```bash
cd vibecode-show-file-lines && npm run sync
```

Expected output: `Synced 3 apps -> 3 commands, 2 menus, 1 locales (ko).` Verify `package.json` now has `contributes.commands` and `contributes.menus`. Verify `package.nls.ko.json` and `l10n/bundle.l10n.ko.json` exist.

- [ ] **Step 6: Run `npm run sync:check` and confirm clean**

```bash
cd vibecode-show-file-lines && npm run sync:check
```

Expected: `package.json, package.nls.*.json, and l10n/bundle.l10n.*.json are in sync.`

- [ ] **Step 7: Typecheck and lint**

```bash
cd vibecode-show-file-lines && npm run typecheck && npm run lint
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add vibecode-show-file-lines/
git commit -m "feat(show-file-lines): apps factory pattern + sync-contributions for commands/menus/i18n"
```

---

## Task 15: Build and smoke-test in the VSCode host

**Files:** none new — verification only.

- [ ] **Step 1: Build**

```bash
cd vibecode-show-file-lines && npm run build
```

Expected: `dist/extension.js` produced; no TS errors.

- [ ] **Step 2: Run the full test suite**

```bash
cd vibecode-show-file-lines && npm test
```

Expected: all vitest suites pass.

- [ ] **Step 3: Launch the extension in Extension Development Host**

From the `vibecode-show-file-lines` folder, open VSCode and press F5 (or `code --extensionDevelopmentPath=. --new-window`). In the Extension Development Host:

1. Open a multi-file workspace (e.g., this monorepo).
2. Confirm an Activity Bar icon "Vibecode Show File Lines" appears.
3. Click it — the "Line Ranking" view container opens.
4. Verify the tree shows files sorted by line count, top entry has the highest count.
5. Verify files in `node_modules` and `dist` do NOT appear (gitignore active).
6. Toggle view mode (use the toolbar icon or palette command "Vibecode - Toggle Line Ranking View") — tree regroups by extension.
7. Click a node — the file opens in the editor.
8. Create a new file, save it — verify the tree updates within ~1 second.
9. Delete a file — verify it disappears from the tree.
10. Add a `.lineignore` at workspace root with `*.md\n`, run Refresh — markdown files disappear.

- [ ] **Step 4: Confirm Korean locale path works**

Set VSCode display language to Korean (`workbench.action.configureLocale`, restart). Re-open the extension host. Verify the view title and command palette entries appear in Korean.

- [ ] **Step 5: Package a VSIX (smoke test only, do not publish)**

```bash
cd vibecode-show-file-lines && npm run package
```

Expected: `vibecode-show-file-lines-0.1.0.vsix` produced in the folder.

- [ ] **Step 6: Commit any fixes found during smoke testing**

Apply minimal fixes inline. Commit with a descriptive message per fix.

---

## Self-Review Notes

- **Spec section 2 (Non-Goals)** — all explicitly excluded items remain absent: no webview, no SLOC, no disk cache, no multi-workspace, no inline status bar, no file modification. ✓
- **Spec section 3 (User Surface)** — Activity Bar icon (Task 0 package.json), tree view (Tasks 9, 12), title bar actions (Task 14 manifests), click-to-open (Task 12), warn highlighting (Tasks 9, 12). ✓
- **Spec section 4 (Ignore rules)** — three sources implemented in Task 6, composed with union semantics in Task 7, toggles respected in Task 13. ✓
- **Spec section 5 (Line semantics)** — raw newline in Task 3 (with empty/no-trailing-newline edge cases), size cap + binary skip in Tasks 4, 8, 13. ✓
- **Spec section 6 (Performance)** — `onStartupFinished` (Task 0), background scan with status bar progress (Task 13), single watcher with 250ms debounce (Task 13), config-change re-scans for cap/binary changes (Task 13). ✓
- **Spec section 7 (Architecture)** — composition root only in `extension.ts` (Task 13), no `vscode` import in `core/`/`view/viewModes/` (enforced by eslint rule in Task 0). Type-only `vscode.Uri` usage is avoided by defining a domain `Uri` shape (Task 2). ✓
- **Spec section 8 (Settings)** — all 7 settings declared in Task 0 package.json, consumed in Task 13. ✓
- **Spec section 9 (Testing)** — coverage for each named target lives in Tasks 3–10. ✓
- **Spec section 11 (Sibling conventions)** — publisher, engine, activation, l10n setup, sync script (Tasks 0, 14). ✓

No type-name drift: `FileStat`, `ViewCtx`, `TreeNode`, `FileNode`, `GroupNode`, `IIgnoreResolver`, `ILineCache`, `ITreeViewMode`, `IBinaryDetector`, `ILineCountStrategy`, `ScannerDeps`, `ScanOptions`, `ExtensionApi` are introduced once and reused with identical signatures.

No placeholder text remains. The original draft had a `scanner['deps']` workaround in Task 13 — replaced inline by moving `onProgress` from `ScannerDeps` to a `ScanOptions` parameter of `scanAll()` (Task 8), which Task 13 now passes directly.

Task 14 deliberately presents the apps-pattern refactor as a single step rather than a two-pass (manual registration → factory rewrite) because the second pass is trivial mechanical work and splitting them would duplicate code in two places of the same task.
