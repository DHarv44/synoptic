import { useEffect, useMemo } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useFeatureOption } from '@/core/settings/store'
import { useValidHour } from '@/core/time/validHour'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { modelColor } from '@/features/tropical/atcf'
import { tropicalSources } from '@/features/tropical/geojson'
import { acquireModelTracks, useModelTracks } from '@/features/tropical/modelStore'
import { RADII_COLORS, radiiAtTime } from '@/features/tropical/radii'
import { acquireTropicalFeed, useTropical } from '@/features/tropical/store'

const SOURCES = [
  'tropical-cone',
  'tropical-radii',
  'tropical-arrival',
  'tropical-past',
  'tropical-track',
  'tropical-points',
  'tropical-current',
  'tropical-ww',
  'tropical-models',
]
const LAYERS = [
  'tropical-models',
  'tropical-model-labels',
  'tropical-cone-fill',
  'tropical-cone-line',
  'tropical-radii-fill',
  'tropical-radii-line',
  'tropical-arrival-earliest',
  'tropical-arrival-likely',
  'tropical-arrival-labels',
  'tropical-past',
  'tropical-track',
  'tropical-points',
  'tropical-point-labels',
  'tropical-current',
  'tropical-current-labels',
  'tropical-ww-casing',
  'tropical-ww-warning',
  'tropical-ww-watch',
]

/**
 * Each layer's designed opacity; the user's Opacity % scales all of them
 * together, so the stack fades as one product rather than piece by piece.
 * Symbol and circle layers carry two properties each.
 */
const BASE_OPACITY: Array<[layer: string, prop: string, base: number]> = [
  ['tropical-cone-fill', 'fill-opacity', 0.1],
  ['tropical-cone-line', 'line-opacity', 0.75],
  ['tropical-radii-fill', 'fill-opacity', 0.22],
  ['tropical-radii-line', 'line-opacity', 0.9],
  ['tropical-arrival-earliest', 'line-opacity', 0.8],
  ['tropical-arrival-likely', 'line-opacity', 0.9],
  ['tropical-arrival-labels', 'text-opacity', 1],
  ['tropical-past', 'line-opacity', 1],
  ['tropical-track', 'line-opacity', 1],
  ['tropical-points', 'circle-opacity', 1],
  ['tropical-points', 'circle-stroke-opacity', 1],
  ['tropical-point-labels', 'text-opacity', 1],
  ['tropical-current', 'circle-opacity', 1],
  ['tropical-current', 'circle-stroke-opacity', 1],
  ['tropical-current-labels', 'text-opacity', 1],
  ['tropical-ww-casing', 'line-opacity', 0.5],
  ['tropical-ww-warning', 'line-opacity', 1],
  ['tropical-ww-watch', 'line-opacity', 1],
  ['tropical-model-labels', 'text-opacity', 1],
]

const RADII_COLOR_EXPR = [
  'match',
  ['get', 'radii'],
  64,
  RADII_COLORS[64],
  50,
  RADII_COLORS[50],
  RADII_COLORS[34],
] as const

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
const HALO = 'rgba(0,0,0,0.75)'

/**
 * NHC's forecast graphic, as layers: the cone as a pale wash, the past
 * track dashed, the forecast track solid with category-coloured points at
 * each forecast hour, and the current position marked with the storm's
 * name and category. The cone is uncertainty of the CENTRE, not the reach
 * of the storm — the card on it says so.
 */
export function TropicalLayer() {
  const showCone = useFeatureOption<boolean>('tropical', 'cone')
  const showPast = useFeatureOption<boolean>('tropical', 'pastTrack')
  const showRadii = useFeatureOption<boolean>('tropical', 'windRadii')
  const showArrival = useFeatureOption<boolean>('tropical', 'arrival')
  const showWw = useFeatureOption<boolean>('tropical', 'watchWarn')
  const showModels = useFeatureOption<boolean>('tropical', 'models')
  const opacity = useFeatureOption<number>('tropical', 'opacity')
  const data = useTropical()
  useEffect(() => acquireTropicalFeed(), [])
  useEffect(() => acquireModelTracks(), [])
  const sources = useMemo(() => tropicalSources(data), [data])
  const guidance = useModelTracks((s) => s.byStorm)
  // Spaghetti: one line per model per storm, official guidance last so it
  // draws on top. Spread is not probability — the legend says so.
  const models = useMemo(() => {
    const features: GeoJSON.Feature[] = []
    for (const s of data?.storms ?? []) {
      const g = guidance[s.id]
      if (!g) continue
      const ordered = [...g.models].sort((a, b) => (a.tech === 'OFCL' ? 1 : 0) - (b.tech === 'OFCL' ? 1 : 0))
      for (const m of ordered) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: m.points.map((p) => [p.lon, p.lat]) },
          properties: {
            stormId: s.id,
            name: s.name,
            tech: m.tech,
            label: m.label,
            color: modelColor(m.tech),
            official: m.tech === 'OFCL',
            run: g.dtg,
            hours: m.points[m.points.length - 1]?.tau ?? 0,
          },
        })
      }
    }
    return { type: 'FeatureCollection' as const, features }
  }, [data, guidance])
  // The radii follow the clock: one forecast hour's set per storm.
  const hour = useValidHour()
  const radiiNow = useMemo(() => {
    const byStorm = new Map<string, GeoJSON.Feature[]>()
    for (const f of sources.radii.features) {
      const id = String(f.properties?.stormId)
      byStorm.set(id, [...(byStorm.get(id) ?? []), f])
    }
    const features = [...byStorm.values()].flatMap((fs) => radiiAtTime(fs, hour))
    // Widest first so the 64-kt core draws on top of the 34-kt envelope.
    features.sort((a, b) => Number(a.properties?.radii) - Number(b.properties?.radii))
    return { type: 'FeatureCollection' as const, features }
  }, [sources.radii, hour])

  useMapLayer((m) => {
    for (const id of SOURCES) m.addSource(id, { type: 'geojson', data: EMPTY })
    addDataLayer(
      m,
      {
        id: 'tropical-cone-fill',
        type: 'fill',
        source: 'tropical-cone',
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.1 },
      },
      'tropical',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-cone-line',
        type: 'line',
        source: 'tropical-cone',
        paint: { 'line-color': '#e8edf2', 'line-width': 1.2, 'line-opacity': 0.75 },
      },
      'tropical',
    )
    // Model tracks under everything else in the slot: thin, translucent,
    // the official forecast heavier — context, never the product.
    addDataLayer(
      m,
      {
        id: 'tropical-models',
        type: 'line',
        source: 'tropical-models',
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'official'], 2.2, 1.2],
          'line-opacity': ['case', ['get', 'official'], 0.95, 0.7],
        },
      },
      'tropical',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-model-labels',
        type: 'symbol',
        source: 'tropical-models',
        minzoom: 4,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 400,
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 9,
          'text-padding': 6,
        },
        paint: { 'text-color': ['get', 'color'], 'text-halo-color': HALO, 'text-halo-width': 1 },
      },
      'tropical',
    )
    // Wind radii between the cone and the track: the field the forecast
    // expects at the clock's hour, threshold-coloured, core over envelope.
    addDataLayer(
      m,
      {
        id: 'tropical-radii-fill',
        type: 'fill',
        source: 'tropical-radii',
        paint: { 'fill-color': RADII_COLOR_EXPR as never, 'fill-opacity': 0.22 },
      },
      'tropical',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-radii-line',
        type: 'line',
        source: 'tropical-radii',
        paint: { 'line-color': RADII_COLOR_EXPR as never, 'line-width': 1, 'line-opacity': 0.9 },
      },
      'tropical',
    )
    // Arrival-time isochrones for tropical-storm-force winds — present only
    // when NHC issues them (a land threat). Earliest reasonable dashed,
    // most likely solid, each labelled with its time along the line.
    addDataLayer(
      m,
      {
        id: 'tropical-arrival-earliest',
        type: 'line',
        source: 'tropical-arrival',
        filter: ['==', ['get', 'kind'], 'earliest'],
        paint: { 'line-color': '#ffd54a', 'line-width': 1, 'line-dasharray': [3, 2], 'line-opacity': 0.8 },
      },
      'tropical',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-arrival-likely',
        type: 'line',
        source: 'tropical-arrival',
        filter: ['==', ['get', 'kind'], 'likely'],
        paint: { 'line-color': '#ffd54a', 'line-width': 1.4, 'line-opacity': 0.9 },
      },
      'tropical',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-arrival-labels',
        type: 'symbol',
        source: 'tropical-arrival',
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 260,
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
        },
        paint: { 'text-color': '#ffe58a', 'text-halo-color': HALO, 'text-halo-width': 1.1 },
      },
      'tropical',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-past',
        type: 'line',
        source: 'tropical-past',
        layout: { 'line-join': 'round' },
        paint: { 'line-color': '#b8c2cc', 'line-width': 1.4, 'line-dasharray': [2, 2] },
      },
      'tropical',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-track',
        type: 'line',
        source: 'tropical-track',
        layout: { 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 1.8 },
      },
      'tropical',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-points',
        type: 'circle',
        source: 'tropical-points',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 4, 7, 6],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#000000',
          'circle-stroke-width': 1,
        },
      },
      'tropical-points',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-point-labels',
        type: 'symbol',
        source: 'tropical-points',
        minzoom: 4,
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
        },
        paint: { 'text-color': '#e6ebf0', 'text-halo-color': HALO, 'text-halo-width': 1.1 },
      },
      'tropical-points',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-current',
        type: 'circle',
        source: 'tropical-current',
        paint: {
          'circle-radius': 8,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      },
      'tropical-points',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-current-labels',
        type: 'symbol',
        source: 'tropical-current',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
          'text-offset': [0, -1.4],
          'text-anchor': 'bottom',
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff', 'text-halo-color': HALO, 'text-halo-width': 1.4 },
      },
      'tropical-points',
    )
    // Coastal watches and warnings above the labels, like NWS warning
    // outlines: a dark casing, warnings solid, watches dashed.
    addDataLayer(
      m,
      {
        id: 'tropical-ww-casing',
        type: 'line',
        source: 'tropical-ww',
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': '#000000', 'line-opacity': 0.5, 'line-width': 7 },
      },
      'tropical-points',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-ww-warning',
        type: 'line',
        source: 'tropical-ww',
        filter: ['==', ['get', 'warning'], true],
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 4.5 },
      },
      'tropical-points',
    )
    addDataLayer(
      m,
      {
        id: 'tropical-ww-watch',
        type: 'line',
        source: 'tropical-ww',
        filter: ['==', ['get', 'warning'], false],
        paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-dasharray': [2, 1.5] },
      },
      'tropical-points',
    )
    return () => {
      for (const id of LAYERS) if (m.getLayer(id)) m.removeLayer(id)
      for (const id of SOURCES) if (m.getSource(id)) m.removeSource(id)
    }
  }, [])

  useMapLayer(
    (m) => {
      const set = (id: string, d: GeoJSON.FeatureCollection): void => {
        const src = m.getSource(id) as GeoJSONSource | undefined
        src?.setData(d)
      }
      set('tropical-cone', showCone ? sources.cone : EMPTY)
      set('tropical-radii', showRadii ? radiiNow : EMPTY)
      set('tropical-arrival', showArrival ? sources.arrival : EMPTY)
      set('tropical-past', showPast ? sources.past : EMPTY)
      set('tropical-track', sources.track)
      set('tropical-points', sources.points)
      set('tropical-current', sources.current)
      set('tropical-ww', showWw ? sources.watchWarn : EMPTY)
      set('tropical-models', showModels ? models : EMPTY)
    },
    [sources, radiiNow, models, showCone, showPast, showRadii, showArrival, showWw, showModels],
  )

  useMapLayer(
    (m) => {
      const k = opacity / 100
      for (const [layer, prop, base] of BASE_OPACITY) {
        if (m.getLayer(layer)) m.setPaintProperty(layer, prop, base * k)
      }
      // The model lines carry a data-driven opacity (official heavier).
      if (m.getLayer('tropical-models')) {
        m.setPaintProperty('tropical-models', 'line-opacity', [
          'case',
          ['get', 'official'],
          0.95 * k,
          0.7 * k,
        ])
      }
    },
    [opacity],
  )

  return null
}
