// VSCode adapter for the pure crypto core in packages/vibecode-core/crypto.
// The core is host-agnostic; this file reads the active strategy id from
// vscode settings and delegates to the core resolver. All other consumers
// in this extension import only from `./crypto` (this file), so the import
// surface stays stable.

import * as vscode from 'vscode';
import {
  resolveStrategyById,
  SETTING_KEY,
  type CryptoStrategy,
} from '../../../packages/vibecode-core/crypto';

export async function getActiveStrategy(envUri: vscode.Uri): Promise<CryptoStrategy> {
  const requested = vscode.workspace.getConfiguration().get<string>(SETTING_KEY.STRATEGY);
  return resolveStrategyById(requested, envUri);
}

export {
  STRATEGY_ID,
  SETTING_KEY,
  ENCRYPTED_VALUE_PREFIX,
  ENV_KEYS_FILENAME,
  DOTENV_PUBLIC_KEY_VAR,
} from '../../../packages/vibecode-core/crypto/constants';
export type { StrategyId } from '../../../packages/vibecode-core/crypto/constants';
export type { CryptoStrategy, EnvFileRef } from '../../../packages/vibecode-core/crypto/types';
export {
  bootstrapDotenvxKeys,
  type BootstrapResult,
} from '../../../packages/vibecode-core/crypto/dotenvx';
