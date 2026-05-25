// Backward-compat aliases over the ambient `Contracts.*` types declared in
// src/contracts/*.d.ts (those are the single source of truth shared with
// every webview client). Extension code keeps its existing
// `import { Item } from './types'` style — no churn required.
//
// Extension-only types (Skill, SkillRoot, Source, …) stay defined here
// because no webview client needs them.

// ─── Re-exports from Contracts ─────────────────────────────────────────

export type ToolId = Contracts.ToolId;
export type ScopeId = Contracts.ScopeId;
export type ScopeFilter = Contracts.ScopeFilter;
export type TabId = Contracts.TabId;
export type ActionName = Contracts.ActionName;
export type RootScope = Contracts.RootScope;
export type RootLayout = Contracts.RootLayout;
export type LocaleSetting = Contracts.LocaleSetting;
export type InstructionFormat = Contracts.InstructionFormat;

export type ToolDef = Contracts.ToolDef;
export type MirrorGroup = Contracts.MirrorGroup;
export type PresetInfo = Contracts.PresetInfo;
export type CcSkillsConfig = Contracts.CcSkillsConfig;

export type ScoreAxes = Contracts.ScoreAxes;
export type Tab = Contracts.Tab;
export type Segment = Contracts.Segment;
export type ItemPayload = Contracts.ItemPayload;
export type Group = Contracts.Group;

export type MsgFromExt = Contracts.HubMsgFromExt;
export type MsgFromView = Contracts.HubMsgFromView;

// ─── Extension-only domain types (no webview client touches these) ─────

export interface SkillRoot {
  tool: ToolId;
  label: string;
  icon: string;
  scopes: RootScope[];
  segments: string[];
  layout: RootLayout;
}

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

// ─── Scoring (extension-only) ──────────────────────────────────────────

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

// ─── Data sources (extension-only) ─────────────────────────────────────

export interface FetchContext {
  // Scope is now a client-side filter (so chip counts work without a
  // round-trip). Data sources return everything; client filters by item.scope.
  enabledTools: ReadonlySet<string>;
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

// ─── Actions (extension-only) ──────────────────────────────────────────

export interface ActionContext {
  refresh(): void;
}

export type ActionHandler = (payload: ItemPayload, ctx: ActionContext) => Promise<void>;

// ─── Commands (extension-only) ─────────────────────────────────────────

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
