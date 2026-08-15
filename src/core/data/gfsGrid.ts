import { reportError, reportOk } from '@/core/data/healthStore'
import type { SourceRef } from '@/core/data/types'

export const GFS_GRID: SourceRef = { id: 'gfs-grid', label: 'GFS fields (NOMADS)' }

export interface GridHeader {
  width: number
  height: number
  lonMin: number
  latMin: number
  step: number
  scale: number
  offset: number
  field: string
  unit: string
  run: string
}

export interface GridField {
  header: GridHeader
  /** Dequantized values, row 0 = south, lon from header.lonMin eastward. */
  values: Float32Array
}

/** Fetch + decode the proxy's uint16 grid payload (see server/gfsGrid.mjs). */
export async function fetchGridField(field: string): Promise<GridField> {
  try {
    const res = await fetch(`/proxy/gfs-grid?field=${encodeURIComponent(field)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    const view = new DataView(buf)
    const headerLen = view.getUint32(0, true)
    const header = JSON.parse(
      new TextDecoder().decode(new Uint8Array(buf, 4, headerLen)),
    ) as GridHeader
    // The server pads the header to a 4-byte multiple so this view aligns.
    const raw = new Uint16Array(buf, 4 + headerLen, header.width * header.height)
    const values = new Float32Array(raw.length)
    for (let i = 0; i < raw.length; i++) values[i] = raw[i] * header.scale + header.offset
    reportOk(GFS_GRID)
    return { header, values }
  } catch (e) {
    reportError(GFS_GRID, e instanceof Error ? e.message : String(e))
    throw e
  }
}
