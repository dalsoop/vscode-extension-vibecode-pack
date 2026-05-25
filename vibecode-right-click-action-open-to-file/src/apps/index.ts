import type { AppModule } from './_types';
import openHtmlInBrowser from './open-html-in-browser';
import openFolderInNewWindow from './open-folder-in-new-window';
import revealInOS from './reveal-in-os';
import copyAbsolutePath from './copy-absolute-path';
import openInTerminal from './open-in-terminal';

export const apps: AppModule[] = [
  openHtmlInBrowser,
  openFolderInNewWindow,
  revealInOS,
  copyAbsolutePath,
  openInTerminal
];
