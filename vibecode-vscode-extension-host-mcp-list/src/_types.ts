import type { SourceId } from './sources/_types';

export const COMMAND_PREFIX = 'vibecodeMcpList' as const;

export const MCP_TRANSPORT = {
  STDIO: 'stdio',
  HTTP: 'http',
  SSE: 'sse',
} as const;
export type McpTransportId = typeof MCP_TRANSPORT[keyof typeof MCP_TRANSPORT];
export const ALL_MCP_TRANSPORTS: readonly McpTransportId[] = Object.values(MCP_TRANSPORT);

export const MCP_ORIGIN_KIND = {
  FILE: 'file',
  EXTENSION: 'extension',
} as const;
export type McpOriginKind = typeof MCP_ORIGIN_KIND[keyof typeof MCP_ORIGIN_KIND];

export type McpOrigin =
  | { kind: typeof MCP_ORIGIN_KIND.FILE; path: string; line?: number }
  | { kind: typeof MCP_ORIGIN_KIND.EXTENSION; extensionId: string };

export interface McpServerEntry {
  name: string;
  sourceId: SourceId;
  workspaceFolder?: string;
  transport: McpTransportId;
  command?: string;
  args?: string[];
  url?: string;
  port?: number;
  env?: Record<string, string>;
  cwd?: string;
  raw: unknown;
  origin: McpOrigin;
}

export function fullCommandId(id: string): string {
  return `${COMMAND_PREFIX}.${id}`;
}
