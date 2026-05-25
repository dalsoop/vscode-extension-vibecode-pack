// Shared helpers + state for the preview webview client. Compiled with
// `module: "none"` + outFile so every .ts under src/preview/client/ is
// concatenated into one script. Namespaces avoid global collisions.
//
// Shared types come from the ambient `Contracts.*` namespace declared in
// src/contracts/*.d.ts (single source of truth shared with the extension).

namespace P {
  // ─── shared interfaces / aliases ──────────────────────────────────────
  export type Payload = Contracts.PreviewPayload;
  export type Section = Contracts.PreviewSection;
  export type SectionRule = Contracts.PreviewSectionRule;

  // ─── mutable state ────────────────────────────────────────────────────
  let payloadRef: Payload | null = null;
  let extDirty = false;
  let rerenderCb: () => void = () => {};

  export function payload(): Payload | null {
    return payloadRef;
  }
  export function setPayload(p: Payload | null): void {
    payloadRef = p;
  }
  export function externalDirty(): boolean {
    return extDirty;
  }
  export function setExternalDirty(v: boolean): void {
    extDirty = v;
  }
  // Sections that mutate UI-only state (collapse rules, enter delete-confirm,
  // toggle edit mode) call P.rerender() to re-paint the whole panel. The
  // orchestrator wires the callback at boot via setRerender(render).
  export function setRerender(cb: () => void): void {
    rerenderCb = cb;
  }
  export function rerender(): void {
    rerenderCb();
  }

  export const editing = new Set<string>();
  export const collapsedRules = new Set<string>(); // rules visible by default; user can collapse
  export const confirmingDelete = new Set<string>();

  // ─── vscode webview API ───────────────────────────────────────────────
  export interface VsApi {
    postMessage(msg: any): void;
  }
  declare function acquireVsCodeApi(): VsApi;
  export const vscode: VsApi = acquireVsCodeApi();

  // ─── helpers ──────────────────────────────────────────────────────────
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

  export function readOnly(): boolean {
    return !!payloadRef?.meta.source.readOnly;
  }

  // Mirror confirm dialog. Returns true if the save should also write to all
  // mirror peers; false if it should write only the current file.
  export function askMirror(): boolean {
    const mirrors = payloadRef?.meta.mirrors || [];
    const count = mirrors.reduce((a, m) => a + m.targets.length, 0);
    if (count === 0) return false;
    if (mirrors.every(m => !!m.alwaysMirror)) return true;
    const summary = mirrors
      .map(m => {
        const label =
          m.source === 'group'
            ? m.groupLabel || t('preview.mirror.group.label')
            : t('preview.mirror.skillsSharingName');
        const tag = m.alwaysMirror ? t('preview.mirror.always') : '';
        return `[${label}${tag}]\n  ` + m.targets.join('\n  ');
      })
      .join('\n\n');
    return confirm(t('preview.confirm.mirror', count, summary));
  }

  // Quick-fix rules that the section card can offer a one-click button for.
  // Map from rule id to the extension-side fix action.
  export const FIX_BY_RULE: Record<string, string> = {
    'no-emoji-desc': 'strip-emoji',
    'no-emoji-title': 'strip-emoji',
    'no-emoji-intro': 'strip-emoji',
    'no-emoji': 'strip-emoji',
    'no-emoji-body': 'strip-emoji',
    'desc-length': 'trim-desc-200'
  };
}
