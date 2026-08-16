import { reportError, reportOk } from '@/core/data/healthStore'
import { fixtureActive, loadFixture } from '@/core/data/fixtures'
import type { SourceRef } from '@/core/data/types'
import { catmullRom, type Pt } from '@/core/geo/smooth'
import { MAP_COLORS as C } from '@/core/mapColors'
import { parseCodsus, type Front, type SurfaceAnalysis } from '@/core/data/wpc/codsus'

export const WPC: SourceRef = { id: 'wpc-fronts', label: 'WPC surface fronts' }

/** IEM's AFOS archive re-serves the bulletin with open CORS; WPC itself doesn't. */
const CODSUS_URL = 'https://mesonet.agron.iastate.edu/cgi-bin/afos/retrieve.py?pil=CODSUS&fmt=text'

/**
 * Text product, so this bypasses fetchJson (which is JSON-only) and carries
 * its own health + fixture wiring, the way the wind and lightning services do.
 */
export async function fetchSurfaceAnalysis(): Promise<SurfaceAnalysis> {
  try {
    let text: string
    if (fixtureActive()) {
      text = (await loadFixture<{ text: string }>('wpc-codsus')).text
    } else {
      const res = await fetch(CODSUS_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      text = await res.text()
    }
    const parsed = parseCodsus(text)
    if (parsed.fronts.length === 0 && parsed.centers.length === 0) {
      throw new Error('bulletin parsed to nothing')
    }
    reportOk(WPC)
    return parsed
  } catch (e) {
    reportError(WPC, e instanceof Error ? e.message : String(e))
    throw e
  }
}

/** Front kind → colour and dash, the conventions every surface chart uses. */
export const FRONT_STYLE: Record<
  Front['kind'],
  { color: string; dash: number[] | null; width: number }
> = {
  cold: { color: C.blue5, dash: null, width: 2 },
  warm: { color: C.red6, dash: null, width: 2 },
  // The pip sprites carry the identification; the stationary line reads
  // blue with red semicircles alternating on the far side, as charted.
  stationary: { color: C.blue5, dash: null, width: 2 },
  occluded: { color: C.violet5, dash: null, width: 2 },
  // WPC prints troughs as prominent dashed orange, and there are a LOT of
  // them on a summer chart — thirty in one bulletin is normal.
  trough: { color: C.orange5, dash: [4, 3], width: 2 },
}

export function frontsGeoJSON(a: SurfaceAnalysis): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: a.fronts.map((f) => {
      const style = FRONT_STYLE[f.kind]
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          // Bulletin points are hundreds of km apart; spline through them
          // so the front curves the way the analyst drew it.
          coordinates: catmullRom(f.points.map((p): Pt => [p.lon, p.lat])),
        },
        properties: {
          kind: f.kind,
          color: style.color,
          width: style.width,
          dashed: style.dash !== null,
        },
      }
    }),
  }
}

