import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { SkillInfo, FrontmatterError } from './types';

interface ParsedFrontmatter {
  meta?: Record<string, any>;
  body?: string;
  raw?: string;
}

// Auto-fix attempt for common YAML errors in skill frontmatter.
// Strategy: quote unquoted values that contain ':' or other YAML-sensitive
// characters. Best-effort — re-validates afterwards and only writes if the
// result parses cleanly.
export interface AutoFixResult {
  applied: boolean;
  before?: string;
  after?: string;
  error?: string;
}

export function tryAutoFixFrontmatter(mdPath: string): AutoFixResult {
  try {
    const raw = fs.readFileSync(mdPath, 'utf8');
    if (!raw.startsWith('---')) return { applied: false, error: 'No frontmatter' };
    const end = raw.indexOf('\n---', 3);
    if (end < 0) return { applied: false, error: 'Frontmatter not closed' };
    const yamlText = raw.slice(4, end);
    const body = raw.slice(end + 4);

    // Quote unquoted values with risky chars.
    // We process line-by-line; only touch top-level `key: value` lines.
    const lines = yamlText.split('\n');
    let changed = false;
    const fixed = lines.map(line => {
      const m = line.match(/^([A-Za-z_][\w-]*):\s*(.+?)\s*$/);
      if (!m) return line;
      const key = m[1];
      let value = m[2];
      // Already quoted / array / flow / plain safe → skip
      if (/^["'[{|>]/.test(value)) return line;
      // Risky if contains ':' followed by space/EOL, or unquoted '#', '"', etc.
      const risky = /:\s|:$|^[*&!|>%@`]|^-\s/.test(value);
      if (!risky) return line;
      // Escape backslashes then double-quotes, then wrap
      value = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      changed = true;
      return `${key}: "${value}"`;
    });

    if (!changed) return { applied: false, error: 'No fixable lines detected' };

    const newYaml = fixed.join('\n');
    const newRaw = `---\n${newYaml}\n---${body}`;

    // Re-validate by writing to a temp parse step (in-memory)
    const doc = YAML.parseDocument(newYaml, { strict: true });
    if (doc.errors && doc.errors.length) {
      return { applied: false, error: `Still invalid after fix: ${doc.errors[0].message}` };
    }

    fs.writeFileSync(mdPath, newRaw, 'utf8');
    return { applied: true, before: raw, after: newRaw };
  } catch (e: any) {
    return { applied: false, error: e.message };
  }
}

// Strict YAML validation — returns the same parse errors Codex / Claude Code
// raise. Captures line/column when available.
export function validateFrontmatter(mdPath: string): FrontmatterError | null {
  try {
    const raw = fs.readFileSync(mdPath, 'utf8');
    if (!raw.startsWith('---')) return null;
    const end = raw.indexOf('\n---', 3);
    if (end < 0) return { message: 'Frontmatter opened with --- but no closing ---' };
    const yamlText = raw.slice(4, end);
    const doc = YAML.parseDocument(yamlText, { strict: true });
    if (doc.errors && doc.errors.length) {
      const err = doc.errors[0];
      const pos: any = (err as any).linePos || (err as any).pos || null;
      const line = pos?.[0]?.line ?? pos?.line ?? undefined;
      const column = pos?.[0]?.col ?? pos?.col ?? undefined;
      // Account for the opening `---` line (frontmatter starts at line 2 of file)
      const fileLine = line ? line + 1 : undefined;
      const snippet = (yamlText.split('\n')[(line ?? 1) - 1] || '').slice(0, 200);
      return { message: err.message, line: fileLine, column, snippet };
    }
    return null;
  } catch (e: any) {
    return { message: e.message };
  }
}

export function parseFrontmatter(mdPath: string): ParsedFrontmatter {
  try {
    const raw = fs.readFileSync(mdPath, 'utf8');
    if (!raw.startsWith('---')) return { body: raw, raw };
    const end = raw.indexOf('\n---', 3);
    if (end < 0) return { body: raw, raw };
    const yaml = raw.slice(3, end).trim();
    const body = raw.slice(end + 4).replace(/^\s*\n/, '');
    const meta: Record<string, any> = {};
    let lastKey: string | null = null;
    for (const line of yaml.split('\n')) {
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (m) {
        lastKey = m[1];
        let v: any = m[2].trim();
        if (typeof v === 'string' && v.startsWith('[') && v.endsWith(']')) {
          v = v
            .slice(1, -1)
            .split(',')
            .map(s => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
        } else if (typeof v === 'string') {
          v = v.replace(/^["']|["']$/g, '');
        }
        meta[lastKey] = v;
      } else if (lastKey && line.match(/^\s+-\s+/)) {
        const item = line
          .replace(/^\s+-\s+/, '')
          .trim()
          .replace(/^["']|["']$/g, '');
        if (!Array.isArray(meta[lastKey])) meta[lastKey] = meta[lastKey] ? [meta[lastKey]] : [];
        meta[lastKey].push(item);
      } else if (lastKey && line.match(/^\s+\S/)) {
        meta[lastKey] = (meta[lastKey] || '') + ' ' + line.trim();
      }
    }
    return { meta, body, raw };
  } catch {
    return {};
  }
}

export function extractWhenToUse(body: string | undefined): string | null {
  if (!body) return null;
  const m = body.match(/##\s+(?:When to [Uu]se|언제 쓰는가|언제 사용)[^\n]*\n([\s\S]+?)(?:\n##\s|$)/);
  if (!m) return null;
  return m[1].trim().replace(/\n+/g, ' ').slice(0, 240);
}

export function findSkillMd(skillDir: string): string | null {
  for (const c of ['SKILL.md', 'skill.md', 'README.md']) {
    const p = path.join(skillDir, c);
    if (fs.existsSync(p)) return p;
  }
  try {
    const mds = fs.readdirSync(skillDir).filter(f => f.toLowerCase().endsWith('.md'));
    if (mds.length) return path.join(skillDir, mds[0]);
  } catch {}
  return null;
}

export function describeSkill(dir: string): SkillInfo {
  const md = findSkillMd(dir);
  if (!md) return { mdPath: null, name: path.basename(dir), categories: [] };
  const { meta = {}, body = '', raw = '' } = parseFrontmatter(md);
  const frontmatterError = validateFrontmatter(md);
  const cats = Array.isArray(meta.categories)
    ? meta.categories
    : typeof meta.categories === 'string'
      ? meta.categories
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
  return {
    mdPath: md,
    name: meta.name || path.basename(dir),
    description: meta.description || null,
    whenToUse: extractWhenToUse(body),
    categories: cats,
    frontmatterError,
    license: meta.license || null,
    version: meta.version || null,
    raw,
    body
  };
}
