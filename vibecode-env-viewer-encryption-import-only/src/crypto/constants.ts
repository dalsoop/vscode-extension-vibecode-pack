// Constants shared by every crypto strategy. New strategies plug in by adding
// an entry to STRATEGY_ID and registering in `./index.ts`.
//
// IMPORTANT: STRATEGY_ID values are mirrored in package.json under
// `contributes.configuration["vibecodeEnvViewerEncryption.strategy"].enum`.
// When adding a new strategy here, update both places.

export const STRATEGY_ID = {
  /** Passthrough — values stored as-is. Behaviorally equivalent to the normal variant. */
  NONE: 'none',
  /** dotenvx-compatible secp256k1 ECIES encryption. Requires sibling `.env.keys`. */
  DOTENVX: 'dotenvx',
  // Future entries land here. Examples (not yet implemented):
  //   INFISICAL: 'infisical',
  //   AES_GCM:   'aes-gcm',
} as const;

export type StrategyId = (typeof STRATEGY_ID)[keyof typeof STRATEGY_ID];

/** VSCode setting that picks the active strategy. */
export const SETTING_KEY = {
  STRATEGY: 'vibecodeEnvViewerEncryption.strategy',
} as const;

/**
 * Storage-format marker shared by strategies that encrypt-at-rest in the `.env`
 * file itself (dotenvx convention). Strategies that don't store inline (e.g.
 * Infisical refs) define their own marker and ignore this one.
 */
export const ENCRYPTED_VALUE_PREFIX = 'encrypted:';

/** Sibling file holding the private key for strategies that follow dotenvx. */
export const ENV_KEYS_FILENAME = '.env.keys';

/** Variable name dotenvx uses to embed the public key inside `.env`. */
export const DOTENV_PUBLIC_KEY_VAR = 'DOTENV_PUBLIC_KEY';
