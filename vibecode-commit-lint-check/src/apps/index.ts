import type { AppModule } from './_types';
import initFromTemplate from './init-from-template';
import checkLastCommit from './check-last-commit';
import addTemplate from './add-template';
import applyTemplate from './apply-template';
import refreshTree from './refresh-tree';
import openSettings from './open-settings';

export const apps: AppModule[] = [initFromTemplate, checkLastCommit, addTemplate, applyTemplate, refreshTree, openSettings];
