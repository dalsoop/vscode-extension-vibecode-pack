import type { AppModule } from './_types';
import initFromTemplate from './init-from-template';
import checkLastCommit from './check-last-commit';
import addTemplate from './add-template';

export const apps: AppModule[] = [initFromTemplate, checkLastCommit, addTemplate];
