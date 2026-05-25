declare namespace Contracts {
  // ─── Common ───────────────────────────────────────────────────────────

  interface ScoreAxes {
    clarity: number;
    completeness: number;
    examples: number;
    focus: number;
  }

  // ─── Hub sidebar payloads ─────────────────────────────────────────────

  interface Tab {
    id: TabId;
    label: string;
    desc: string;
  }
  interface Segment {
    id: string;
    label: string;
  }
  interface ActiveFolder {
    dir: string | null;
    label: string | null;
  }

  interface ItemPayloadScore {
    pct: number;
    grade: string;
    color: string;
    axes?: ScoreAxes;
    issues?: string[];
  }

  // Prominent right-aligned count badge, rendered as "({count})". Free-form
  // unit so data sources can express semantics ('lines' for files, 'items'
  // for folders, 'entries' for collections) — UI ignores the unit string
  // today, but it stays addressable for tooltips / future formatting.
  interface ItemMetric {
    count: number;
    unit: string;
  }

  interface ItemPayload {
    id: string;
    title: string;
    subtitle?: string;
    meta?: string;
    badge?: string;
    path?: string;
    mdPath?: string | null;
    exists?: boolean;
    hasBlock?: boolean;
    tool?: string;
    kind?: string;
    readOnly?: boolean;
    score?: ItemPayloadScore;
    actions?: ActionName[];
    // Optional folder-depth children. When non-empty, the hub renders this
    // node with an expand/collapse chevron and indents the children.
    children?: ItemPayload[];
    // Optional prominent count badge ("(152)").
    metric?: ItemMetric;
  }

  interface Group {
    title: string;
    items: ItemPayload[];
  }

  // ─── Preview pane payloads ────────────────────────────────────────────

  interface PreviewSectionRule {
    id: string;
    pass: boolean;
    weight: number;
    message: string;
  }
  interface PreviewSectionScore {
    pct: number;
    earned: number;
    total: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    color: 'green' | 'lime' | 'yellow' | 'orange' | 'red';
    rules: PreviewSectionRule[];
    issues: string[];
  }
  interface PreviewSection {
    id: string;
    canonical?: string;
    kind: 'frontmatter' | 'title' | 'heading';
    level?: number;
    heading?: string;
    raw: string;
    body: string;
    rendered: string;
    score: PreviewSectionScore;
  }
  interface PreviewAuxFile {
    name: string;
    abs: string;
    size: number;
    age: string;
  }
  interface PreviewMirrorEntry {
    source: 'group' | 'skill-by-name';
    groupLabel?: string;
    alwaysMirror?: boolean;
    targets: string[];
  }
  interface PreviewMirrorDriftEntry {
    path: string;
    exists: boolean;
    inSync: boolean;
  }
  interface PreviewFrontmatterError {
    message: string;
    line?: number;
    column?: number;
    snippet?: string;
  }
  interface PreviewMeta {
    name: string;
    description?: string;
    source: { label: string; scope: string; readOnly: boolean };
    abs: string;
    categories: string[];
    totalScore: PreviewSectionScore;
    lines: number;
    chars: number;
    ageDays: number;
    frontmatterError?: PreviewFrontmatterError | null;
    showScoreBreakdown: boolean;
    mirrors: PreviewMirrorEntry[];
    mirrorDrift: PreviewMirrorDriftEntry[];
  }
  interface PreviewTocEntry {
    id: string;
    label: string;
    level: number;
    score: number;
  }
  interface PreviewPayload {
    meta: PreviewMeta;
    sections: PreviewSection[];
    aux: PreviewAuxFile[];
    toc: PreviewTocEntry[];
    i18n: WebviewI18n;
  }

  // ─── Settings panel payload ───────────────────────────────────────────

  interface SettingsPayload {
    config: CcSkillsConfig;
    favoritesCount: number;
    extensionVersion: string;
    mirrorPresets: PresetInfo[];
    i18n: WebviewI18n;
  }
}
