import type { AppModule } from './_types';
import initFromTemplate from './init-from-template';
import checkLastCommit from './check-last-commit';
import addTemplate from './add-template';
import applyTemplate from './apply-template';
import refreshTree from './refresh-tree';
import openSettings from './open-settings';
import runAllChecks from './run-all-checks';
import runCheck from './run-check';
import refreshChecks from './refresh-checks';
import revealChecksFolder from './reveal-checks-folder';
import scaffoldDefaultChecks from './scaffold-default-checks';
import showCheckOutput from './show-check-output';

export const apps: AppModule[] = [
  initFromTemplate,
  checkLastCommit,
  addTemplate,
  applyTemplate,
  refreshTree,
  openSettings,
  runAllChecks,
  runCheck,
  refreshChecks,
  revealChecksFolder,
  scaffoldDefaultChecks,
  showCheckOutput
];
