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
    what: 'CONUS radar mosaic and NEXRAD storm attributes (TVS, meso, hail).',
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
    what: 'Forecasts, model soundings, ensembles and location search.',
  },
  {
    label: 'NASA GIBS',
    href: 'https://nasa-gibs.github.io/gibs-api-docs/',
    what: 'Satellite imagery.',
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
