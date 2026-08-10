/** Subset of the Open-Meteo forecast response we consume. SI units requested. */
export interface OpenMeteoForecast {
  latitude: number
  longitude: number
  current: {
    time: string
    temperature_2m: number
    relative_humidity_2m: number
    dew_point_2m: number
    apparent_temperature: number
    pressure_msl: number
    wind_speed_10m: number
    wind_direction_10m: number
    wind_gusts_10m: number
    weather_code: number
    cloud_cover: number
    precipitation: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    dew_point_2m: number[]
    precipitation: number[]
    precipitation_probability: number[]
    wind_speed_10m: number[]
    wind_direction_10m: number[]
    cloud_cover: number[]
    pressure_msl: number[]
    weather_code: number[]
  }
}
