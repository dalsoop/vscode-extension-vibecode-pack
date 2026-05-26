import type { AppModule } from './_types';
import refresh from './refresh';
import openPreview from './open-preview';
import openSource from './open-source';
import revealInExplorer from './reveal-in-explorer';
import copyPath from './copy-path';
import openSettings from './open-settings';

export const apps: AppModule[] = [
  refresh,
  openPreview,
  openSource,
  revealInExplorer,
  copyPath,
  openSettings
];
