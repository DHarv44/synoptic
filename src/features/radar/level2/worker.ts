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
const prevVelRows = new Map<number, Uint8Array>()
let selected = { elevNum: 1, moment: 'REF', raw: false }

function key(elevNum: number, moment: string): string {
  return `${elevNum}:${moment}`
}

/**
 * Gate-continuity dealiasing of one 8-bit velocity row: unfold each gate
 * to within the Nyquist of the previous gate (or the previous radial's
 * gate as the seed). Imperfect by design — the RAW toggle shows folded data.
 */
function dealiasRow(
  row: Uint8Array,
  prevRow: Uint8Array | undefined,
  nyq: number,
  scale: number,
  offset: number,
): Uint8Array {
  const out = new Uint8Array(row.length)
  if (nyq <= 0) {
    out.set(row)
    return out
  }
  let ref: number | null = null
  for (let i = 0; i < row.length; i++) {
    const raw = row[i]
    if (raw < 2) {
      out[i] = raw
      continue
    }
    let v = (raw - offset) / scale
    let seed = ref
    if (seed === null && prevRow && prevRow[i] >= 2) seed = (prevRow[i] - offset) / scale
    if (seed !== null) {
      while (v - seed > nyq) v -= 2 * nyq
      while (seed - v > nyq) v += 2 * nyq
    }
    ref = v
    out[i] = Math.max(2, Math.min(255, Math.round(v * scale + offset)))
  }
  return out
}

function writeRow(k: string, template: { gates: number; firstGateM: number; gateSpacingM: number; scale: number; offset: number }, elevDeg: number, azDeg: number, row: Uint8Array): void {
  let s = sweeps.get(k)
  if (!s || s.gates < template.gates) {
    const prev = s
    s = {
      tex: new Uint8Array(AZ_BINS * template.gates),
      gates: template.gates,
      firstGateM: template.firstGateM,
      gateSpacingM: template.gateSpacingM,
      scale: template.scale,
      offset: template.offset,
      elevationDeg: elevDeg,
    }
    if (prev) {
      for (let az = 0; az < AZ_BINS; az++) {
        s.tex.set(prev.tex.subarray(az * prev.gates, (az + 1) * prev.gates), az * s.gates)
      }
    }
    sweeps.set(k, s)
  }
  const bin = Math.round(azDeg * 2) % AZ_BINS
  const trimmed = row.subarray(0, s.gates)
  s.tex.set(trimmed, bin * s.gates)
  s.tex.set(trimmed, ((bin + 1) % AZ_BINS) * s.gates)
}

function selectedKey(): string {
  const m = selected.moment === 'VEL' && selected.raw ? 'VEL_RAW' : selected.moment
  return key(selected.elevNum, m)
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
      const row = m.data as Uint8Array
      if (name === 'VEL') {
        writeRow(key(r.elevationNumber, 'VEL_RAW'), m, r.elevationDeg, r.azimuthDeg, row)
        const deal = dealiasRow(row, prevVelRows.get(r.elevationNumber), r.nyquistMs, m.scale, m.offset)
        prevVelRows.set(r.elevationNumber, deal)
        writeRow(key(r.elevationNumber, 'VEL'), m, r.elevationDeg, r.azimuthDeg, deal)
      } else {
        writeRow(key(r.elevationNumber, name), m, r.elevationDeg, r.azimuthDeg, row)
      }
      if (r.elevationNumber === selected.elevNum && name === selected.moment) {
        touchedSelected = true
      }
    }
  }
  return touchedSelected
}

function postSelectedSweep(): void {
  const s = sweeps.get(selectedKey())
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
      moments: [
        ...new Set(
          [...sweeps.keys()]
            .filter((k) => k.startsWith(`${num}:`))
            .map((k) => k.split(':')[1].replace('VEL_RAW', 'VEL')),
        ),
      ],
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
  | { type: 'select'; elevNum: number; moment: string; raw: boolean }
  | { type: 'probe'; azDeg: number; rangeM: number }

self.onmessage = (ev: MessageEvent<Request>) => {
  const msg = ev.data
  if (msg.type === 'reset') {
    sweeps.clear()
    tiltDegs.clear()
    prevVelRows.clear()
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
  if (ingest(msg.buf, msg.isStart)) postSelectedSweep()
  postTilts()
}
