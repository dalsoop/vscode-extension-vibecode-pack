import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { MemoryFile, MemoryProject } from './types';

export const ROOT = path.join(os.homedir(), '.claude', 'projects');

export function slugify(absPath: string): string {
  return absPath.replace(/[^a-zA-Z0-9]/g, '-');
}

export function unslugify(slug: string): string {
  return slug.replace(/^-/, '/').replace(/-/g, '/');
}

export function memoryDirFor(absPath: string): string {
  return path.join(ROOT, slugify(absPath), 'memory');
}

export function currentWorkspaceMemoryDir(): string | null {
  const ws = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  if (!ws) return null;
  return memoryDirFor(ws.uri.fsPath);
}

export function listMemoryFiles(dir: string | null): MemoryFile[] | null {
  if (!dir || !fs.existsSync(dir)) return null;
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.md'))
      .map(e => {
        const full = path.join(dir, e.name);
        const st = fs.statSync(full);
        return { name: e.name, abs: full, size: st.size, mtime: st.mtimeMs };
      })
      .sort((a, b) => {
        if (a.name === 'MEMORY.md') return -1;
        if (b.name === 'MEMORY.md') return 1;
        return a.name.localeCompare(b.name);
      });
  } catch {
    return null;
  }
}

interface MemoryEntry {
  meta: Record<string, any>;
  raw: string;
}

export function parseMemoryEntry(abs: string): MemoryEntry {
  try {
    const raw = fs.readFileSync(abs, 'utf8');
    const meta: Record<string, any> = {};
    if (raw.startsWith('---')) {
      const end = raw.indexOf('\n---', 3);
      if (end > 0) {
        const yaml = raw.slice(3, end);
        for (const line of yaml.split('\n')) {
          const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
          if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
        }
      }
    }
    return { meta, raw };
  } catch {
    return { meta: {}, raw: '' };
  }
}

export function memoryKind(name: string, meta: Record<string, any>): string {
  if (name === 'MEMORY.md') return 'index';
  if (meta.type) return meta.type;
  if (name.startsWith('feedback_')) return 'feedback';
  if (name.startsWith('project_')) return 'project';
  if (name.startsWith('user_')) return 'user';
  if (name.startsWith('reference_')) return 'reference';
  return 'other';
}

export function listAllProjectMemories(): MemoryProject[] {
  if (!fs.existsSync(ROOT)) return [];
  const out: MemoryProject[] = [];
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const memDir = path.join(ROOT, entry.name, 'memory');
    const files = listMemoryFiles(memDir);
    if (!files) continue;
    const wsPath = unslugify(entry.name);
    out.push({
      slug: entry.name,
      wsPath,
      label: path.basename(wsPath) || entry.name,
      memDir,
      files,
      count: files.length
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function formatAge(ms: number): string {
  if (!ms) return '';
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
