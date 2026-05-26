import * as path from 'path';

/**
 * Resolve the extension root directory from a built dist/extension.js location.
 */
export function extensionRoot(): string {
  return path.resolve(__dirname, '..', '..');
}
