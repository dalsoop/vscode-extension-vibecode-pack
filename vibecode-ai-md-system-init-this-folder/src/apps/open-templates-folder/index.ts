import type { AppModule } from '../_types';
import { manifest } from './manifest';
import { handler } from './handler';

const app: AppModule = { manifest, handler };
export default app;
