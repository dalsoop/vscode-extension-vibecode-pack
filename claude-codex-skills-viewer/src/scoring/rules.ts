// Shared deterministic checks used by all scorers.

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2900}-\u{297F}]/u;

export function hasEmoji(s?: string | null): boolean {
  return !!s && EMOJI_RE.test(s);
}
export function countLines(s?: string): number {
  return s ? s.split('\n').length : 0;
}

export function validHeadings(body: string): boolean {
  let last = 0;
  for (const m of body.matchAll(/^(#{1,6})\s/gm)) {
    const lvl = m[1].length;
    if (last && lvl > last + 1) return false;
    last = lvl;
  }
  return true;
}

export function countH1(body: string): number {
  let n = 0;
  for (const _ of body.matchAll(/^#\s/gm)) n++;
  return n;
}

export function hasCodeBlock(body: string): boolean {
  return /```/.test(body);
}
export function hasExamplesSection(body: string): boolean {
  return /^##\s+(?:Examples?|예제|예시|사용 예|How to use|사용법)/im.test(body);
}
export function hasTriggerHints(body: string, desc: string): boolean {
  return /(?:when|trigger|use this|언제|사용하면|use when|"[^"]+"|'[^']+')/i.test(body + ' ' + desc);
}

export function bucketColor(pct: number): 'green' | 'lime' | 'yellow' | 'orange' | 'red' {
  if (pct >= 90) return 'green';
  if (pct >= 75) return 'lime';
  if (pct >= 60) return 'yellow';
  if (pct >= 40) return 'orange';
  return 'red';
}

export function bucketGrade(pct: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (pct >= 90) return 'A';
  if (pct >= 75) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}
