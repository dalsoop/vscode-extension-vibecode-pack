// Strategy registry + resolver. To add a new backend:
//   1. Add an entry to STRATEGY_ID in ./constants.ts
//   2. Implement CryptoStrategy under ./<id>/index.ts
//   3. Register it in REGISTRY below
//
// Call sites only ever see CryptoStrategy — they never branch on the id.

import * as vscode from 'vscode';
import { STRATEGY_ID, SETTING_KEY, type StrategyId } from './constants';
import type { CryptoStrategy } from './types';
import { NoneStrategy } from './none';
import { DotenvxStrategy } from './dotenvx';
import { InfisicalStrategy } from './infisical';

const REGISTRY: Record<StrategyId, CryptoStrategy> = {
  [STRATEGY_ID.NONE]: NoneStrategy,
  [STRATEGY_ID.DOTENVX]: DotenvxStrategy,
  [STRATEGY_ID.INFISICAL]: InfisicalStrategy
};

/**
 * Resolve the active strategy for a given .env file. Reads the user setting
 * and falls back to `none` if the requested strategy is unknown or its
 * workspace prerequisites are not satisfied.
 */
export async function getActiveStrategy(envUri: vscode.Uri): Promise<CryptoStrategy> {
  const requested = readStrategySetting();
  const candidate = REGISTRY[requested] ?? NoneStrategy;
  if (await candidate.isReady(envUri)) return candidate;
  return NoneStrategy;
}

function readStrategySetting(): StrategyId {
  const raw = vscode.workspace.getConfiguration().get<string>(SETTING_KEY.STRATEGY);
  return isStrategyId(raw) ? raw : STRATEGY_ID.NONE;
}

function isStrategyId(value: unknown): value is StrategyId {
  return typeof value === 'string' && (Object.values(STRATEGY_ID) as string[]).includes(value);
}

export { STRATEGY_ID, SETTING_KEY } from './constants';
export type { CryptoStrategy } from './types';
export type { StrategyId } from './constants';
