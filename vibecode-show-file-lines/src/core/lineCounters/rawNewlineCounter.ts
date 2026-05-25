import { LINE_COUNTER_RAW_NEWLINE } from '../../constants';
import type { ILineCountStrategy } from '../types';

export class RawNewlineCounter implements ILineCountStrategy {
  readonly id = LINE_COUNTER_RAW_NEWLINE;

  count(content: Uint8Array): number {
    if (content.length === 0) return 0;
    let newlines = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === 0x0a) newlines++;
    }
    const endsWithNewline = content[content.length - 1] === 0x0a;
    return endsWithNewline ? newlines : newlines + 1;
  }
}
