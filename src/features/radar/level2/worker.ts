/// <reference lib="webworker" />
/**
 * Decode worker: chunks in → sweeps retained per (elevation, moment);
 * posts the selected sweep, available tilts, gate probes, and All-Tilts
 * columns. Storage/ingest logic lives in sweeps.ts.
 */
import { Buffer } from 'buffer'
import { AZ_BINS, SweepStore } from '@/features/radar/level2/sweeps'

declare const self: DedicatedWorkerGlobalScope

// seek-bzip expects Node's Buffer; provide the standard polyfill in-worker.
;(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer

export interface TiltInfo {
  num: number
  deg: number
  moments: string[]
}

export interface SweepMessage {
  type: 'sweep'
  moment: string
  elevationNumber: number
  elevationDeg: number
  azBins: number
  gates: number
  firstGateM: number
  gateSpacingM: number
  scale: number
  offset: number
  tex: Uint8Array
}

export interface TiltsMessage {
  type: 'tilts'
  tilts: TiltInfo[]
}

export interface ProbeResultMessage {
  type: 'probeResult'
  values: Record<string, number>
  elevationDeg: number
}

export interface ColumnEntry {
  elevNum: number
  elevationDeg: number
  REF: number | null
  VEL: number | null
}

export interface ColumnResultMessage {
  type: 'columnResult'
  azDeg: number
  rangeM: number
  column: ColumnEntry[]
}

const store = new SweepStore()
let selected = { elevNum: 1, moment: 'REF', raw: false }

function selectedKey(): string {
  const m = selected.moment === 'VEL' && selected.raw ? 'VEL_RAW' : selected.moment
  return store.key(selected.elevNum, m)
}

function postSelectedSweep(): void {
  const s = store.sweeps.get(selectedKey())
  if (!s) return
  const msg: SweepMessage = {
    type: 'sweep',
    moment: selected.moment,
    elevationNumber: selected.elevNum,
    elevationDeg: s.elevationDeg,
    azBins: AZ_BINS,
    gates: s.gates,
    firstGateM: s.firstGateM,
    gateSpacingM: s.gateSpacingM,
    scale: s.scale,
    offset: s.offset,
    tex: s.tex.slice(),
  }
  self.postMessage(msg, [msg.tex.buffer])
}

function postTilts(): void {
  const tilts: TiltInfo[] = [...store.tiltDegs.entries()]
    .map(([num, deg]) => ({
      num,
      deg,
      moments: [
        ...new Set(
          [...store.sweeps.keys()]
            .filter((k) => k.startsWith(`${num}:`))
            .map((k) => k.split(':')[1].replace('VEL_RAW', 'VEL')),
        ),
      ],
    }))
    .filter((t) => t.moments.length > 0)
    .sort((a, b) => a.num - b.num)
  self.postMessage({ type: 'tilts', tilts } satisfies TiltsMessage)
}

function probe(azDeg: number, rangeM: number): void {
  const values: Record<string, number> = {}
  let elevationDeg = 0
  for (const moment of ['REF', 'VEL', 'ZDR', 'RHO']) {
    for (const elevNum of [selected.elevNum, selected.elevNum + 1]) {
      const v = store.valueAt(store.key(elevNum, moment), azDeg, rangeM)
      if (v !== null) {
        values[moment] = v
        elevationDeg = store.sweeps.get(store.key(elevNum, moment))?.elevationDeg ?? 0
        break
      }
    }
  }
  self.postMessage({ type: 'probeResult', values, elevationDeg } satisfies ProbeResultMessage)
}

/** All-Tilts: REF/VEL at (az, range) for every retained elevation. */
function probeColumn(azDeg: number, rangeM: number): void {
  const column: ColumnEntry[] = [...store.tiltDegs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([elevNum, elevationDeg]) => ({
      elevNum,
      elevationDeg,
      REF: store.valueAt(store.key(elevNum, 'REF'), azDeg, rangeM),
      VEL: store.valueAt(store.key(elevNum, 'VEL'), azDeg, rangeM),
    }))
    .filter((e) => e.REF !== null || e.VEL !== null)
  self.postMessage({ type: 'columnResult', azDeg, rangeM, column } satisfies ColumnResultMessage)
}

type Request =
  | { type: 'chunk'; buf: ArrayBuffer; isStart: boolean }
  | { type: 'reset' }
  | { type: 'select'; elevNum: number; moment: string; raw: boolean }
  | { type: 'probe'; azDeg: number; rangeM: number }
  | { type: 'probeColumn'; azDeg: number; rangeM: number }

self.onmessage = (ev: MessageEvent<Request>) => {
  const msg = ev.data
  if (msg.type === 'reset') {
    store.clear()
    return
  }
  if (msg.type === 'select') {
    selected = { elevNum: msg.elevNum, moment: msg.moment, raw: msg.raw }
    postSelectedSweep()
    return
  }
  if (msg.type === 'probe') {
    probe(msg.azDeg, msg.rangeM)
    return
  }
  if (msg.type === 'probeColumn') {
    probeColumn(msg.azDeg, msg.rangeM)
    return
  }
  if (store.ingest(msg.buf, msg.isStart, selected)) postSelectedSweep()
  postTilts()
}
