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
  forceState: 'hover' | 'focus' | 'active' | null;
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

export interface SnapshotPayload {
  outerHTML: string;
  picks: PickData[];
  assets: AssetData[];
  viewport: { width: number; height: number };
  userAgent: string;
}

export interface SnapshotResult {
  folderAbsPath: string;
  folderRelPath: string;
  timestampLocal: string;
}
