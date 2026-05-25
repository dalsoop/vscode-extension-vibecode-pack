// ============ Shared types across modules ============

export type ToolId =
  | 'claude'
  | 'codex'
  | 'copilot'
  | 'cursor'
  | 'gemini'
  | 'windsurf'
  | 'cline'
  | 'agents'
  | 'extension'
  | 'custom';

export type ScopeId = 'global' | 'workspace' | 'extension' | 'this folder';
export type ScopeFilter = 'all' | 'global' | 'workspace' | 'this';
export type ToolFilter = 'all' | ToolId;
export type TabId = 'skill' | 'rootmd' | 'agent' | 'memory' | 'browse';
export type ActionName = 'open' | 'preview' | 'finder' | 'fav' | 'sync' | 'github' | 'create';

// ============ Skill root definitions ============

export type RootScope = 'global' | 'workspace';
export type RootLayout = 'folder-tree' | 'rules-file' | 'single-md';

export interface SkillRoot {
  tool: ToolId;
  label: string;
  icon: string;
  scopes: RootScope[]; // where this root applies
  segments: string[]; // joined under home (global) or workspace
  layout: RootLayout;
}

// ============ Domain ============

export interface Source {
  id: string;
  tool: ToolId;
  label: string;
  scope: ScopeId;
  icon: string;
  dir: string;
  readOnly?: boolean;
  extensionId?: string;
}

export interface FrontmatterError {
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
}

export interface SkillInfo {
  mdPath: string | null;
  name: string;
  description?: string | null;
  whenToUse?: string | null;
  categories: string[];
  license?: string | null;
  version?: string | null;
  raw?: string;
  body?: string;
  frontmatterError?: FrontmatterError | null;
}

export interface Skill {
  name: string;
  dir: string;
  source: Source;
  info: SkillInfo;
}

export interface InstructionFile {
  kind: 'workspace' | 'global' | 'this' | 'per-skill';
  tool: ToolId | string;
  label: string;
  note?: string;
  rel?: string | null;
  abs: string;
  exists: boolean;
  size: number;
  mtime: number;
  hasBlock: boolean;
  blockSize: number;
}

export interface MemoryFile {
  name: string;
  abs: string;
  size: number;
  mtime: number;
}

export interface MemoryProject {
  slug: string;
  wsPath: string;
  label: string;
  memDir: string;
  files: MemoryFile[];
  count: number;
}

// ============ Scoring ============

export interface ScoreAxes {
  clarity: number;
  completeness: number;
  examples: number;
  focus: number;
}

export interface ScoreResult {
  total: number;
  pct: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | '-';
  color: 'green' | 'lime' | 'yellow' | 'orange' | 'red' | 'gray';
  lines: number;
  chars: number;
  mtime: number;
  axes?: ScoreAxes;
  issues: string[];
}

export interface Scorer<T> {
  score(item: T, ctx?: ScoreContext): ScoreResult;
}

export interface ScoreContext {
  dupMap?: Map<string, number>;
}

// ============ Data sources (per-tab) ============

export interface FetchContext {
  scope: ScopeFilter;
  tool: ToolFilter;
  activeFolderDir: string | null;
  workspaceDir: string | null;
  favorites: ReadonlySet<string>;
  extensionPath: string;
}

export interface DataSource {
  readonly id: TabId;
  readonly label: string;
  readonly desc: string;
  fetch(ctx: FetchContext): Group[] | Promise<Group[]>;
}

// ============ Webview message protocol ============

export interface Tab {
  id: TabId;
  label: string;
  desc: string;
}
export interface Segment {
  id: string;
  label: string;
}

export interface ItemPayload {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  path?: string;
  mdPath?: string | null;
  exists?: boolean;
  hasBlock?: boolean;
  tool?: string;
  kind?: string;
  readOnly?: boolean;
  score?: { pct: number; grade: string; color: string; axes?: ScoreAxes; issues: string[] };
  actions?: ActionName[];
}

export interface Group {
  title: string;
  items: ItemPayload[];
}

export type MsgFromExt =
  | { type: 'init'; tabs: Tab[]; scopes: Segment[]; tools: Segment[]; scope: ScopeFilter; tool: ToolFilter }
  | { type: 'activeFolder'; dir: string | null; label: string | null }
  | { type: 'data'; tab: TabId; items: Group[] };

export type MsgFromView =
  | { type: 'setScope'; scope: ScopeFilter }
  | { type: 'setTool'; tool: ToolFilter }
  | { type: 'refresh' }
  | { type: 'createSkill' }
  | { type: 'action'; action: ActionName; payload: ItemPayload };

// ============ Actions ============

export interface ActionContext {
  refresh(): void;
}

export type ActionHandler = (payload: ItemPayload, ctx: ActionContext) => Promise<void>;

// ============ Commands ============

export interface SkillCommandArg {
  dir: string;
  mdPath?: string | null;
  source?: Source;
}

export interface FileCommandArg {
  abs: string;
}

export interface PreviewArg {
  dir: string;
  mdPath?: string | null;
  name: string;
  source: { label: string; scope: string; tier?: string };
}

export type CommandArg = SkillCommandArg | FileCommandArg | PreviewArg | undefined;

export interface CommandDef {
  id: string;
  handler: (...args: any[]) => any;
  needs?: 'workspace' | 'editor';
}

// ============ Mirror Groups (parallel file sync) ============

export interface MirrorGroup {
  id: string;
  label: string;
  paths: string[]; // absolute or ~/-prefixed
  alwaysMirror?: boolean; // skip Save confirm; auto-write to peers
}

