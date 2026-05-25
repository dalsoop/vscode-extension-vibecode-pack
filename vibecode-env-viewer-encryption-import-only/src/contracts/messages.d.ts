// Ext ↔ webview message contracts. Ambient namespace — no import/export. Both
// the extension TypeScript build and the webview-client outFile build pick
// this up automatically by being included in their respective tsconfigs.
//
// When adding a new message variant: extend the discriminated union here,
// then handle the new `type` in HubProvider.onMessage (ext side) and the
// orchestrator switch in hub.client.ts (view side). TypeScript exhaustiveness
// will surface any case you missed.

declare namespace Contracts {
  type StrategyId = 'none' | 'dotenvx' | 'infisical';

  interface HubInitPayload {
    strategy: StrategyId;
    files: HubFileSummary[];
    locale: HubLocale;
  }

  interface HubFileSummary {
    fsPath: string;
    relativePath: string;
    state: HubFileState;
    hasKeysFile: boolean;
  }

  type HubFileState =
    | { kind: 'empty'; total: 0 }
    | { kind: 'plaintext'; total: number }
    | { kind: 'encrypted'; total: number }
    | { kind: 'mixed'; total: number; encrypted: number };

  /** Pre-translated strings shipped to the webview at init / locale change. */
  interface HubLocale {
    strategy: string;
    workspaceFiles: string;
    emptyState: string;
    openEncrypted: string;
    enableEncryption: string;
    runtimeHint: string;
    stateEncrypted: string; // template "{0} keys · all encrypted"
    stateMixed: string;     // template "{0} keys · {1} encrypted"
    statePlaintext: string; // template "{0} keys · plaintext"
  }

  type HubMsgFromExt =
    | { type: 'init'; payload: HubInitPayload }
    | { type: 'update'; payload: HubInitPayload };

  type HubMsgFromView =
    | { type: 'ready' }
    | { type: 'selectStrategy' }
    | { type: 'openEncrypted'; fsPath: string }
    | { type: 'enableEncryption'; fsPath: string };
}
