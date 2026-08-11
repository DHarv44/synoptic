/** Sweep storage + ingest logic shared by the decode worker. */
import { decodeChunk, type MomentData, type Radial } from '@/features/radar/level2/decode'

export const AZ_BINS = 720

/**
 * Retention policy. Each sweep is 720 azimuths × up to ~1832 gates, about
 * 1.3 MB, so keeping every moment on every cut would run to tens of
 * megabytes per volume. Reflectivity and velocity are kept throughout
 * because tilt-walking depends on them; the dual-pol fields are kept only
 * on the lowest cuts, which is where they are actually read — hail and
 * debris signatures, and telling weather from clutter, are all low-tilt
 * questions.
 */
const ALL_TILT_MOMENTS = new Set(['REF', 'VEL'])
const LOW_TILT_MOMENTS = new Set(['ZDR', 'RHO', 'SW', 'PHI'])
const LOW_TILT_MAX = 2

export interface SweepState {
  tex: Uint8Array
  gates: number
  firstGateM: number
  gateSpacingM: number
  scale: number
  offset: number
  elevationDeg: number
  /** Timestamp of the most recent radial written into this sweep, ms UTC. */
  timeMs: number
}

export class SweepStore {
  readonly sweeps = new Map<string, SweepState>()
  readonly tiltDegs = new Map<number, number>()
  /** Volume coverage pattern of the volume being ingested; 0 until seen. */
  vcp = 0
  private readonly prevVelRows = new Map<number, Uint8Array>()

  clear(): void {
    this.sweeps.clear()
    this.tiltDegs.clear()
    this.prevVelRows.clear()
    this.vcp = 0
  }

  key(elevNum: number, moment: string): string {
    return `${elevNum}:${moment}`
  }

  /** Returns true if the (elevNum, moment) selection was touched. */
  ingest(buf: ArrayBuffer, isStart: boolean, sel: { elevNum: number; moment: string }): boolean {
    let touched = false
    for (const r of decodeChunk(buf, isStart)) {
      if (!this.tiltDegs.has(r.elevationNumber)) this.tiltDegs.set(r.elevationNumber, r.elevationDeg)
      if (r.vcp !== 0) this.vcp = r.vcp
      for (const [name, m] of Object.entries(r.moments)) {
        if (m.wordSize !== 8) continue
        const keep =
          ALL_TILT_MOMENTS.has(name) ||
          (LOW_TILT_MOMENTS.has(name) && r.elevationNumber <= LOW_TILT_MAX)
        if (!keep) continue
        const row = m.data as Uint8Array
        if (name === 'VEL') {
          this.writeRow(this.key(r.elevationNumber, 'VEL_RAW'), m, r, row)
          const deal = dealiasRow(row, this.prevVelRows.get(r.elevationNumber), r.nyquistMs, m.scale, m.offset)
          this.prevVelRows.set(r.elevationNumber, deal)
          this.writeRow(this.key(r.elevationNumber, 'VEL'), m, r, deal)
        } else {
          this.writeRow(this.key(r.elevationNumber, name), m, r, row)
        }
        if (r.elevationNumber === sel.elevNum && name === sel.moment) touched = true
      }
    }
    return touched
  }

  /** Physical value at (az, range) for a sweep key, or null. */
  valueAt(k: string, azDeg: number, rangeM: number): number | null {
    const s = this.sweeps.get(k)
    if (!s) return null
    const bin = Math.round(azDeg * 2) % AZ_BINS
    const gate = Math.floor((rangeM - s.firstGateM) / s.gateSpacingM)
    if (gate < 0 || gate >= s.gates) return null
    const raw = s.tex[bin * s.gates + gate]
    if (raw < 2) return null
    return (raw - s.offset) / s.scale
  }

  private writeRow(
    k: string,
    template: Pick<MomentData, 'gates' | 'firstGateM' | 'gateSpacingM' | 'scale' | 'offset'>,
    r: Pick<Radial, 'elevationDeg' | 'azimuthDeg' | 'timestampMs'>,
    row: Uint8Array,
  ): void {
    const elevDeg = r.elevationDeg
    const azDeg = r.azimuthDeg
    let s = this.sweeps.get(k)
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
        timeMs: r.timestampMs,
      }
      if (prev) {
        for (let az = 0; az < AZ_BINS; az++) {
          s.tex.set(prev.tex.subarray(az * prev.gates, (az + 1) * prev.gates), az * s.gates)
        }
      }
      this.sweeps.set(k, s)
    }
    const bin = Math.round(azDeg * 2) % AZ_BINS
    const trimmed = row.subarray(0, s.gates)
    s.tex.set(trimmed, bin * s.gates)
    s.tex.set(trimmed, ((bin + 1) % AZ_BINS) * s.gates)
    // The sweep is as fresh as its newest radial.
    if (r.timestampMs > s.timeMs) s.timeMs = r.timestampMs
  }
}

/**
 * Gate-continuity dealiasing of one 8-bit velocity row (seeded from the
 * neighboring radial). Imperfect by design — the RAW toggle exists.
 */
export function dealiasRow(
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
