import { STRATEGY_ID } from '../constants';
import type { CryptoStrategy } from '../types';

/**
 * Passthrough — stores values plaintext. Lets the extension boot and the
 * editor open even before a real encryption strategy is configured. Behavior
 * is identical to the normal (non-encrypted) variant.
 */
export const NoneStrategy: CryptoStrategy = {
  id: STRATEGY_ID.NONE,
  async isReady() {
    return true;
  },
  async encryptValue(value) {
    return value;
  },
  isEncrypted() {
    return false;
  },
  async initialize() {
    // nothing to do
  }
};
