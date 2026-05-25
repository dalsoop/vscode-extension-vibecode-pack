import type { SourceModule } from '../_types';
import { manifest } from './manifest';
import { scan, watch } from './scan';

const source: SourceModule = { manifest, scan, watch };
export default source;
