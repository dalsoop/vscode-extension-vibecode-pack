import * as vscode from 'vscode';
import { McpServerEntry, MCP_ORIGIN_KIND } from '../../_types';
import { MCP_SOURCE } from '../_types';
import { parseTransport } from '../../parse';

interface ContributedDef {
  id?: string;
  label?: string;
  command?: string;
  args?: string[];
  url?: string;
  type?: string;
  env?: Record<string, string>;
  cwd?: string;
}

export async function scan(): Promise<McpServerEntry[]> {
  const out: McpServerEntry[] = [];
  for (const ext of vscode.extensions.all) {
    const contributes = ext.packageJSON?.contributes;
    const defs: unknown = contributes?.mcpServerDefinitionProviders;
    if (!Array.isArray(defs)) continue;
    for (const def of defs as ContributedDef[]) {
      const name = def.label ?? def.id ?? ext.id;
      const t = parseTransport(def);
      out.push({
        name,
        sourceId: MCP_SOURCE.EXTENSION_CONTRIBUTES,
        transport: t.transport,
        command: t.command,
        args: t.args,
        url: t.url,
        port: t.port,
        env: def.env,
        cwd: def.cwd,
        raw: def,
        origin: { kind: MCP_ORIGIN_KIND.EXTENSION, extensionId: ext.id },
      });
    }
  }
  return out;
}

export function watch(onChange: () => void): vscode.Disposable {
  return vscode.extensions.onDidChange(onChange);
}
