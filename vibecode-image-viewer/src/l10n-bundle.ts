
import * as vscode from 'vscode';

export interface L10nBundle {
  imageLabel: string;
  loading: string;
  loadError: string;
  metadataError: string;

  fit: string;
  actual: string;
  zoomOut: string;
  zoomIn: string;
  backgroundLabel: string;
  bgChecker: string;
  bgDark: string;
  bgLight: string;

  fileTitle: string;
  pathLabel: string;
  sizeLabel: string;
  dimensionsLabel: string;
  formatLabel: string;
  modifiedLabel: string;
  colorSpaceLabel: string;
  bitDepthLabel: string;

  cameraTitle: string;
  cameraLabel: string;
  lensLabel: string;
  exposureLabel: string;
  apertureLabel: string;
  isoLabel: string;
  focalLengthLabel: string;
  dateTakenLabel: string;
  softwareLabel: string;
  orientationLabel: string;

  gpsTitle: string;
  openInGoogleMaps: string;
  copyCoordinates: string;

  rawTitle: string;
  showAll: string;
  hide: string;
  copyAsJson: string;
  noExif: string;

  segIfd0: string;
  segIfd1: string;
  segExif: string;
  segGps: string;
  segInterop: string;
  segThumbnail: string;
  segIptc: string;
  segXmp: string;
  segIcc: string;
  segJfif: string;
  segIhdr: string;

  tabOverview: string;
  tabExif: string;
  tabPngText: string;
  tabRaw: string;
  openSettings: string;

  noPngText: string;
  compressed: string;
  compressedTooltip: string;
  parseError: string;
  itxtTooltip: string;
  textTooltip: string;
  ztxtTooltip: string;
  copy: string;
  copied: string;

  coordsCopied: string;
  jsonCopied: string;
  pathCopied: string;
  openFolder: string;
  copyPath: string;
  openOsDefault: string;
  reopenAsText: string;
}

export function getL10nBundle(): L10nBundle {
  return {
    imageLabel: vscode.l10n.t('Image'),
    loading: vscode.l10n.t('Loading…'),
    loadError: vscode.l10n.t(
      "Failed to load image. The format may not be supported by VSCode's webview renderer (e.g., HEIC).",
    ),
    metadataError: vscode.l10n.t('Could not read image metadata: {0}', ''),

    fit: vscode.l10n.t('Fit'),
    actual: vscode.l10n.t('Actual'),
    zoomOut: vscode.l10n.t('Zoom out'),
    zoomIn: vscode.l10n.t('Zoom in'),
    backgroundLabel: vscode.l10n.t('Background:'),
    bgChecker: vscode.l10n.t('Checker'),
    bgDark: vscode.l10n.t('Dark'),
    bgLight: vscode.l10n.t('Light'),

    fileTitle: vscode.l10n.t('File'),
    pathLabel: vscode.l10n.t('Path'),
    sizeLabel: vscode.l10n.t('Size'),
    dimensionsLabel: vscode.l10n.t('Dimensions'),
    formatLabel: vscode.l10n.t('Format'),
    modifiedLabel: vscode.l10n.t('Modified'),
    colorSpaceLabel: vscode.l10n.t('Color space'),
    bitDepthLabel: vscode.l10n.t('Bit depth'),

    cameraTitle: vscode.l10n.t('Camera'),
    cameraLabel: vscode.l10n.t('Camera'),
    lensLabel: vscode.l10n.t('Lens'),
    exposureLabel: vscode.l10n.t('Exposure'),
    apertureLabel: vscode.l10n.t('Aperture'),
    isoLabel: vscode.l10n.t('ISO'),
    focalLengthLabel: vscode.l10n.t('Focal length'),
    dateTakenLabel: vscode.l10n.t('Date taken'),
    softwareLabel: vscode.l10n.t('Software'),
    orientationLabel: vscode.l10n.t('Orientation'),

    gpsTitle: vscode.l10n.t('GPS'),
    openInGoogleMaps: vscode.l10n.t('Open in Google Maps'),
    copyCoordinates: vscode.l10n.t('Copy coordinates'),

    rawTitle: vscode.l10n.t('All EXIF / metadata'),
    showAll: vscode.l10n.t('Show all'),
    hide: vscode.l10n.t('Hide'),
    copyAsJson: vscode.l10n.t('Copy as JSON'),
    noExif: vscode.l10n.t('No EXIF metadata in this file.'),

    segIfd0: vscode.l10n.t('TIFF / IFD0'),
    segIfd1: vscode.l10n.t('Thumbnail IFD (IFD1)'),
    segExif: vscode.l10n.t('EXIF'),
    segGps: vscode.l10n.t('GPS'),
    segInterop: vscode.l10n.t('Interop'),
    segThumbnail: vscode.l10n.t('Thumbnail'),
    segIptc: vscode.l10n.t('IPTC'),
    segXmp: vscode.l10n.t('XMP'),
    segIcc: vscode.l10n.t('ICC Profile'),
    segJfif: vscode.l10n.t('JFIF'),
    segIhdr: vscode.l10n.t('PNG / IHDR'),

    tabOverview: vscode.l10n.t('Overview'),
    tabExif: vscode.l10n.t('EXIF / Segments'),
    tabPngText: vscode.l10n.t('PNG Text'),
    tabRaw: vscode.l10n.t('Raw JSON'),
    openSettings: vscode.l10n.t('Settings'),

    noPngText: vscode.l10n.t('No PNG text chunks (tEXt / zTXt / iTXt) in this file.'),
    compressed: vscode.l10n.t('compressed'),
    compressedTooltip: vscode.l10n.t('Text was zlib-compressed inside the chunk.'),
    parseError: vscode.l10n.t('parse error'),
    itxtTooltip: vscode.l10n.t('iTXt — UTF-8 text chunk. Supports any language (Korean, emoji, full Unicode).'),
    textTooltip: vscode.l10n.t('tEXt — ASCII / Latin-1 only. Non-ASCII characters may be garbled.'),
    ztxtTooltip: vscode.l10n.t('zTXt — zlib-compressed tEXt. ASCII / Latin-1 only.'),
    copy: vscode.l10n.t('Copy'),
    copied: vscode.l10n.t('Copied.'),

    coordsCopied: vscode.l10n.t('Coordinates copied.'),
    jsonCopied: vscode.l10n.t('Metadata copied as JSON.'),
    pathCopied: vscode.l10n.t('Path copied.'),
    openFolder: vscode.l10n.t('Open containing folder'),
    copyPath: vscode.l10n.t('Copy path'),
    openOsDefault: vscode.l10n.t('Open with default OS app'),
    reopenAsText: vscode.l10n.t('Reopen as Text Editor'),
  };
}
