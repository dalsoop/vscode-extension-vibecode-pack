import * as vscode from 'vscode';
import * as path from 'path';
import { McpServerEntry, MCP_TRANSPORT, MCP_ORIGIN_KIND, fullCommandId } from '../../_types';
import { MCP_COMMAND } from '../../commands/_types';

export class SourceGroupItem extends vscode.TreeItem {
  constructor(public override readonly label: string, public readonly key: string) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'mcpSourceGroup';
    this.id = `group:${key}`;
  }
}

function transportIcon(t: McpServerEntry['transport']): vscode.ThemeIcon {
  switch (t) {
    case MCP_TRANSPORT.STDIO: return new vscode.ThemeIcon('terminal');
    case MCP_TRANSPORT.HTTP: return new vscode.ThemeIcon('globe');
    case MCP_TRANSPORT.SSE: return new vscode.ThemeIcon('radio-tower');
  }
}

function describe(entry: McpServerEntry): string {
  if (entry.transport === MCP_TRANSPORT.STDIO) {
    return `stdio · ${entry.command ? path.basename(entry.command) : '(no command)'}`;
  }
  return `${entry.transport} · :${entry.port ?? '?'}`;
}

function tooltip(entry: McpServerEntry): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**${entry.name}** · _${entry.transport}_\n\n`);
  if (entry.command) md.appendMarkdown(`**Command:** \`${entry.command}\`\n\n`);
  if (entry.args?.length) md.appendMarkdown(`**Args:** \`${entry.args.join(' ')}\`\n\n`);
  if (entry.url) md.appendMarkdown(`**URL:** ${entry.url}\n\n`);
  if (entry.cwd) md.appendMarkdown(`**cwd:** \`${entry.cwd}\`\n\n`);
  if (entry.env && Object.keys(entry.env).length) md.appendMarkdown(`**env keys:** ${Object.keys(entry.env).join(', ')}\n\n`);
  if (entry.origin.kind === MCP_ORIGIN_KIND.FILE) {
    md.appendMarkdown(`**Origin:** \`${entry.origin.path}\``);
  } else {
    md.appendMarkdown(`**Origin:** extension \`${entry.origin.extensionId}\``);
  }
  return md;
}

export class McpServerItem extends vscode.TreeItem {
  constructor(public readonly entry: McpServerEntry) {
    super(entry.name, vscode.TreeItemCollapsibleState.None);
    this.description = describe(entry);
    this.tooltip = tooltip(entry);
    this.iconPath = transportIcon(entry.transport);
    this.contextValue = 'mcpServerItem';
    this.command = {
      command: fullCommandId(MCP_COMMAND.OPEN_DETAIL),
      title: 'Open Detail',
      arguments: [entry]
    };
  }
}
