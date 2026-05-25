import type { AppModule } from './_types';
import initTemplateHere from './init-template-here';
import checkUpstream from './check-upstream';
import applyTemplate from './apply-template';
import refreshTemplates from './refresh-templates';

export const apps: AppModule[] = [
  initTemplateHere,
  checkUpstream,
  applyTemplate,
  refreshTemplates
];
