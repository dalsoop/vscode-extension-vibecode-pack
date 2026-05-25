import type { AppFactory } from './_types';
import refresh from './refresh';
import toggleView from './toggleView';
import openSettings from './openSettings';
export const apps: AppFactory[] = [refresh, toggleView, openSettings];
