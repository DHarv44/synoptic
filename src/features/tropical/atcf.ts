import { fetchJson } from '@/core/data/fetchJson'
import type { SourceRef } from '@/core/data/types'

export const NHC_ATCF: SourceRef = { id: 'nhc-atcf', label: 'NHC ATCF decks + text' }

/** One best-track fix. */
export interface BestTrackPoint {
  t: number
  lat: number
  lon: number
  vmax: number
  mslp: number | null
  ty: string
}

export interface ModelTrack {
  tech: string
  label: string
  points: Array<{ tau: number; lat: number; lon: number; vmax: number }>
}

export interface ModelGuidance {
  dtg: string
  runMs: number | null
  models: ModelTrack[]
}

/** Best track (the storm's life so far), parsed by the proxy. */
export async function fetchBestTrack(stormId: string): Promise<BestTrackPoint[]> {
  return fetchJson<BestTrackPoint[]>(NHC_ATCF, `/proxy/nhc-atcf?deck=b&storm=${stormId}`, {
    fixture: 'nhc-bdeck',
  })
}

/** Latest-run model tracks for a curated set, parsed and trimmed by the proxy. */
export async function fetchModelGuidance(stormId: string): Promise<ModelGuidance> {
  return fetchJson<ModelGuidance>(NHC_ATCF, `/proxy/nhc-atcf?deck=a&storm=${stormId}`, {
    fixture: 'nhc-adeck',
  })
}

/** "https://www.nhc.noaa.gov/text/MIATCDEP3.shtml" → "MIATCDEP3". */
export function productCode(url: string): string | null {
  const m = /\/text\/([A-Z0-9]{6,12})\.shtml$/i.exec(url)
  return m ? m[1].toUpperCase() : null
}

export async function fetchDiscussion(product: string): Promise<{ product: string; text: string }> {
  return fetchJson<{ product: string; text: string }>(NHC_ATCF, `/proxy/nhc-text?product=${product}`, {
    fixture: 'nhc-discussion',
  })
}

/**
 * A distinct colour per model, official guidance white and heavier. A
 * chart convention: the same model reads the same colour on every storm.
 */
export const MODEL_COLORS: Record<string, string> = {
  OFCL: '#ffffff',
  AVNI: '#4fc3f7',
  HWFI: '#ff8a65',
  HMNI: '#aed581',
  HFAI: '#ba68c8',
  HFBI: '#ce93d8',
  CTCI: '#ffd54f',
  UKXI: '#4db6ac',
  CMCI: '#f06292',
  NVGI: '#90a4ae',
  AEMI: '#a1887f',
  TVCN: '#e6ee9c',
  EMXI: '#7986cb',
}

export function modelColor(tech: string): string {
  return MODEL_COLORS[tech] ?? '#b0bec5'
}
