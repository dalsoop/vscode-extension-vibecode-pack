// Refresh is dispatched to the sidebar provider from extension.ts via this exported callback.
// We can't import the provider here (apps/* must stay vscode-only and avoid cycles), so the
// handler stays a no-op and extension.ts overrides the registration to call provider.refresh().

export function handler(): void {
  // Overridden in extension.ts — see registerSidebar / refreshTemplates wiring.
}
