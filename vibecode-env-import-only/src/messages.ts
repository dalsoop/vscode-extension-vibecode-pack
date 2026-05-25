// Wire-format types exchanged between the extension host and the webview.
// Every payload that crosses `postMessage` must be one of these.

import type { L10nBundle } from './l10n-bundle';

export interface EntryView {
  key: string;
  hasValue: boolean;
}

export interface InitMessage {
  type: 'init';
  filename: string;
  entries: EntryView[];
  l10n: L10nBundle;
  keyNamePattern: string;
}

export interface UpdateMessage {
  type: 'update';
  entries: EntryView[];
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type HostToWebview = InitMessage | UpdateMessage | ErrorMessage;

export interface SetValueRequest {
  type: 'setValue';
  key: string;
  value: string;
}

export interface ClearValueRequest {
  type: 'clearValue';
  key: string;
}

export interface AddKeyRequest {
  type: 'addKey';
  key: string;
  value: string;
}

export interface RequestDelete {
  type: 'requestDelete';
  key: string;
}

export interface RenameKeyRequest {
  type: 'renameKey';
  oldKey: string;
  newKey: string;
}

export type WebviewToHost =
  | SetValueRequest
  | ClearValueRequest
  | AddKeyRequest
  | RequestDelete
  | RenameKeyRequest;
