/// <reference lib="webworker" />
/**
 * Decode worker: chunks in → sweeps retained per (elevation, moment);
 * posts the selected sweep as a polar texture, reports available tilts,
 * and answers gate-probe queries.
 */
import { Buffer } from 'buffer'
import { decodeChunk } from '@/features/radar/level2/decode'

declare const self: DedicatedWorkerGlobalScope

// seek-bzip expects Node's Buffer; provide the standard polyfill in-worker.
;(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer

const AZ_BINS = 720
/** moments kept for every tilt vs low-tilt-only (memory cap) */
const ALL_TILT_MOMENTS = new Set(['REF', 'VEL'])
const LOW_TILT_MOMENTS = new Set(['ZDR', 'RHO'])
const LOW_TILT_MAX = 2

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

interface SweepState {
  tex: Uint8Array
  gates: number
  firstGateM: number
  gateSpacingM: number
  scale: number
  offset: number
  elevationDeg: number
}

const sweeps = new Map<string, SweepState>()
const tiltDegs = new Map<number, number>()
let selected = { elevNum: 1, moment: 'REF' }

function key(elevNum: number, moment: string): string {
  return `${elevNum}:${moment}`
}

function ingest(buf: ArrayBuffer, isStart: boolean): boolean {
  let touchedSelected = false
  for (const r of decodeChunk(buf, isStart)) {
    if (!tiltDegs.has(r.elevationNumber)) tiltDegs.set(r.elevationNumber, r.elevationDeg)
    for (const [name, m] of Object.entries(r.moments)) {
      if (m.wordSize !== 8) continue
      const keep =
        ALL_TILT_MOMENTS.has(name) ||
        (LOW_TILT_MOMENTS.has(name) && r.elevationNumber <= LOW_TILT_MAX)
      if (!keep) continue
      const k = key(r.elevationNumber, name)
      let s = sweeps.get(k)
      if (!s || s.gates < m.gates) {
        const prev = s
        s = {
          tex: new Uint8Array(AZ_BINS * m.gates),
          gates: m.gates,
          firstGateM: m.firstGateM,
          gateSpacingM: m.gateSpacingM,
          scale: m.scale,
          offset: m.offset,
          elevationDeg: r.elevationDeg,
        }
        if (prev) {
          for (let az = 0; az < AZ_BINS; az++) {
            s.tex.set(prev.tex.subarray(az * prev.gates, (az + 1) * prev.gates), az * m.gates)
          }
        }
        sweeps.set(k, s)
      }
      const bin = Math.round(r.azimuthDeg * 2) % AZ_BINS
      const row = (m.data as Uint8Array).subarray(0, s.gates)
      s.tex.set(row, bin * s.gates)
      s.tex.set(row, ((bin + 1) % AZ_BINS) * s.gates)
      if (r.elevationNumber === selected.elevNum && name === selected.moment) {
        touchedSelected = true
      }
    }
  }
  return touchedSelected
}

function postSelectedSweep(): void {
  const s = sweeps.get(key(selected.elevNum, selected.moment))
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
  const tilts: TiltInfo[] = [...tiltDegs.entries()]
    .map(([num, deg]) => ({
      num,
      deg,
      moments: [...sweeps.keys()].filter((k) => k.startsWith(`${num}:`)).map((k) => k.split(':')[1]),
    }))
    .filter((t) => t.moments.length > 0)
    .sort((a, b) => a.num - b.num)
  const msg: TiltsMessage = { type: 'tilts', tilts }
  self.postMessage(msg)
}

function probe(azDeg: number, rangeM: number): void {
  const values: Record<string, number> = {}
  let elevationDeg = 0
  for (const moment of ['REF', 'VEL', 'ZDR', 'RHO']) {
    const s =
      sweeps.get(key(selected.elevNum, moment)) ??
      sweeps.get(key(selected.elevNum + 1, moment)) // split-cut partner
    if (!s) continue
    elevationDeg = s.elevationDeg
    const bin = Math.round(azDeg * 2) % AZ_BINS
    const gate = Math.floor((rangeM - s.firstGateM) / s.gateSpacingM)
    if (gate < 0 || gate >= s.gates) continue
    const raw = s.tex[bin * s.gates + gate]
    if (raw >= 2) values[moment] = (raw - s.offset) / s.scale
  }
  const msg: ProbeResultMessage = { type: 'probeResult', values, elevationDeg }
  self.postMessage(msg)
}

type Request =
  | { type: 'chunk'; buf: ArrayBuffer; isStart: boolean }
  | { type: 'reset' }
  | { type: 'select'; elevNum: number; moment: string }
  | { type: 'probe'; azDeg: number; rangeM: number }

self.onmessage = (ev: MessageEvent<Request>) => {
  const msg = ev.data
  if (msg.type === 'reset') {
    sweeps.clear()
    tiltDegs.clear()
    return
  }
  if (msg.type === 'select') {
    selected = { elevNum: msg.elevNum, moment: msg.moment }
    postSelectedSweep()
    return
  }
  if (msg.type === 'probe') {
    probe(msg.azDeg, msg.rangeM)
    return
  }
  if (ingest(msg.buf, msg.isStart)) postSelectedSweep()
  postTilts()
}
