import type { SourceRef } from '@/core/data/types'

export const GEOCODING: SourceRef = { id: 'geocoding', label: 'Open-Meteo Geocoding' }

export interface GeoResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country_code?: string
  admin1?: string
}

export interface GeocodingResponse {
  results?: GeoResult[]
}

export function geocodingUrl(query: string): string {
  const p = new URLSearchParams({
    name: query,
    count: '8',
    language: 'en',
    format: 'json',
  })
  return `https://geocoding-api.open-meteo.com/v1/search?${p}`
}

export function describeResult(r: GeoResult): string {
  const parts = [r.admin1, r.country_code].filter(Boolean)
  return `${parts.join(', ')} · ${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)}`
}
