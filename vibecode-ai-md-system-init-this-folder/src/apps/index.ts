import type { AppModule } from './_types';
import initTemplateHere from './init-template-here';
import checkUpstream from './check-upstream';
import applyTemplate from './apply-template';
import openTemplatesFolder from './open-templates-folder';
import promoteTemplate from './promote-template';
import refreshTemplates from './refresh-templates';
import deleteUserTemplate from './delete-user-template';
import renameUserTemplate from './rename-user-template';
import revealTemplateSource from './reveal-template-source';
import reinstallTool from './reinstall-tool';

export const apps: AppModule[] = [
  initTemplateHere,
  checkUpstream,
  applyTemplate,
  openTemplatesFolder,
  promoteTemplate,
  refreshTemplates,
  deleteUserTemplate,
  renameUserTemplate,
  revealTemplateSource,
  reinstallTool
];
