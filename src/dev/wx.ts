/**
 * Dev hook: window.__wx — headless inspection/control surface.
 * Stores attach themselves via attachDevStore as their modules load.
 * The hook self-installs on first touch so module-eval order can't lose
 * attachments.
 */
export interface WxDevHook {
  version: string
  stores: Record<string, unknown>
}

declare global {
  interface Window {
    __wx: WxDevHook
  }
}

function ensureHook(): WxDevHook | undefined {
  if (typeof window === 'undefined') return undefined
  window.__wx ??= { version: '0.1.0', stores: {} }
  return window.__wx
}

export function installDevHook(): void {
  ensureHook()
}

export function attachDevStore(name: string, store: unknown): void {
  const hook = ensureHook()
  if (hook) hook.stores[name] = store
}
