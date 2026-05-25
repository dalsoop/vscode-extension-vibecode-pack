import type { StrategyId } from './constants';

/**
 * Minimal handle to a target .env file. Decoupled from any host (vscode.Uri,
 * Node fs, browser File) so this package stays free of editor-runtime deps.
 * vscode.Uri already satisfies this shape structurally, so call sites in the
 * extension can pass `vscode.Uri` values unchanged.
 */
export interface EnvFileRef {
  readonly fsPath: string;
}

/**
 * Contract every encryption backend implements. The editor calls these at
 * value-write time; key-name operations bypass crypto entirely.
 *
 * Implementations live in `./<id>/index.ts` and register themselves in
 * `./index.ts`.
 */
export interface CryptoStrategy {
  readonly id: StrategyId;

  /**
   * Workspace prerequisites for this strategy. e.g. dotenvx requires a
   * sibling `.env.keys` file. The resolver uses this to fall back to
   * NoneStrategy when prerequisites are unmet.
   */
  isReady(envRef: EnvFileRef): Promise<boolean>;

  /**
   * Transform a plaintext value into its on-disk storage form. For passthrough
   * strategies this returns the input unchanged. Empty string in → empty string
   * out (no strategy ever encrypts an empty value).
   */
  encryptValue(value: string, envRef: EnvFileRef): Promise<string>;

  /** Whether the stored value matches this strategy's encrypted format. */
  isEncrypted(stored: string): boolean;

  /**
   * One-shot bootstrap: generate keypair / write `.env.keys` / update
   * `.gitignore` / etc. No-op for strategies that need no setup.
   */
  initialize(envRef: EnvFileRef): Promise<void>;
}
