/**
 * Dev hook: window.__wx — headless inspection/control surface.
 * Stores register themselves here as they come online (S4+).
 */
export interface WxDevHook {
  version: string
}

declare global {
  interface Window {
    __wx: WxDevHook
  }
}

export function installDevHook(): void {
  window.__wx = {
    version: '0.1.0',
  }
}
