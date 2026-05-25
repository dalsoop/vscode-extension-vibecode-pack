import type { IBinaryDetector, ILineCountStrategy, IRegistry, ITreeViewMode } from './types';

export class Registry implements IRegistry {
  private viewModes: ITreeViewMode[] = [];
  private viewModeMap = new Map<string, ITreeViewMode>();
  private lineCounters = new Map<string, ILineCountStrategy>();
  private binaryDetector?: IBinaryDetector;

  registerViewMode(mode: ITreeViewMode): void {
    if (this.viewModeMap.has(mode.id)) return;
    this.viewModes.push(mode);
    this.viewModeMap.set(mode.id, mode);
  }
  getViewMode(id: string): ITreeViewMode | undefined { return this.viewModeMap.get(id); }
  listViewModes(): ITreeViewMode[] { return [...this.viewModes]; }

  registerLineCounter(counter: ILineCountStrategy): void {
    this.lineCounters.set(counter.id, counter);
  }
  getLineCounter(id: string): ILineCountStrategy | undefined { return this.lineCounters.get(id); }

  registerBinaryDetector(detector: IBinaryDetector): void { this.binaryDetector = detector; }
  getBinaryDetector(): IBinaryDetector {
    if (!this.binaryDetector) throw new Error('binary detector not registered');
    return this.binaryDetector;
  }
}
