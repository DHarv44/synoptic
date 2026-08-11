import type { RadarSite } from '@/features/radar/level2/sites'
import type { VolumeMessage } from '@/features/radar/level2/worker'

/**
 * Bridge between the Level 2 map layer (which owns the decode worker) and
 * panels that need the same data. Same-feature coupling only — panels never
 * reach across features.
 */
let current: { worker: Worker; site: RadarSite } | null = null
const volumeListeners = new Set<(msg: VolumeMessage) => void>()

export function setLevel2Worker(worker: Worker | null, site: RadarSite | null): void {
  current = worker && site ? { worker, site } : null
}

export function currentSite(): RadarSite | null {
  return current?.site ?? null
}

export function requestVolume(): boolean {
  if (!current) return false
  current.worker.postMessage({ type: 'volume' })
  return true
}

/** Ask the worker to render a different elevation cut or moment. */
export function selectSweep(elevNum: number, moment: string, raw: boolean): void {
  current?.worker.postMessage({ type: 'select', elevNum, moment, raw })
}

export function onVolume(cb: (msg: VolumeMessage) => void): () => void {
  volumeListeners.add(cb)
  return () => volumeListeners.delete(cb)
}

export function emitVolume(msg: VolumeMessage): void {
  for (const cb of volumeListeners) cb(msg)
}
