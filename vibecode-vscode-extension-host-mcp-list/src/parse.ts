import { parse as jsoncParse, ParseError, printParseErrorCode } from 'jsonc-parser';
import { MCP_TRANSPORT, McpTransportId } from './_types';

export interface ParsedTransport {
  transport: McpTransportId;
  command?: string;
  args?: string[];
  url?: string;
  port?: number;
}

export function parseTransport(raw: unknown): ParsedTransport {
  const r = (raw ?? {}) as Record<string, unknown>;
  const url = typeof r.url === 'string' ? r.url : undefined;
  const command = typeof r.command === 'string' ? r.command : undefined;
  const args = Array.isArray(r.args) ? r.args.filter((x): x is string => typeof x === 'string') : undefined;

  if (url) {
    let port: number | undefined;
    try {
      const u = new URL(url);
      if (u.port) port = Number(u.port);
      else if (u.protocol === 'https:' || u.protocol === 'wss:') port = 443;
      else if (u.protocol === 'http:' || u.protocol === 'ws:') port = 80;
    } catch { /* ignore malformed */ }
    const type = r.type === 'sse' ? MCP_TRANSPORT.SSE : MCP_TRANSPORT.HTTP;
    return { transport: type, url, port };
  }

  if (command) return { transport: MCP_TRANSPORT.STDIO, command, args };

  return { transport: MCP_TRANSPORT.STDIO };
}

export interface ParsedMcpEntry extends ParsedTransport {
  name: string;
  env?: Record<string, string>;
  cwd?: string;
  raw: unknown;
}

export interface ParseResult {
  entries: ParsedMcpEntry[];
  errors: { message: string; offset: number; length: number }[];
}

export function parseMcpJson(text: string): ParseResult {
  const errors: ParseError[] = [];
  const json = jsoncParse(text, errors, { allowTrailingComma: true, allowEmptyContent: true }) ?? {};
  const formatted = errors.map(e => ({
    message: printParseErrorCode(e.error),
    offset: e.offset,
    length: e.length
  }));
  const servers = (json as Record<string, unknown>).servers;
  if (!servers || typeof servers !== 'object') return { entries: [], errors: formatted };
  const entries: ParsedMcpEntry[] = [];
  for (const [name, rawEntry] of Object.entries(servers as Record<string, unknown>)) {
    const t = parseTransport(rawEntry);
    const r = (rawEntry ?? {}) as Record<string, unknown>;
    const env = (r.env && typeof r.env === 'object') ? (r.env as Record<string, string>) : undefined;
    const cwd = typeof r.cwd === 'string' ? r.cwd : undefined;
    entries.push({ name, ...t, env, cwd, raw: rawEntry });
  }
  return { entries, errors: formatted };
}
