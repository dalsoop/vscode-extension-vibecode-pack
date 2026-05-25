import type * as vscode from 'vscode';
import type { McpServerEntry } from '../_types';

export const MCP_SOURCE = {
  USER_MCP_JSON: 'user-mcp-json',
  WORKSPACE_MCP_JSON: 'workspace-mcp-json',
  EXTENSION_CONTRIBUTES: 'extension-contributes',
} as const;
export type SourceId = typeof MCP_SOURCE[keyof typeof MCP_SOURCE];
export const ALL_SOURCE_IDS: readonly SourceId[] = Object.values(MCP_SOURCE);

export interface SourceManifest {
  id: SourceId;
  labelKey: string;
  order: number;
}

export interface SourceModule {
  manifest: SourceManifest;
  scan: () => Promise<McpServerEntry[]>;
  watch?: (onChange: () => void) => vscode.Disposable;
}
