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
