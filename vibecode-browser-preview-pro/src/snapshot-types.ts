export interface PickComputed {
  display?: string;
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  width?: string;
  height?: string;
  padding?: string;
  margin?: string;
  border?: string;
  borderRadius?: string;
  color?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  textAlign?: string;
  opacity?: string;
  transform?: string;
  boxShadow?: string;
}

export interface MatchedRule {
  selector: string;
  source: string;
  declarations: string;
}

export interface PickOverrides {
  classToggles: { name: string; enabled: boolean }[];
  inlineStyle: string;
  forceStates: ('hover' | 'focus' | 'focus-visible' | 'active')[];
  notes: string;
}

export interface PickData {
  id: number;
  selector: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  matchedCSS: MatchedRule[];
  computed: PickComputed;
  overrides: PickOverrides;
}

export interface AssetData {
  url: string;
  type: 'stylesheet' | 'script' | 'image' | 'font' | 'other';
  sourcePath: string | null;
  size: number | null;
  mime: string | null;
}

export interface Delta {
  classes: { added: string[]; removed: string[] };
  inlineStyle: { before: string; after: string; changed: boolean };
  forceStates: { before: ('hover' | 'focus' | 'focus-visible' | 'active')[]; after: ('hover' | 'focus' | 'focus-visible' | 'active')[]; changed: boolean };
  notes: { before: string; after: string; changed: boolean };
  computed: Record<string, { before: string; after: string }>;
}

export interface ChangeData {
  pickId: number;
  selector: string;
  delta: Delta;
  hasAnyChange: boolean;
}

export interface SnapshotPayload {
  outerHTML: string;
  picks: PickData[];
  assets: AssetData[];
  changes: ChangeData[];
  viewport: { width: number; height: number };
  userAgent: string;
  forceRules: string[];
}

export interface SnapshotResult {
  folderAbsPath: string;
  folderRelPath: string;
  zipAbsPath: string | null;
  timestampLocal: string;
}
