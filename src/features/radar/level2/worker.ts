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

export interface VolumeTilt {
  elevationDeg: number
  azBins: number
  rangeBins: number
  rangeStepM: number
  /** azBins × rangeBins dBZ, NaN = no data */
  dbz: Float32Array
}

export interface VolumeMessage {
  type: 'volume'
  tilts: VolumeTilt[]
}

const VOL_AZ = 240
const VOL_RANGE = 140
const VOL_MAX_RANGE_M = 180_000

/** Downsampled REF grid per tilt for the 3D view (keeps transfers small). */
function volume(): void {
  const tilts: VolumeTilt[] = []
  const transfers: ArrayBuffer[] = []
  const rangeStepM = VOL_MAX_RANGE_M / VOL_RANGE
  for (const [elevNum, elevationDeg] of [...store.tiltDegs.entries()].sort((a, b) => a[1] - b[1])) {
    const k = store.key(elevNum, 'REF')
    if (!store.sweeps.has(k)) continue
    const dbz = new Float32Array(VOL_AZ * VOL_RANGE)
    for (let a = 0; a < VOL_AZ; a++) {
      const azDeg = (a / VOL_AZ) * 360
      for (let r = 0; r < VOL_RANGE; r++) {
        const v = store.valueAt(k, azDeg, r * rangeStepM + rangeStepM / 2)
        dbz[a * VOL_RANGE + r] = v === null ? NaN : v
      }
    }
    tilts.push({ elevationDeg, azBins: VOL_AZ, rangeBins: VOL_RANGE, rangeStepM, dbz })
    transfers.push(dbz.buffer)
  }
  self.postMessage({ type: 'volume', tilts } satisfies VolumeMessage, transfers)
}

export interface SectionTilt {
  elevationDeg: number
  values: Array<number | null>
}

export interface SectionResultMessage {
  type: 'sectionResult'
  tilts: SectionTilt[]
}

/** REF along a polyline of (az, range) samples, per tilt — RHI slice data. */
function section(samples: Array<{ azDeg: number; rangeM: number }>): void {
  const tilts: SectionTilt[] = [...store.tiltDegs.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([elevNum, elevationDeg]) => ({
      elevationDeg,
      values: samples.map((s) => store.valueAt(store.key(elevNum, 'REF'), s.azDeg, s.rangeM)),
    }))
    .filter((t) => t.values.some((v) => v !== null))
  self.postMessage({ type: 'sectionResult', tilts } satisfies SectionResultMessage)
}

type Request =
  | { type: 'chunk'; buf: ArrayBuffer; isStart: boolean }
  | { type: 'reset' }
  | { type: 'select'; elevNum: number; moment: string; raw: boolean }
  | { type: 'probe'; azDeg: number; rangeM: number }
  | { type: 'probeColumn'; azDeg: number; rangeM: number }
  | { type: 'section'; samples: Array<{ azDeg: number; rangeM: number }> }
  | { type: 'volume' }

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
  if (msg.type === 'section') {
    section(msg.samples)
    return
  }
  if (msg.type === 'volume') {
    volume()
    return
  }
  if (store.ingest(msg.buf, msg.isStart, selected)) postSelectedSweep()
  postTilts()
}
