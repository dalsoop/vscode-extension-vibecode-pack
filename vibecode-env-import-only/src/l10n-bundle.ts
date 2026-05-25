// Strongly-typed L10n bundle sent to the webview at init.
// Adding a new UI string is a 2-step change: extend `L10nBundle`, then add it in `getL10nBundle()`.
// The translation itself lives in `i18n/<locale>.json` (runtime block) — no changes needed here.

import * as vscode from 'vscode';

export interface L10nBundle {
  // Header
  title: string;
  hint: string;

  // Add-new-key section
  addSectionTitle: string;
  keyPlaceholder: string;
  add: string;

  // Existing keys section
  keysSectionTitle: string;
  set: string;
  empty: string;
  placeholderEmpty: string;
  placeholderSet: string;
  clear: string;
  rename: string;
  delete: string;
  save: string;
  cancel: string;
  noKeys: string;

  // Validation (client-side preview; server re-validates)
  invalidKeyName: string;
  keyExists: string;

  // Example/schema sync section
  exampleSectionTitle: string;
  exampleFoundAt: string;
  exampleNotFound: string;
  missingKeysTitle: string;
  extraKeysTitle: string;
  importMissing: string;
  noDiff: string;

  // Footer
  saveHint: string;
}

export function getL10nBundle(): L10nBundle {
  return {
    title: vscode.l10n.t('.env import (values hidden — paste only)'),
    hint: vscode.l10n.t('Click an input and paste (⌘V). Typing is disabled for values. Pasted values are not displayed.'),

    addSectionTitle: vscode.l10n.t('Add new key'),
    keyPlaceholder: vscode.l10n.t('KEY_NAME'),
    add: vscode.l10n.t('Add'),

    keysSectionTitle: vscode.l10n.t('Keys'),
    set: vscode.l10n.t('··· (set)'),
    empty: vscode.l10n.t('(empty)'),
    placeholderEmpty: vscode.l10n.t('Paste value…'),
    placeholderSet: vscode.l10n.t('Paste to overwrite…'),
    clear: vscode.l10n.t('Clear'),
    rename: vscode.l10n.t('Rename'),
    delete: vscode.l10n.t('Delete'),
    save: vscode.l10n.t('Save'),
    cancel: vscode.l10n.t('Cancel'),
    noKeys: vscode.l10n.t('No keys yet. Add one below.'),

    invalidKeyName: vscode.l10n.t('Invalid key name. Use letters, digits, underscore; start with a letter or underscore.'),
    keyExists: vscode.l10n.t('Key "{0}" already exists.'),

    exampleSectionTitle: vscode.l10n.t('Schema (.env.example)'),
    exampleFoundAt: vscode.l10n.t('Schema: {0}'),
    exampleNotFound: vscode.l10n.t('No .env.example / .env.template found in this folder.'),
    missingKeysTitle: vscode.l10n.t('Missing in this file (declared in schema):'),
    extraKeysTitle: vscode.l10n.t('Extra in this file (not in schema):'),
    importMissing: vscode.l10n.t('Add all missing keys (empty values)'),
    noDiff: vscode.l10n.t('In sync with schema.'),

    saveHint: vscode.l10n.t('Changes are written immediately. Save with ⌘S / Ctrl+S if you want to persist explicitly (auto-save respects your VSCode settings).')
  };
}
