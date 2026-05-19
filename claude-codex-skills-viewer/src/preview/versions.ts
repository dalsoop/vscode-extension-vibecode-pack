// File version control via filesystem snapshots.
// Storage: ~/.claude/.ccskills-history/<slug>/<timestamp>-<tag>.md
// - Each save creates a snapshot before writing the new content.
// - Trim to last MAX_VERSIONS per file.
// - No git dependency; just plain files.
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const ROOT = path.join(os.homedir(), '.claude', '.ccskills-history');
const MAX_VERSIONS = 50;

export interface Version {
  id: string; // timestamp string
  filename: string; // basename of snapshot file
  abs: string; // full path
  mtime: number;
  size: number;
  tag: string; // 'edit' | 'restore' | 'auto'
  sectionId?: string;
}

function slugForPath(abs: string): string {
  return abs.replace(/[^a-zA-Z0-9]/g, '-');
}

function dirFor(abs: string): string {
  return path.join(ROOT, slugForPath(abs));
}

export function listVersions(abs: string): Version[] {
  const dir = dirFor(abs);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const full = path.join(dir, f);
      const st = fs.statSync(full);
      // format: <timestamp>-<tag>(-<section>)?.md
      const m = f.match(/^(\d+)-([a-z-]+)(?:-(.+))?\.md$/);
      return {
        id: m?.[1] ?? f,
        filename: f,
        abs: full,
        mtime: st.mtimeMs,
        size: st.size,
        tag: m?.[2] ?? 'auto',
        sectionId: m?.[3]?.replace(/\.md$/, '')
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

export function readVersion(version: Version): string {
  return fs.readFileSync(version.abs, 'utf8');
}

export interface SnapshotOpts {
  tag?: 'edit' | 'restore' | 'auto';
  sectionId?: string;
}

export function snapshot(abs: string, opts: SnapshotOpts = {}): Version | null {
  if (!fs.existsSync(abs)) return null;
  const dir = dirFor(abs);
  fs.mkdirSync(dir, { recursive: true });
  const ts = Date.now();
  const tag = opts.tag ?? 'edit';
  const sectionPart = opts.sectionId ? `-${opts.sectionId.replace(/[^a-z0-9-]/gi, '-')}` : '';
  const filename = `${ts}-${tag}${sectionPart}.md`;
  const dest = path.join(dir, filename);
  fs.copyFileSync(abs, dest);
  trim(dir);
  const st = fs.statSync(dest);
  return { id: String(ts), filename, abs: dest, mtime: st.mtimeMs, size: st.size, tag, sectionId: opts.sectionId };
}

function trim(dir: string): void {
  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  for (let i = MAX_VERSIONS; i < files.length; i++) {
    try {
      fs.unlinkSync(path.join(dir, files[i].f));
    } catch {}
  }
}

export function restore(abs: string, version: Version): void {
  // First snapshot the current state as a 'restore' marker
  snapshot(abs, { tag: 'restore' });
  fs.copyFileSync(version.abs, abs);
}

export function formatAge(ms: number): string {
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// For tests
export function _resetRoot(): void {
  if (fs.existsSync(ROOT)) fs.rmSync(ROOT, { recursive: true, force: true });
}
