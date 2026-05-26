import * as vscode from 'vscode';

export interface L10nBundle {
  loading: string;
  loadFailed: string;
  page: string;
  ofN: string;
  prevPage: string;
  nextPage: string;
  fitWidth: string;
  fitPage: string;
  zoomOut: string;
  zoomIn: string;
  copyPageText: string;
  pageTextCopied: string;

  metadata: string;
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  created: string;
  modified: string;
  pdfVersion: string;
  pages: string;
  encrypted: string;
  yes: string;
  no: string;

  outline: string;
  noOutline: string;
}

export function getL10nBundle(): L10nBundle {
  return {
    loading: vscode.l10n.t('Loading…'),
    loadFailed: vscode.l10n.t('Failed to load PDF: {0}', '{0}'),
    page: vscode.l10n.t('Page'),
    ofN: vscode.l10n.t('of {0}', '{0}'),
    prevPage: vscode.l10n.t('Previous page'),
    nextPage: vscode.l10n.t('Next page'),
    fitWidth: vscode.l10n.t('Fit width'),
    fitPage: vscode.l10n.t('Fit page'),
    zoomOut: vscode.l10n.t('Zoom out'),
    zoomIn: vscode.l10n.t('Zoom in'),
    copyPageText: vscode.l10n.t('Copy page text'),
    pageTextCopied: vscode.l10n.t('Page text copied.'),

    metadata: vscode.l10n.t('Metadata'),
    title: vscode.l10n.t('Title'),
    author: vscode.l10n.t('Author'),
    subject: vscode.l10n.t('Subject'),
    keywords: vscode.l10n.t('Keywords'),
    creator: vscode.l10n.t('Creator'),
    producer: vscode.l10n.t('Producer'),
    created: vscode.l10n.t('Created'),
    modified: vscode.l10n.t('Modified'),
    pdfVersion: vscode.l10n.t('PDF version'),
    pages: vscode.l10n.t('Pages'),
    encrypted: vscode.l10n.t('Encrypted'),
    yes: vscode.l10n.t('Yes'),
    no: vscode.l10n.t('No'),

    outline: vscode.l10n.t('Outline'),
    noOutline: vscode.l10n.t('No outline.'),
  };
}
