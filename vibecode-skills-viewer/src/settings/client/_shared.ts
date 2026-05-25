// Shared helpers + state for the settings webview client. Compiled with
// `module: "none"` + outFile so every .ts under src/settings/client/ is
// concatenated into one script. Namespaces avoid global collisions.
//
// Shared types live in src/contracts/*.d.ts (ambient `Contracts.*` global).
// The aliases below let section files keep using `S.Payload`, `S.ToolDef`
// etc. without churn.

namespace S {
  export type MirrorGroup = Contracts.MirrorGroup;
  export type PresetInfo = Contracts.PresetInfo;
  export type ToolDef = Contracts.ToolDef;
  export type CcSkillsConfig = Contracts.CcSkillsConfig;
  export type Payload = Contracts.SettingsPayload;

  // ─── seed defaults ─────────────────────────────────────────────────────
  export const DEFAULT_TOOLS: ToolDef[] = [
    { id: 'claude', label: 'Claude', enabled: true, builtin: true },
    { id: 'codex', label: 'Codex', enabled: true, builtin: true },
    { id: 'copilot', label: 'Copilot', enabled: true, builtin: true },
    { id: 'cursor', label: 'Cursor', enabled: true, builtin: true },
    { id: 'gemini', label: 'Gemini', enabled: true, builtin: true },
    { id: 'windsurf', label: 'Windsurf', enabled: true, builtin: true },
    { id: 'cline', label: 'Cline', enabled: true, builtin: true },
    { id: 'agents', label: 'Agents', enabled: true, builtin: true }
  ];

  // ─── mutable state ────────────────────────────────────────────────────
  let payloadRef: Payload | null = null;
  let activeTabRef: string = 'language';
  export function payload(): Payload | null {
    return payloadRef;
  }
  export function setPayload(p: Payload | null): void {
    payloadRef = p;
  }
  export function activeTab(): string {
    return activeTabRef;
  }
  export function setActiveTab(id: string): void {
    activeTabRef = id;
  }

  // ─── helpers ──────────────────────────────────────────────────────────
  export interface VsApi {
    postMessage(msg: any): void;
  }
  declare function acquireVsCodeApi(): VsApi;
  export const vscode: VsApi = acquireVsCodeApi();

  export function $(id: string): HTMLElement {
    return document.getElementById(id) as HTMLElement;
  }
  export function esc(s: any): string {
    return String(s ?? '').replace(
      /[&<>"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
    );
  }
  export function ico(name: string): string {
    return `<span class="codicon codicon-${name}"></span>`;
  }
  export function t(key: string, ...args: Array<string | number>): string {
    const raw = (payloadRef?.i18n.dict[key] ?? key) as string;
    if (!args.length) return raw;
    return raw.replace(/\{(\d+)\}/g, (_m, i) => {
      const v = args[Number(i)];
      return v === undefined ? '' : String(v);
    });
  }
  export function setKey(key: keyof CcSkillsConfig, value: any): void {
    vscode.postMessage({ type: 'set', key, value });
  }

  // ─── reusable widgets ─────────────────────────────────────────────────
  export function switchEl(key: keyof CcSkillsConfig, label: string, hint: string): string {
    const v = !!(payloadRef && (payloadRef.config as any)[key]);
    return `<div class="row">
      <label class="switch">
        <input type="checkbox" data-key="${key}" ${v ? 'checked' : ''}>
        <span><span class="row-label">${esc(label)}</span><br><span class="row-hint">${esc(hint)}</span></span>
      </label>
    </div>`;
  }
  export function bindSwitches(): void {
    document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-key]').forEach(el => {
      el.onchange = () => setKey(el.dataset.key as any, el.checked);
    });
  }
}
