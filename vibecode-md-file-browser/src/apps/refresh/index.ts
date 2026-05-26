import type { AppModule } from '../_types';
import { manifest } from './manifest';
import { handler } from './handler';

const mod: AppModule = { manifest, handler };
export default mod;
