import { reportError, reportOk } from '@/core/data/healthStore'
import { useGfsRun } from '@/core/data/gfsRun'
import type { SourceRef } from '@/core/data/types'

export const GFS_WIND: SourceRef = { id: 'gfs-wind', label: 'GFS wind (NOMADS)' }

export interface WindHeader {
  width: number
  height: number
  lonMin: number
  latMin: number
  step: number
  scale: number
  level: string
  run: string
  fhour: number
  valid: string
}

export interface WindField {
  header: WindHeader
  u: Int8Array
  v: Int8Array
}

/** Fetch + decode the proxy's binary wind payload for a valid time. */
export async function fetchWindField(level: string, validMs: number): Promise<WindField> {
  try {
    const valid = new Date(validMs).toISOString()
    const res = await fetch(
      `/proxy/gfs-wind?level=${encodeURIComponent(level)}&valid=${encodeURIComponent(valid)}`,
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    const view = new DataView(buf)
    const headerLen = view.getUint32(0, true)
    const header = JSON.parse(
      new TextDecoder().decode(new Uint8Array(buf, 4, headerLen)),
    ) as WindHeader
    const n = header.width * header.height
    const u = new Int8Array(buf, 4 + headerLen, n)
    const v = new Int8Array(buf, 4 + headerLen + n, n)
    reportOk(GFS_WIND)
    useGfsRun.getState().note('wind', { run: header.run, fhour: header.fhour, valid: header.valid })
    return { header, u, v }
  } catch (e) {
    reportError(GFS_WIND, e instanceof Error ? e.message : String(e))
    throw e
  }
}
