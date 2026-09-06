import type { TropicalData } from '@/features/tropical/store'
import { radiiValidMs, type RadiiKt } from '@/features/tropical/radii'
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
  /** Every forecast hour's radii; the layer picks the hour for the clock. */
  radii: GeoJSON.FeatureCollection
  arrival: GeoJSON.FeatureCollection
}

export function tropicalSources(data: TropicalData | null): TropicalSources {
  const empty = (): TropicalSources => ({
    cone: fc([]),
    past: fc([]),
    track: fc([]),
    points: fc([]),
    current: fc([]),
    radii: fc([]),
    arrival: fc([]),
  })
  if (!data) return empty()
  const cone: GeoJSON.Feature[] = []
  const past: GeoJSON.Feature[] = []
  const track: GeoJSON.Feature[] = []
  const points: GeoJSON.Feature[] = []
  const current: GeoJSON.Feature[] = []
  const radii: GeoJSON.Feature[] = []
  const arrival: GeoJSON.Feature[] = []

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
    for (const f of feats(g.windRadii)) {
      const p = (f.properties ?? {}) as Record<string, unknown>
      const kt = Number(p.radii)
      const validMs = radiiValidMs(String(p.validtime ?? ''))
      if ((kt !== 34 && kt !== 50 && kt !== 64) || validMs === null) continue
      radii.push({
        ...f,
        properties: {
          stormId: s.id,
          name: s.name,
          radii: kt as RadiiKt,
          tau: Number(p.tau) || 0,
          validMs,
          ne: Number(p.ne) || 0,
          se: Number(p.se) || 0,
          sw: Number(p.sw) || 0,
          nw: Number(p.nw) || 0,
        },
      })
    }
    for (const [kind, coll] of [['likely', g.arrivalLikely], ['earliest', g.arrivalEarliest]] as const) {
      for (const f of feats(coll)) {
        const p = (f.properties ?? {}) as Record<string, unknown>
        arrival.push({
          ...f,
          properties: { stormId: s.id, name: s.name, kind, label: String(p.arrival_time ?? '') },
        })
      }
    }
  }
  return {
    cone: fc(cone),
    past: fc(past),
    track: fc(track),
    points: fc(points),
    current: fc(current),
    radii: fc(radii),
    arrival: fc(arrival),
  }
}
