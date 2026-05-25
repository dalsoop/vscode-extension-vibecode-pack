import * as vscode from 'vscode';

export interface L10nBundle {
  reload: string;
  editSource: string;
  openExternal: string;
  starting: string;
  serverError: string;
  retry: string;
  openFolderFirst: string;
  openFolderHint: string;
  inspector: string;
  saveSnapshot: string;
  inspectorUnavailable: string;
  snapshotSaved: string;
  openSnapshotFolder: string;
  snapshotFailed: string;
  noPins: string;
  assets: string;
  pins: string;
  selectorLabel: string;
  matchedCss: string;
  computed: string;
  classToggles: string;
  inlineStyle: string;
  forceState: string;
  unpin: string;
  copySelector: string;
  none: string;
  snapshotsHint: string;
  notes: string;
  notesPlaceholder: string;
  changesLabel: string;
  zipAlsoSaved: string;
  device: string;
  deviceAuto: string;
  deviceDesktop: string;
  deviceTablet: string;
  deviceMobile: string;
  tabChanges: string;
  changesEmpty: string;
  addedClasses: string;
  forceStates: string;
  forceStateWarning: string;
}

export function getL10nBundle(): L10nBundle {
  return {
    reload: vscode.l10n.t('Reload'),
    editSource: vscode.l10n.t('Edit Source'),
    openExternal: vscode.l10n.t('Open in External Browser'),
    starting: vscode.l10n.t('Starting preview server…'),
    serverError: vscode.l10n.t('Server error: {0}'),
    retry: vscode.l10n.t('Retry'),
    openFolderFirst: vscode.l10n.t('Open a folder first'),
    openFolderHint: vscode.l10n.t('This unsaved HTML file has no folder to serve from. Save it inside a folder or open a workspace folder.'),
    inspector: vscode.l10n.t('Inspector'),
    saveSnapshot: vscode.l10n.t('Save Snapshot'),
    inspectorUnavailable: vscode.l10n.t('Inspector unavailable (file too large)'),
    snapshotSaved: vscode.l10n.t('Snapshot saved to {0}'),
    openSnapshotFolder: vscode.l10n.t('Open Snapshot Folder'),
    snapshotFailed: vscode.l10n.t('Snapshot failed: {0}'),
    noPins: vscode.l10n.t('No pins yet. Click an element in the preview to inspect it.'),
    assets: vscode.l10n.t('Assets'),
    pins: vscode.l10n.t('Pins'),
    selectorLabel: vscode.l10n.t('Selector'),
    matchedCss: vscode.l10n.t('Matched CSS'),
    computed: vscode.l10n.t('Computed'),
    classToggles: vscode.l10n.t('Class toggles'),
    inlineStyle: vscode.l10n.t('Inline style'),
    forceState: vscode.l10n.t('Force state'),
    unpin: vscode.l10n.t('Unpin'),
    copySelector: vscode.l10n.t('Copy selector'),
    none: vscode.l10n.t('(none)'),
    snapshotsHint: vscode.l10n.t('Snapshots are written to .vibecode/browser-preview/ — added to .gitignore automatically.'),
    notes: vscode.l10n.t('Notes'),
    notesPlaceholder: vscode.l10n.t('Notes for publisher…'),
    changesLabel: vscode.l10n.t('Changes ({0})'),
    zipAlsoSaved: vscode.l10n.t('ZIP also saved'),
    device: vscode.l10n.t('Device'),
    deviceAuto: vscode.l10n.t('Auto'),
    deviceDesktop: vscode.l10n.t('Desktop'),
    deviceTablet: vscode.l10n.t('Tablet'),
    deviceMobile: vscode.l10n.t('Mobile'),
    tabChanges: vscode.l10n.t('Changes'),
    changesEmpty: vscode.l10n.t('No changes yet — toggle a class, add inline style, change force state, or write notes.'),
    addedClasses: vscode.l10n.t('Added classes'),
    forceStates: vscode.l10n.t('Force states'),
    forceStateWarning: vscode.l10n.t('Some hover/focus rules in external stylesheets are not simulatable (cross-origin).')
  };
}
