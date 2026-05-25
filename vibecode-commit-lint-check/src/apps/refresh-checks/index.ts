import type { AppModule } from '../_types';
import { manifest } from './manifest';
import { handler } from './handler';
export default { manifest, handler } satisfies AppModule;
