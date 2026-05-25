import type { ExtensionApi } from '../_types';
export const create = (api: ExtensionApi) => () => api.refresh();
