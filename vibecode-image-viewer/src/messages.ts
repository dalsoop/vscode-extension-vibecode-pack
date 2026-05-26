
import type { L10nBundle } from './l10n-bundle';

export interface FileInfo {
  path: string;
  basename: string;
  sizeBytes: number;
  mtimeMs: number;
  format: string;
  width: number | null;
  height: number | null;
}

export interface CameraSummary {
  make: string | null;
  model: string | null;
  lens: string | null;
  exposureTime: string | null;
  fNumber: string | null;
  iso: number | null;
  focalLength: string | null;
  dateTaken: string | null;
  software: string | null;
  orientation: string | null;
  colorSpace: string | null;
  bitDepth: number | null;
}

export interface GpsInfo {
  latitude: number;
  longitude: number;
  altitude: number | null;
}

export interface InitMessage {
  type: 'init';
  file: FileInfo;
  /** Webview-safe URI string for <img src>. Null for HEIC/HEIF (not natively renderable). */
  imageSrc: string | null;
  /** True if format is HEIC/HEIF and webview can't render it. */
  unsupportedPreview: boolean;
  camera: CameraSummary;
  gps: GpsInfo | null;
  /** Full parsed metadata object (all segments merged). Empty if none. */
  rawExif: Record<string, unknown>;
  /** Per-segment metadata (ifd0, exif, gps, iptc, xmp, icc, jfif, ihdr, ...). */
  metaSegments: Record<string, Record<string, unknown>>;
  hasExif: boolean;
  metadataError: string | null;
  l10n: L10nBundle;
}

export type HostToWebview = InitMessage;

export interface CopyTextRequest {
  type: 'copyText';
  text: string;
  toast: string;
}

export interface RevealInOsRequest {
  type: 'revealInOs';
}

export interface OpenWithDefaultAppRequest {
  type: 'openWithDefaultApp';
}

export interface ReopenAsTextRequest {
  type: 'reopenAsText';
}

export interface OpenUrlRequest {
  type: 'openUrl';
  url: string;
}

export type WebviewToHost =
  | CopyTextRequest
  | RevealInOsRequest
  | OpenWithDefaultAppRequest
  | ReopenAsTextRequest
  | OpenUrlRequest;
