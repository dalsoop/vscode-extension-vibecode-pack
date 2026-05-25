/// <reference path="../_refs.d.ts" />

namespace DetailClient {
  export const vscode = acquireVsCodeApi();
  export let current: DetailContract.SerializedMcpEntry | undefined;
  export const elements = {
    root: document.getElementById('root')!,
  };
}
