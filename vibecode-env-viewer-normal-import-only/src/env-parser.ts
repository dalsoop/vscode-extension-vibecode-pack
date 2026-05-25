// Minimal .env parser/serializer that preserves original lines (comments, blanks, ordering).
// Only KEY=VALUE lines get updated; everything else round-trips verbatim.
//
// Supported:
//   KEY=value
//   KEY="value with spaces"
//   KEY='value'
//   # comment
//   <blank>
//
// Not supported (treated as opaque kv with the raw value):
//   multi-line values, backslash escapes inside quotes, export prefix

export interface EnvKvLine {
  type: 'kv';
  key: string;
  /** Raw value substring (after `=`, with surrounding quotes if any). */
  rawValue: string;
  /** Whether the parsed value is non-empty (after unquoting). */
  hasValue: boolean;
}

export interface EnvOtherLine {
  type: 'comment' | 'blank';
  raw: string;
}

export type EnvLine = EnvKvLine | EnvOtherLine;

const KV_RE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

export function parse(text: string): EnvLine[] {
  const lines = text.split(/\r?\n/);
  // Drop trailing empty line that comes from a final newline — we re-add it on serialize.
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  return lines.map(raw => {
    const trimmed = raw.trim();
    if (trimmed === '') return { type: 'blank', raw } as EnvOtherLine;
    if (trimmed.startsWith('#')) return { type: 'comment', raw } as EnvOtherLine;
    const m = raw.match(KV_RE);
    if (!m) return { type: 'comment', raw } as EnvOtherLine;
    const [, key, rawValue] = m;
    return { type: 'kv', key, rawValue, hasValue: unquote(rawValue).length > 0 };
  });
}

export function serialize(lines: EnvLine[]): string {
  const body = lines
    .map(l => {
      if (l.type === 'kv') return `${l.key}=${l.rawValue}`;
      return l.raw;
    })
    .join('\n');
  return body + '\n';
}

/** Replace the rawValue of a given key. If the key is missing, append a new kv line. */
export function setValue(lines: EnvLine[], key: string, value: string): EnvLine[] {
  const quoted = quote(value);
  const idx = lines.findIndex(l => l.type === 'kv' && l.key === key);
  if (idx >= 0) {
    const next = lines.slice();
    next[idx] = { type: 'kv', key, rawValue: quoted, hasValue: value.length > 0 };
    return next;
  }
  return [...lines, { type: 'kv', key, rawValue: quoted, hasValue: value.length > 0 }];
}

/** Return the list of KEY entries with their hasValue flag — what the webview needs to render. */
export function keyList(lines: EnvLine[]): Array<{ key: string; hasValue: boolean }> {
  const seen = new Map<string, boolean>();
  for (const l of lines) {
    if (l.type === 'kv') seen.set(l.key, l.hasValue);
  }
  return Array.from(seen, ([key, hasValue]) => ({ key, hasValue }));
}

/** Drop every kv line whose key matches. (Comments/blanks are preserved.) */
export function removeKey(lines: EnvLine[], key: string): EnvLine[] {
  return lines.filter(l => !(l.type === 'kv' && l.key === key));
}

/** Rename every kv line with `oldKey` to `newKey`, preserving the raw value. */
export function renameKey(lines: EnvLine[], oldKey: string, newKey: string): EnvLine[] {
  return lines.map(l => (l.type === 'kv' && l.key === oldKey ? { ...l, key: newKey } : l));
}

export const KEY_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function unquote(raw: string): string {
  const t = raw.trim();
  if (t.length >= 2) {
    const first = t[0];
    const last = t[t.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return t.slice(1, -1);
    }
  }
  return t;
}

/** Quote a value if it contains whitespace, quotes, or shell-meaningful chars. */
function quote(value: string): string {
  if (value === '') return '';
  if (/^[A-Za-z0-9_.\-/:@]+$/.test(value)) return value;
  // Prefer double-quote; escape any embedded double quotes and backslashes.
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
