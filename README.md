# SYNOPTIC

A web-native **weather workstation** built entirely on free, public data — streaming
Level 2 radar with professional interrogation tools, severe weather alerts,
forecaster-grade sounding analysis, and multi-model comparison, in one dark
instrument-panel UI.

![stack](https://img.shields.io/badge/react-19-blue) ![stack](https://img.shields.io/badge/maplibre-5-green) ![stack](https://img.shields.io/badge/vite-7-purple) ![license](https://img.shields.io/badge/license-MIT-lightgrey)

Every layer and tool is individually togglable, the whole workstation follows one
timeline (−48 h of observations → +16 d of forecast), and clicking anywhere on Earth
probes that point.

---

## Feature map

### Radar

| Feature | What it does | Status |
|---|---|---|
| Global composite | RainViewer tiles, animated on the timeline | ✅ |
| CONUS mosaic | IEM NEXRAD high-res, 5-min + archive steps | ✅ |
| **Level 2 streaming** | Single-site super-res, decoded radial-by-radial from the real-time chunk feed | ✅ |
| Polar rendering | Native gates via WebGL (no rasterized tiles), NWS color table | ✅ |
| Tilt control | Every elevation, split-cut aware | ✅ |
| Gate probe | All moments at a gate + 4/3-earth beam height | ✅ |
| All-Tilts | One click → the whole vertical column of values | ✅ |
| Velocity + SRV | Gate-continuity dealiasing (with RAW toggle), storm-relative velocity from Bunkers motion | ✅ |
| Cross-section | Shift+click A→B → RHI slice at true beam heights | ✅ |
| 3D echo | Tilt surfaces in 3D, threshold + orbit | ✅ |
| Storm cells | TVS/meso/hail attributes, table + session trend charts | ✅ |
| Isosurface raymarch | Solid volume instead of tilt surfaces | 🔭 |
| `.pal` color tables | Import GRLevelX community palettes | 🔭 |

### Analysis (click anywhere on Earth)

| Feature | What it does | Status |
|---|---|---|
| Current conditions | Temp/dewpoint/wind/pressure/cloud, WMO code | ✅ |
| Meteogram | 7-day temp/dewpoint, precip + probability, cloud strip, wind barbs | ✅ |
| Skew-T log-p | Parcel path, CAPE shading, dry adiabats, isotherms | ✅ |
| Hodograph | Height-colored with Bunkers right-mover | ✅ |
| Severe indices | CAPE/CIN/LI/LCL/LFC/EL/PWAT/shear/SRH/storm motion | ✅ |
| Model comparison | GFS/ECMWF/ICON/GEM/UKMO spaghetti + GFS ensemble | ✅ |
| Interactive parcel | Drag the surface parcel, watch CAPE recompute | 🔭 |
| Radiosonde overlay | Real 00z/12z balloon data vs the model profile | 🔭 |

### Situational awareness

| Feature | What it does | Status |
|---|---|---|
| NWS alerts | Warning polygons + viewport-filtered panel, click to zoom | ✅ |
| Lightning | Live Blitzortung strikes, bolt icons with flash decay | ✅ |
| Surface obs | METAR station models (temp/dewpoint/barb), decluttered | ✅ |
| Satellite | NASA GIBS imagery, timeline-dated | ✅ |
| Basemap | OpenFreeMap vector tiles — cities, roads, labels, dark/light | ✅ |
| Wind particles | GPU flow field, surface → jet stream | ⚠️ built, disabled (see roadmap) |
| Alert ticker | Top-bar scrolling severe ticker | 🔭 |

✅ shipped · ⚠️ known issue · 🔭 planned

---

## Roadmap

**Next up**

1. **Fix the wind particle layer** *(built, shipped disabled)* — the GPU particle
   system, GFS proxy, and level selector all work, but the served wind field
   contains a corrupt patch that renders as a solid block of fast particles.
   Diagnosis so far: server-side U-component agrees between the 0.25° and 0.5°
   GFS files, but client speeds run ~30 m/s hotter, implicating the V-component —
   either `grib2class` mis-decoding VGRD or a u/v assembly bug. Resume steps are
   recorded in [SLICES.md](SLICES.md) (Phase 3) and [HANDOFF.md](HANDOFF.md).
2. **UI overhaul pass** — the interface has grown organically across seven phases
   and is due a deliberate design pass: panel/dock ergonomics, layer rail,
   timeline affordances, information density, and the deferred polish items
   (alert ticker, manual radar site picker, layer re-ordering, zone-alert
   geometry resolution, restoring globe projection once custom WebGL layers
   adopt MapLibre's projection API).
3. **Chase HUD** *(PLAN.md §3.14)* — a mobile-first second face: GPS-on-radar,
   time-to-arrival from storm motion, SPC outlooks and mesoscale discussions,
   an intercept/escape route solver over OSM roads, placefile import, and a
   replay trainer over archived events.

**Later** — historical archive mode (Open-Meteo reaches back to 1940), run-to-run
forecast trends (dProg/dt), forecast verification, shareable workspace URLs,
virtual-temperature CAPE correction, hurricane mode, aurora/space weather.

---

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
npm test           # vitest — decoder + atmospheric-science reference tests
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

- [HANDOFF.md](HANDOFF.md) — current state, in-flight work, traps (read first)
- [PLAN.md](PLAN.md) — full product spec (data catalog, feature areas, phases)
- [SLICES.md](SLICES.md) — build order and per-slice status
- [CLAUDE.md](CLAUDE.md) — engineering conventions and toolchain notes
