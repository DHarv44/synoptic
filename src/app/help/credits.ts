export interface Credit {
  label: string
  href: string
  /** What this source actually provides, for the About panel. */
  what: string
}

/**
 * Every upstream source, in one list. Several require visible attribution,
 * and the footer strip and the About panel must not drift apart about who
 * the data belongs to.
 */
export const CREDITS: Credit[] = [
  {
    label: 'RainViewer',
    href: 'https://www.rainviewer.com/',
    what: 'Global composite precipitation radar, 10-minute cadence.',
  },
  {
    label: 'NEXRAD · Iowa Environmental Mesonet',
    href: 'https://mesonet.agron.iastate.edu/',
    what: 'CONUS radar mosaic, MRMS precipitation accumulations, and NEXRAD storm attributes.',
  },
  {
    label: 'NOAA NEXRAD Level 2',
    href: 'https://registry.opendata.aws/noaa-nexrad/',
    what: 'Single-site super-resolution radar volumes, decoded in the browser.',
  },
  {
    label: 'NWS',
    href: 'https://www.weather.gov/',
    what: 'Active watches, warnings and advisories.',
  },
  {
    label: 'Open-Meteo',
    href: 'https://open-meteo.com/',
    what: 'Forecasts, model soundings, ensembles, air quality and location search.',
  },
  {
    label: 'NASA GIBS',
    href: 'https://nasa-gibs.github.io/gibs-api-docs/',
    what: 'Satellite imagery.',
  },
  {
    label: 'NWS Storm Prediction Center',
    href: 'https://www.spc.noaa.gov/',
    what: 'Convective outlooks, watches and mesoscale discussions.',
  },
  {
    label: 'NWS Weather Prediction Center',
    href: 'https://www.wpc.ncep.noaa.gov/',
    what: 'Surface analysis: fronts and pressure centres (via IEM AFOS).',
  },
  {
    label: 'NOAA NOMADS',
    href: 'https://nomads.ncep.noaa.gov/',
    what: 'GFS gridded fields: winds, pressure, heights, temperature, CAPE.',
  },
  {
    label: 'RAOB archive · Iowa Environmental Mesonet',
    href: 'https://mesonet.agron.iastate.edu/',
    what: 'Observed 00Z/12Z balloon soundings, overlaid on the model skew-T.',
  },
  {
    label: 'NWS National Water Prediction Service',
    href: 'https://water.noaa.gov/',
    what: 'River gauge observations and flood categories.',
  },
  {
    label: 'NDBC',
    href: 'https://www.ndbc.noaa.gov/',
    what: 'Moored buoy and coastal station observations: waves, water temperature, marine wind.',
  },
  {
    label: 'Blitzortung',
    href: 'https://www.blitzortung.org/',
    what: 'Community lightning detection network, seconds of latency.',
  },
  {
    label: 'Aviation Weather Center',
    href: 'https://aviationweather.gov/',
    what: 'METAR surface observations, SIGMETs and pilot reports.',
  },
  {
    label: 'OpenFreeMap · OpenMapTiles · OpenStreetMap',
    href: 'https://openfreemap.org/',
    what: 'Basemap tiles and place data.',
  },
]
