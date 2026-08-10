import type { OpenMeteoForecast } from '@/core/data/openMeteo/types'

export interface MeteogramSeries {
  times: number[] // ms epoch
  temp: number[] // °C
  dewpoint: number[] // °C
  precip: number[] // mm
  precipProb: number[] // %
  windSpeed: number[] // m/s
  windDir: number[] // deg
  cloud: number[] // %
}

/** Open-Meteo hourly arrays → typed series with ms timestamps. */
export function toSeries(data: OpenMeteoForecast): MeteogramSeries {
  const h = data.hourly
  return {
    times: h.time.map((t) => Date.parse(t + 'Z')),
    temp: h.temperature_2m,
    dewpoint: h.dew_point_2m,
    precip: h.precipitation,
    precipProb: h.precipitation_probability,
    windSpeed: h.wind_speed_10m,
    windDir: h.wind_direction_10m,
    cloud: h.cloud_cover,
  }
}
