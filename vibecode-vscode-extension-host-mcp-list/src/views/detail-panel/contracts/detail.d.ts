declare namespace DetailContract {
  type Transport = 'stdio' | 'http' | 'sse';

  interface SerializedMcpEntry {
    name: string;
    sourceLabel: string;
    transport: Transport;
    command?: string;
    args?: string[];
    url?: string;
    port?: number;
    cwd?: string;
    env?: Record<string, string>;
    rawJson: string;
    originLabel: string;
  }

  type Inbound =
    | { type: 'setEntry'; entry: SerializedMcpEntry }
    | { type: 'theme'; isDark: boolean };

  type Outbound =
    | { type: 'ready' }
    | { type: 'openSource' }
    | { type: 'copyCommand' }
    | { type: 'refresh' }
    | { type: 'revealEnvKey'; key: string };
}

interface VsCodeApi {
  postMessage(msg: DetailContract.Outbound): void;
  getState<T = unknown>(): T | undefined;
  setState<T = unknown>(state: T): void;
}

declare function acquireVsCodeApi(): VsCodeApi;
