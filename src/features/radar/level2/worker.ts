/// <reference lib="webworker" />
/**
 * Decode worker: chunks in, assembled polar sweeps out. Keeps the lowest
 * surveillance sweep (elevation 1) of the requested moment as a raw-byte
 * polar texture (az bins × gates).
 */
import { Buffer } from 'buffer'
import { decodeChunk } from '@/features/radar/level2/decode'

declare const self: DedicatedWorkerGlobalScope

// seek-bzip expects Node's Buffer; provide the standard polyfill in-worker.
;(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer

export interface SweepMessage {
  type: 'sweep'
  moment: string
  elevationDeg: number
  azBins: number
  gates: number
  firstGateM: number
  gateSpacingM: number
  scale: number
  offset: number
  /** raw bytes, az-major [azBins][gates]; 0 = no data */
  tex: Uint8Array
  radialCount: number
}

interface DecodeRequest {
  type: 'chunk'
  buf: ArrayBuffer
  isStart: boolean
  moment: string
}

interface ResetRequest {
  type: 'reset'
}

const AZ_BINS = 720

interface SweepState {
  tex: Uint8Array
  gates: number
  firstGateM: number
  gateSpacingM: number
  scale: number
  offset: number
  elevationDeg: number
  radials: number
}

let sweep: SweepState | null = null

function ingest(buf: ArrayBuffer, isStart: boolean, moment: string): void {
  for (const r of decodeChunk(buf, isStart)) {
    if (r.elevationNumber !== 1) continue
    const m = r.moments[moment]
    if (!m || m.wordSize !== 8) continue
    if (!sweep || sweep.gates < m.gates) {
      const prev = sweep
      sweep = {
        tex: new Uint8Array(AZ_BINS * m.gates),
        gates: m.gates,
        firstGateM: m.firstGateM,
        gateSpacingM: m.gateSpacingM,
        scale: m.scale,
        offset: m.offset,
        elevationDeg: r.elevationDeg,
        radials: prev?.radials ?? 0,
      }
      if (prev) {
        for (let az = 0; az < AZ_BINS; az++) {
          sweep.tex.set(prev.tex.subarray(az * prev.gates, (az + 1) * prev.gates), az * m.gates)
        }
      }
    }
    // Write the nearest bin and its neighbor: 1°-spaced radials (non-
    // super-res cuts) would otherwise leave every other 0.5° bin empty.
    const bin = Math.round(r.azimuthDeg * 2) % AZ_BINS
    const row = (m.data as Uint8Array).subarray(0, sweep.gates)
    sweep.tex.set(row, bin * sweep.gates)
    sweep.tex.set(row, ((bin + 1) % AZ_BINS) * sweep.gates)
    sweep.radials++
  }
}

self.onmessage = (ev: MessageEvent<DecodeRequest | ResetRequest>) => {
  const msg = ev.data
  if (msg.type === 'reset') {
    sweep = null
    return
  }
  ingest(msg.buf, msg.isStart, msg.moment)
  if (!sweep) return
  const out: SweepMessage = {
    type: 'sweep',
    moment: msg.moment,
    elevationDeg: sweep.elevationDeg,
    azBins: AZ_BINS,
    gates: sweep.gates,
    firstGateM: sweep.firstGateM,
    gateSpacingM: sweep.gateSpacingM,
    scale: sweep.scale,
    offset: sweep.offset,
    tex: sweep.tex.slice(),
    radialCount: sweep.radials,
  }
  self.postMessage(out, [out.tex.buffer])
}
