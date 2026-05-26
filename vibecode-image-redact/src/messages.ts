import type { L10nBundle } from './l10n-bundle';

export interface InitMessage {
  type: 'init';
  imageSrc: string;
  basename: string;
  l10n: L10nBundle;
}

export type HostToWebview = InitMessage;

export interface SavePngRequest {
  type: 'savePng';
  base64: string;
}

export type WebviewToHost = SavePngRequest;
