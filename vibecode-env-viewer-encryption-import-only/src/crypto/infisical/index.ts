// Placeholder for an Infisical-backed strategy.
//
// Infisical is a remote secret store — values would not be stored in `.env`
// at rest. Instead `encryptValue` would push the secret to Infisical Cloud
// (or self-hosted) and return a reference token (`infisical:<workspace>/<env>/<path>`)
// that goes into `.env` as the visible "encrypted" value. Runtime decryption
// is handled by Infisical's SDK / CLI.
//
// This file deliberately ships as a registry placeholder so the modular
// folder structure is documented in code rather than only in prose. The
// stub throws on every operation that would need the SDK, while keeping
// `isReady() === false` so the resolver in `../index.ts` silently falls
// back to NoneStrategy until a real implementation lands.
//
// To implement properly we'd need (roughly):
//   - `@infisical/sdk` (or fetch-based client) wired up here
//   - settings for: API URL, workspace ID, environment slug, auth token
//     storage (vscode.SecretStorage, not plain settings)
//   - reference format decision: `infisical:<id>` vs full URL
//   - error handling for network failures + token expiry
//   - `isEncrypted()` matcher for the chosen reference format

import { STRATEGY_ID } from '../constants';
import type { CryptoStrategy } from '../types';

const NOT_IMPLEMENTED =
  'Infisical strategy is not implemented yet — pick `dotenvx` for now, or open the strategy folder to wire up the SDK.';

export const InfisicalStrategy: CryptoStrategy = {
  id: STRATEGY_ID.INFISICAL,

  async isReady() {
    return false;
  },

  async encryptValue() {
    throw new Error(NOT_IMPLEMENTED);
  },

  isEncrypted() {
    return false;
  },

  async initialize() {
    throw new Error(NOT_IMPLEMENTED);
  }
};
