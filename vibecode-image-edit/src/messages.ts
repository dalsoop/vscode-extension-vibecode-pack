
import type { L10nBundle } from './l10n-bundle';

export interface InitMessage {
  type: 'init';
  /** Webview-safe URI for <img src>. */
  imageSrc: string;
  /** Original filename (basename including extension). */
  basename: string;
  l10n: L10nBundle;
}

export type HostToWebview = InitMessage;

export interface SavePngRequest {
  /** Base64-encoded PNG bytes (without `data:` prefix). */
  type: 'savePng';
  base64: string;
  /** Human-readable suffix for the toast, e.g. "chroma" or "crop". */
  suffix: string;
}

export interface CopyTextRequest {
  type: 'copyText';
  text: string;
}

export type WebviewToHost = SavePngRequest | CopyTextRequest;
