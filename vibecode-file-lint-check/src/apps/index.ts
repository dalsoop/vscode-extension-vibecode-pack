import type { AppModule } from './_types';
import openSettings from './open-settings';
import runAllChecks from './run-all-checks';
import runCheck from './run-check';
import refreshChecks from './refresh-checks';
import revealChecksFolder from './reveal-checks-folder';
import scaffoldDefaultChecks from './scaffold-default-checks';
import showCheckOutput from './show-check-output';

export const apps: AppModule[] = [
  openSettings,
  runAllChecks,
  runCheck,
  refreshChecks,
  revealChecksFolder,
  scaffoldDefaultChecks,
  showCheckOutput
];
