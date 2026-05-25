import type { CommandModule } from '../_types';
import { manifest } from './manifest';
import { handler } from './handler';

const cmd: CommandModule = { manifest, handler };
export default cmd;
