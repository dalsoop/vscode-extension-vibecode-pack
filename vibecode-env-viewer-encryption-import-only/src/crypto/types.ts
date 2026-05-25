import type * as vscode from 'vscode';
import type { StrategyId } from './constants';

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
   * sibling `.env.keys` file. The provider uses this to decide whether to
   * surface the encrypted editor or fall back to the plain text editor.
   */
  isReady(envUri: vscode.Uri): Promise<boolean>;

  /**
   * Transform a plaintext value into its on-disk storage form. For passthrough
   * strategies this returns the input unchanged. Empty string in → empty string
   * out (no strategy ever encrypts an empty value).
   */
  encryptValue(value: string, envUri: vscode.Uri): Promise<string>;

  /** Whether the stored value matches this strategy's encrypted format. */
  isEncrypted(stored: string): boolean;

  /**
   * One-shot bootstrap: generate keypair / write `.env.keys` / update
   * `.gitignore` / etc. No-op for strategies that need no setup.
   */
  initialize(envUri: vscode.Uri): Promise<void>;
}
