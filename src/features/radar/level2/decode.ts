/**
 * NEXRAD Level 2 chunk decoder (ICD 2620002 Message 31), pure TS so it
 * runs in a Web Worker. A chunk is: [24-byte volume header, S chunks only]
 * then LDM records of [4-byte BE size][bzip2 data]; records hold MSG31
 * radials whose data blocks carry the moments (REF/VEL/SW/ZDR/PHI/RHO).
 */
import Bunzip from 'seek-bzip'

export interface MomentData {
  gates: number
  /** range to first gate, m */
  firstGateM: number
  /** gate spacing, m */
  gateSpacingM: number
  scale: number
  offset: number
  wordSize: 8 | 16
  /** raw data words; physical = (raw − offset) / scale, 0/1 = missing/folded */
  data: Uint8Array | Uint16Array
}

export interface Radial {
  azimuthDeg: number
  elevationDeg: number
  elevationNumber: number
  /** ms past UTC midnight of the radial's Julian date */
  timeMs: number
  /** Nyquist velocity (m/s) from the RAD block; 0 if absent */
  nyquistMs: number
  moments: Record<string, MomentData>
}

const VOLUME_HEADER_BYTES = 24
const CTM_AND_MSG_HEADER = 28 // 12-byte CTM + 16-byte message header
const LEGACY_MESSAGE_BYTES = 2432

function isBzh(view: DataView, off: number): boolean {
  return (
    view.getUint8(off) === 0x42 && view.getUint8(off + 1) === 0x5a && view.getUint8(off + 2) === 0x68
  )
}

/** Split a chunk into decompressed LDM record buffers. */
export function chunkRecords(buf: ArrayBuffer, isStartChunk: boolean): Uint8Array[] {
  const view = new DataView(buf)
  let off = isStartChunk ? VOLUME_HEADER_BYTES : 0
  const out: Uint8Array[] = []
  while (off + 4 <= buf.byteLength) {
    const size = Math.abs(view.getInt32(off))
    if (size === 0 || off + 4 + size > buf.byteLength + 8) break
    const body = new Uint8Array(buf, off + 4, Math.min(size, buf.byteLength - off - 4))
    out.push(isBzh(new DataView(body.buffer, body.byteOffset), 0) ? Bunzip.decode(body) : body)
    off += 4 + size
  }
  return out
}

function parseMomentBlock(view: DataView, base: number): { name: string; m: MomentData } {
  const name = String.fromCharCode(
    view.getUint8(base + 1),
    view.getUint8(base + 2),
    view.getUint8(base + 3),
  )
  const gates = view.getUint16(base + 8)
  const firstGateM = view.getUint16(base + 10)
  const gateSpacingM = view.getUint16(base + 12)
  const wordSize = view.getUint8(base + 19) === 16 ? 16 : 8
  const scale = view.getFloat32(base + 20)
  const offset = view.getFloat32(base + 24)
  const dataOff = base + 28
  const data =
    wordSize === 16
      ? new Uint16Array(gates).map((_, i) => view.getUint16(dataOff + i * 2))
      : new Uint8Array(view.buffer, view.byteOffset + dataOff, gates).slice()
  return { name, m: { gates, firstGateM, gateSpacingM, scale, offset, wordSize, data } }
}

const MOMENT_NAMES = new Set(['REF', 'VEL', 'SW ', 'ZDR', 'PHI', 'RHO', 'CFP'])

/** Parse MSG31 radials out of one decompressed record. */
export function parseRadials(record: Uint8Array): Radial[] {
  const view = new DataView(record.buffer, record.byteOffset, record.byteLength)
  const out: Radial[] = []
  let off = 0
  while (off + CTM_AND_MSG_HEADER + 4 < record.byteLength) {
    const msgSizeHalfwords = view.getUint16(off + 12)
    const msgType = view.getUint8(off + 15)
    if (msgType !== 31) {
      off += LEGACY_MESSAGE_BYTES
      continue
    }
    const h = off + CTM_AND_MSG_HEADER
    const timeMs = view.getUint32(h + 4)
    const azimuthDeg = view.getFloat32(h + 12)
    const elevationNumber = view.getUint8(h + 22)
    const elevationDeg = view.getFloat32(h + 24)
    const blockCount = view.getUint16(h + 30)

    const moments: Record<string, MomentData> = {}
    let nyquistMs = 0
    for (let b = 0; b < Math.min(blockCount, 10); b++) {
      const ptr = view.getUint32(h + 32 + b * 4)
      if (ptr === 0 || h + ptr + 28 > record.byteLength) continue
      const base = h + ptr
      const type = String.fromCharCode(view.getUint8(base))
      const name3 = String.fromCharCode(
        view.getUint8(base + 1),
        view.getUint8(base + 2),
        view.getUint8(base + 3),
      )
      if (type === 'R' && name3 === 'RAD') {
        nyquistMs = view.getUint16(base + 16) * 0.01
        continue
      }
      if (type !== 'D') continue // other constant blocks skipped
      if (!MOMENT_NAMES.has(name3)) continue
      const { name, m } = parseMomentBlock(view, base)
      moments[name.trim()] = m
    }
    out.push({ azimuthDeg, elevationDeg, elevationNumber, timeMs, nyquistMs, moments })
    off += msgSizeHalfwords * 2 + 12
  }
  return out
}

/** Decode a whole chunk file to radials. */
export function decodeChunk(buf: ArrayBuffer, isStartChunk: boolean): Radial[] {
  const out: Radial[] = []
  for (const rec of chunkRecords(buf, isStartChunk)) {
    out.push(...parseRadials(rec))
  }
  return out
}
