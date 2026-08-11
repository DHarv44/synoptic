# SYNOPTIC

A web-native **weather workstation** built entirely on free, public data — real-time
radar, severe weather alerts, forecaster-grade analysis tools, and multi-model
comparison, in one dark instrument-panel UI.

![stack](https://img.shields.io/badge/react-19-blue) ![stack](https://img.shields.io/badge/maplibre-5-green) ![stack](https://img.shields.io/badge/vite-7-purple)

## What it does

- **Live radar, three tiers**: global composite (RainViewer), CONUS high-res NEXRAD
  mosaic (Iowa Environmental Mesonet), and **single-site Level 2 super-resolution
  radar streamed radial-by-radial** from the NEXRAD real-time chunk feed — decoded
  in a Web Worker, rendered natively in polar coordinates with tilt control,
  REF/VEL moments, and a click-to-probe gate readout (values + beam height).
- **Severe weather**: live NWS warning polygons on the map, a severity-sorted alert
  panel filtered to your viewport (click an alert to zoom to it), and live
  lightning strikes from the Blitzortung community network.
- **Analysis at any point on Earth** (click the map): current conditions, a 7-day
  meteogram, a **skew-T log-p sounding** with parcel path, CAPE shading, hodograph,
  and derived severe-weather indices (CAPE/CIN/LI/shear/SRH/storm motion) computed
  client-side.
- **Model comparison**: GFS / ECMWF / ICON / GEM / UKMO spaghetti with a GFS
  ensemble underlay — forecast uncertainty made visible.
- **One timeline** drives everything: scrub from 48 h of observations into 16 days
  of forecast; radar loops, panels follow.
- Surface observations as WMO station models, GIBS satellite imagery, day/night-
  aware dark & light themes, and a settings registry where every layer and tool
  can be toggled individually.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:5192
```

`npm run dev` also serves the data proxy routes (METAR CORS shim, GFS wind
subsetting, NEXRAD chunk passthrough) via Vite middleware. `?fixture=demo` boots
the app offline on recorded API responses.

```bash
npm run typecheck  # strict TS
npm test           # vitest — includes decoder + atmospheric-science reference tests
```

## Data sources

All free; keyless where possible. RainViewer · Iowa Environmental Mesonet ·
NEXRAD Level 2 (Unidata/AWS Open Data) · NWS API · Open-Meteo (forecast,
pressure levels, ensembles, geocoding) · NASA GIBS · Blitzortung.org ·
aviationweather.gov · NOMADS GFS · OpenFreeMap / OpenMapTiles / OpenStreetMap
basemap. Attribution is displayed in-app. **Not a substitute for official
warnings.**

## License

[MIT](LICENSE)

## Docs

- [PLAN.md](PLAN.md) — full product spec (data catalog, feature areas, phases)
- [SLICES.md](SLICES.md) — build order and current status
- [CLAUDE.md](CLAUDE.md) — engineering conventions and toolchain notes
