import type { AppModule } from './_types';
import initFromTemplate from './init-from-template';
import checkLastCommit from './check-last-commit';
import addTemplate from './add-template';
import applyTemplate from './apply-template';
import refreshTree from './refresh-tree';

export const apps: AppModule[] = [initFromTemplate, checkLastCommit, addTemplate, applyTemplate, refreshTree];
