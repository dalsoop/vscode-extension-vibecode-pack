// Pure strategy registry + id-based resolver. No editor-runtime deps —
// consumers (VSCode extension, CLI, tests) pick the active id elsewhere
// and call resolveStrategyById to get the concrete CryptoStrategy.
//
// To add a new backend:
//   1. Add an entry to STRATEGY_ID in ./constants.ts
//   2. Implement CryptoStrategy under ./<id>/index.ts
//   3. Register it in REGISTRY below

import { STRATEGY_ID, type StrategyId } from './constants';
import type { CryptoStrategy, EnvFileRef } from './types';
import { NoneStrategy } from './none';
import { DotenvxStrategy } from './dotenvx';
import { InfisicalStrategy } from './infisical';

const REGISTRY: Record<StrategyId, CryptoStrategy> = {
  [STRATEGY_ID.NONE]: NoneStrategy,
  [STRATEGY_ID.DOTENVX]: DotenvxStrategy,
  [STRATEGY_ID.INFISICAL]: InfisicalStrategy
};

/**
 * Resolve a strategy by id for a given .env file. Falls back to NoneStrategy
 * when the requested id is unknown or its workspace prerequisites are unmet.
 *
 * Pure function — does not read any host config. Callers read the id from
 * wherever (vscode settings, CLI flag, env var) and pass it in.
 */
export async function resolveStrategyById(
  requestedId: string | null | undefined,
  envRef: EnvFileRef
): Promise<CryptoStrategy> {
  const id = isStrategyId(requestedId) ? requestedId : STRATEGY_ID.NONE;
  const candidate = REGISTRY[id] ?? NoneStrategy;
  if (await candidate.isReady(envRef)) return candidate;
  return NoneStrategy;
}

export function isStrategyId(value: unknown): value is StrategyId {
  return typeof value === 'string' && (Object.values(STRATEGY_ID) as string[]).includes(value);
}

export { STRATEGY_ID, SETTING_KEY } from './constants';
export type { StrategyId } from './constants';
export type { CryptoStrategy, EnvFileRef } from './types';
