import * as vscode from 'vscode';

export interface L10nBundle {
  eyedropper: string;
  chroma: string;
  crop: string;
  loading: string;
  hex: string;
  rgb: string;
  hsl: string;
  eyedropperHint: string;
  copiedToast: string;

  targetColor: string;
  pickFromImage: string;
  tolerance: string;
  softenEdges: string;
  savePng: string;
  reset: string;

  cropHint: string;
  selectionLabel: string;
  noSelection: string;
  cropAndSave: string;
}

export function getL10nBundle(): L10nBundle {
  return {
    eyedropper: vscode.l10n.t('Eyedropper'),
    chroma: vscode.l10n.t('Chroma Key'),
    crop: vscode.l10n.t('Crop'),
    loading: vscode.l10n.t('Loading…'),
    hex: vscode.l10n.t('Hex'),
    rgb: vscode.l10n.t('RGB'),
    hsl: vscode.l10n.t('HSL'),
    eyedropperHint: vscode.l10n.t('Hover the image to sample, click to copy hex.'),
    copiedToast: vscode.l10n.t('Copied to clipboard.'),

    targetColor: vscode.l10n.t('Target color'),
    pickFromImage: vscode.l10n.t('Pick from image'),
    tolerance: vscode.l10n.t('Tolerance'),
    softenEdges: vscode.l10n.t('Soften edges'),
    savePng: vscode.l10n.t('Save PNG'),
    reset: vscode.l10n.t('Reset'),

    cropHint: vscode.l10n.t('Drag a rectangle on the image. Esc to clear.'),
    selectionLabel: vscode.l10n.t('Selection: {0} × {1} px', '{0}', '{1}'),
    noSelection: vscode.l10n.t('No selection.'),
    cropAndSave: vscode.l10n.t('Crop & Save PNG'),
  };
}
