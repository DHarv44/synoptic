import type { TropicalData } from '@/features/tropical/store'
import {
  CATEGORY_COLORS,
  motionText,
  pointCategory,
  stormCategory,
  validTimeMs,
} from '@/features/tropical/service'

const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features,
})

/** Map sources built from the feed: one collection per drawn thing. */
export interface TropicalSources {
  cone: GeoJSON.FeatureCollection
  past: GeoJSON.FeatureCollection
  track: GeoJSON.FeatureCollection
  points: GeoJSON.FeatureCollection
  current: GeoJSON.FeatureCollection
}

export function tropicalSources(data: TropicalData | null): TropicalSources {
  if (!data) return { cone: fc([]), past: fc([]), track: fc([]), points: fc([]), current: fc([]) }
  const cone: GeoJSON.Feature[] = []
  const past: GeoJSON.Feature[] = []
  const track: GeoJSON.Feature[] = []
  const points: GeoJSON.Feature[] = []
  const current: GeoJSON.Feature[] = []

  for (const s of data.storms) {
    const cat = stormCategory(s.classification, s.intensityKt)
    current.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: {
        kind: 'current',
        stormId: s.id,
        name: s.name,
        category: cat.label,
        color: CATEGORY_COLORS[cat.key],
        label: `${s.name.toUpperCase()} · ${cat.label}`,
        maxwind: s.intensityKt,
        mslp: s.pressureMb,
        motion: motionText(s.movementDir, s.movementSpeedKt),
        advNum: s.advNum,
        issuedMs: s.lastUpdateMs,
      },
    })
    const g = data.gis[s.id]
    if (!g) continue
    const feats = (c: GeoJSON.FeatureCollection | undefined): GeoJSON.Feature[] =>
      Array.isArray(c?.features) ? c.features : []
    for (const f of feats(g.cone)) {
      cone.push({ ...f, properties: { kind: 'cone', stormId: s.id, name: s.name } })
    }
    for (const f of feats(g.past)) past.push({ ...f, properties: { stormId: s.id } })
    for (const f of feats(g.track)) track.push({ ...f, properties: { stormId: s.id } })
    for (const f of feats(g.points)) {
      const p = (f.properties ?? {}) as Record<string, unknown>
      const maxwind = Number(p.maxwind) || 0
      const pcat = pointCategory(String(p.stormtype ?? ''), maxwind)
      const mslp = Number(p.mslp)
      points.push({
        ...f,
        properties: {
          kind: 'forecast',
          stormId: s.id,
          name: s.name,
          tau: Number(p.tau) || 0,
          label: String(p.datelbl ?? ''),
          validMs: validTimeMs(String(p.validtime ?? ''), s.lastUpdateMs),
          category: pcat.label,
          color: CATEGORY_COLORS[pcat.key],
          maxwind,
          gust: Number(p.gust) || null,
          // 9999 and 0 are NHC's "not forecast" sentinels.
          mslp: Number.isFinite(mslp) && mslp > 0 && mslp < 9999 ? mslp : null,
        },
      })
    }
  }
  return { cone: fc(cone), past: fc(past), track: fc(track), points: fc(points), current: fc(current) }
}
