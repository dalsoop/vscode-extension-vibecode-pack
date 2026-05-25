// Generic recursive tree renderer for hub items. Stateless; the host
// (hub.client.ts) owns the expansion set and re-render trigger.
//
// Compiled with `module: "none"` + outFile alongside hub.client.ts, so this
// file is concatenated into dist/webview/client/hub.js. Underscore prefix
// keeps it alphabetically before its consumer (hub.client.ts), guaranteeing
// the namespace is defined when hub.client.ts evaluates.

namespace Tree {
  // Per-row info passed to the host's leaf renderer.
  export interface LeafRenderCtx {
    item: Contracts.ItemPayload;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
  }

  export interface RenderOptions {
    expandedIds: ReadonlySet<string>;
    // Host renders the inner card HTML (badge / title / actions). The tree
    // module only handles the wrapping row, indent, and chevron.
    renderLeaf: (ctx: LeafRenderCtx) => string;
  }

  function escAttr(s: string): string {
    return String(s ?? '').replace(
      /[&<>"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
    );
  }

  function renderRow(it: Contracts.ItemPayload, depth: number, opts: RenderOptions): string {
    const hasChildren = !!(it.children && it.children.length);
    const expanded = hasChildren && opts.expandedIds.has(it.id);
    const chevron = hasChildren
      ? `<span class="tree-chevron codicon codicon-chevron-${expanded ? 'down' : 'right'}" data-tree-toggle="${escAttr(it.id)}"></span>`
      : `<span class="tree-chevron-spacer"></span>`;
    const indent = `<span class="tree-indent" style="width:${depth * 12}px"></span>`;
    const inner = opts.renderLeaf({ item: it, depth, hasChildren, expanded });
    let html = `<div class="tree-row" data-tree-id="${escAttr(it.id)}">${indent}${chevron}${inner}</div>`;
    if (hasChildren && expanded) {
      for (const child of it.children!) html += renderRow(child, depth + 1, opts);
    }
    return html;
  }

  export function render(items: readonly Contracts.ItemPayload[], opts: RenderOptions): string {
    let out = '';
    for (const it of items) out += renderRow(it, 0, opts);
    return out;
  }

  // Attach click handlers to all chevrons under `root`. Call after innerHTML
  // is set.
  export function bindToggles(root: HTMLElement, onToggle: (id: string) => void): void {
    root.querySelectorAll<HTMLElement>('[data-tree-toggle]').forEach(el => {
      el.onclick = ev => {
        ev.stopPropagation();
        const id = el.dataset.treeToggle;
        if (id) onToggle(id);
      };
    });
  }
}
