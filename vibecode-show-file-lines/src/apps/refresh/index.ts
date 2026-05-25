import type { AppFactory } from '../_types';
import { manifest } from './manifest';
import { create } from './handler';
export default { manifest, create } satisfies AppFactory;
