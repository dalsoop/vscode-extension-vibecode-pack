/**
 * Invariants. Nothing here should be tweakable at runtime (see settings for those).
 */

export const EXTENSION_ID = 'vibecodeShowFileLines';
export const VIEW_CONTAINER_ID = 'vibecodeShowFileLines';
export const VIEW_ID = 'vibecodeShowFileLines.lineRanking';

export const CMD_REFRESH = 'vibecodeShowFileLines.refresh';
export const CMD_TOGGLE_VIEW = 'vibecodeShowFileLines.toggleView';
export const CMD_OPEN_SETTINGS = 'vibecodeShowFileLines.openSettings';

export const CFG_TOP_N = 'topN';
export const CFG_WARN_THRESHOLD = 'warnThreshold';
export const CFG_MAX_FILE_SIZE_KB = 'maxFileSizeKB';
export const CFG_RESPECT_GITIGNORE = 'respectGitignore';
export const CFG_RESPECT_FILES_EXCLUDE = 'respectFilesExclude';
export const CFG_DEFAULT_GROUPING = 'defaultGrouping';
export const CFG_ADDITIONAL_BINARY_EXTS = 'additionalBinaryExtensions';

export const VIEW_MODE_FLAT = 'flat-by-lines';
export const VIEW_MODE_GROUP_EXT = 'group-by-ext';

export const IGNORE_SOURCE_GITIGNORE = 'gitignore';
export const IGNORE_SOURCE_LINEIGNORE = 'lineignore';
export const IGNORE_SOURCE_FILES_EXCLUDE = 'files-exclude';

export const LINE_COUNTER_RAW_NEWLINE = 'raw-newline';

export const LINEIGNORE_FILENAME = '.lineignore';
export const GITIGNORE_FILENAME = '.gitignore';

export const WATCH_DEBOUNCE_MS = 250;
export const BINARY_SNIFF_BYTES = 2048;

export const DEFAULT_BINARY_EXTS: readonly string[] = [
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.ico', '.webp', '.svgz',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.class', '.jar', '.war',
  '.woff', '.woff2', '.eot', '.ttf', '.otf',
  '.mp3', '.mp4', '.mov', '.avi', '.mkv', '.wav', '.flac', '.ogg', '.webm',
  '.db', '.sqlite', '.sqlite3',
  '.psd', '.ai', '.sketch', '.fig'
];
