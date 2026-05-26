import * as vscode from 'vscode';

export interface L10nBundle {
  loading: string;
  dragHint: string;

  style: string;
  blur: string;
  pixelate: string;
  solid: string;
  strength: string;
  blockSize: string;
  color: string;

  regions: string;
  noRegions: string;
  remove: string;
  clearAll: string;
  savePng: string;
}

export function getL10nBundle(): L10nBundle {
  return {
    loading: vscode.l10n.t('Loading…'),
    dragHint: vscode.l10n.t('Drag a rectangle to add a redaction. Esc to cancel current drag.'),

    style: vscode.l10n.t('Style'),
    blur: vscode.l10n.t('Blur'),
    pixelate: vscode.l10n.t('Pixelate'),
    solid: vscode.l10n.t('Solid'),
    strength: vscode.l10n.t('Strength'),
    blockSize: vscode.l10n.t('Block size'),
    color: vscode.l10n.t('Color'),

    regions: vscode.l10n.t('Regions'),
    noRegions: vscode.l10n.t('No regions yet — drag on the image to add one.'),
    remove: vscode.l10n.t('Remove'),
    clearAll: vscode.l10n.t('Clear all'),
    savePng: vscode.l10n.t('Save PNG'),
  };
}
