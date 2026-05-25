// Wire-format types exchanged between the extension host and the webview.
// Every payload that crosses `postMessage` must be one of these.

import type { L10nBundle } from './l10n-bundle';

export interface EntryView {
  key: string;
  hasValue: boolean;
}

export interface ExampleInfo {
  /** Absolute path of the resolved example file, or null if none found. */
  examplePath: string | null;
  /** Keys in example that are missing from the primary. */
  missingKeys: string[];
  /** Keys in the primary that are not declared in the example. */
  extraKeys: string[];
}

export interface InitMessage {
  type: 'init';
  filename: string;
  entries: EntryView[];
  l10n: L10nBundle;
  keyNamePattern: string;
  example: ExampleInfo;
}

export interface UpdateMessage {
  type: 'update';
  entries: EntryView[];
  example: ExampleInfo;
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

export interface ImportFromExampleRequest {
  type: 'importFromExample';
}

export type WebviewToHost =
  | SetValueRequest
  | ClearValueRequest
  | AddKeyRequest
  | RequestDelete
  | RenameKeyRequest
  | ImportFromExampleRequest;
