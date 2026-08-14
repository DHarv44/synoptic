/**
 * Desktop-app plumbing: service worker registration, update handling, and the
 * install prompt.
 *
 * Kept out of the component tree because none of it is React's business — the
 * browser fires these events whether or not anything is mounted, and missing
 * `beforeinstallprompt` because a component had not rendered yet is a real way
 * to lose the install button for a whole session.
 */

import { create } from 'zustand'
import { attachDevStore } from '@/dev/wx'

/** Not in lib.dom yet; Chromium-only, and the reason an install button exists. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallState {
  /** The captured prompt, or null when installing isn't offered. */
  prompt: InstallPromptEvent | null
  /** Already running as an installed app. */
  installed: boolean
  /** A new version is waiting; reloading picks it up. */
  updateReady: boolean
  setPrompt: (e: InstallPromptEvent | null) => void
  setInstalled: (v: boolean) => void
  setUpdateReady: (v: boolean) => void
}

export const useInstall = create<InstallState>((set) => ({
  prompt: null,
  installed: false,
  updateReady: false,
  setPrompt: (prompt) => set({ prompt }),
  setInstalled: (installed) => set({ installed }),
  setUpdateReady: (updateReady) => set({ updateReady }),
}))

attachDevStore('install', useInstall)

/** Standalone covers desktop installs; iOS uses its own non-standard flag. */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as { standalone?: boolean }).standalone === true
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone
}

/** Show the browser's install dialog. Resolves once the user has chosen. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const { prompt } = useInstall.getState()
  if (!prompt) return 'unavailable'
  await prompt.prompt()
  const { outcome } = await prompt.userChoice
  // A prompt can only be used once; the browser fires a fresh one if it
  // decides the app is still installable.
  useInstall.getState().setPrompt(null)
  return outcome
}

/** Tell the waiting worker to take over, then reload once it has. */
export function applyUpdate(): void {
  navigator.serviceWorker?.getRegistration().then((reg) => {
    const waiting = reg?.waiting
    if (!waiting) {
      window.location.reload()
      return
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    })
    waiting.postMessage('skip-waiting')
  })
}

export function initInstall(): void {
  useInstall.getState().setInstalled(isStandalone())

  window.addEventListener('beforeinstallprompt', (e) => {
    // Suppressing the default keeps Chromium's own mini-infobar out of the way
    // so the prompt appears where we put it, not over the map.
    e.preventDefault()
    useInstall.getState().setPrompt(e as InstallPromptEvent)
  })

  window.addEventListener('appinstalled', () => {
    useInstall.getState().setPrompt(null)
    useInstall.getState().setInstalled(true)
  })

  // Dev has no service worker: it would sit in front of Vite's module graph and
  // serve yesterday's code, which is a miserable way to spend an afternoon.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then((reg) => {
      if (reg.waiting) useInstall.getState().setUpdateReady(true)
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing
        installing?.addEventListener('statechange', () => {
          // A worker that reaches `installed` while one is already in control
          // is a new version waiting, not the very first install.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            useInstall.getState().setUpdateReady(true)
          }
        })
      })
    })
  })
}
