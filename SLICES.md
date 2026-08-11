# SYNOPTIC — Feature Slices

Vertical slices: each is independently buildable, reviewable, and committable, ends in a
working app, and respects the conventions charter (PLAN.md §4.2). Order within a phase is
dependency order. Check boxes as slices land.

## Phase 1 — Foundation

- [x] **S1 — Repo bootstrap.** Vite + React + TS (strict) scaffold, folder skeleton
  (`app/ core/ scene/ features/ panels/ ui/ server/`), Mantine installed, CLAUDE.md
  (conventions charter), .gitignore, git init + first commit, port 5192 launch config.
  *Done: `npm run dev` serves a Mantine page; `tsc --noEmit` clean.*

- [x] **S2 — Shell & theme.** App frame: top bar, collapsible layer rail (left),
  collapsible analysis dock (right), timeline bar (bottom), viewport center. Custom
  Mantine theme (instrument tokens, monospace numerics), dark+light with
  `defaultColorScheme="auto"`, scheme toggle in top bar. `window.__wx` dev hook skeleton.
  *Done: frame renders in both schemes; panels collapse; no feature code in shell.*

- [x] **S3 — Feature registry + settings.** `defineFeature()` manifest type, registry
  store, settings screen generated from registered manifests (Mantine modal/route,
  searchable), enable/disable wiring, localStorage persistence with schema version,
  presets scaffold (Workstation/Minimal). *Done: a dummy feature registers, appears in
  settings, toggles a rail entry live.*

- [x] **S4 — Timeline store (skeleton).** zustand slice: `simTime`, `now`, play/pause,
  speed, range clamp (−48h now; forecast later), bottom-bar UI with scrubber +
  transport, keyboard (space, ←/→). All layers will read time from here — nothing else.
  *Done: scrubbing updates `simTime`; `__wx.setTime()` works.*

- [x] **S5 — Data core + fixtures.** Source-adapter interface (`subscribe(products) →
  scheduler → cache → store`), fetch scheduler with per-source cadence/backoff +
  pause-when-disabled, IndexedDB cache (idb), **fixture mode** (`?fixture=<case>` swaps
  every adapter to bundled recordings), data-health store + top-bar strip (per-source
  dot + age). *Done: a fake adapter round-trips through scheduler→cache→store; fixture
  flag forces offline; health strip reflects a killed source.*

- [x] **S6 — Globe.** R3F canvas in viewport: sphere, Natural Earth coastlines/borders
  (world-atlas npm pkg, no downloads), graticule, day/night terminator from real solar
  position, inertial orbit + zoom, fly-to(lat/lon), click→lat/lon picking event.
  Scene colors read Mantine scheme. *Done: globe spins at 60fps, terminator correct for
  current UTC, click logs coordinates.*

- [x] **S7 — Probe + first data feature.** `probe` store (click sets probe point, marker
  on globe); **`features/conditions`** — Open-Meteo adapter (current + hourly), analysis
  dock panel: current conditions readout with units service (metric/imperial), data age.
  First real registry-registered feature. *Done: click anywhere on Earth → readout <2s;
  works from fixture too.*

- [x] **S8 — Geocoding search.** Open-Meteo geocoding in top bar (Spotlight-integrated),
  recents, fly-to + probe on select. *Done: type "Norman, OK" → globe flies, probe set.*

- [x] **S9 — Meteogram v1.** `features/meteogram` dock panel: d3-drawn temp/dewpoint
  band, precip bars, wind barbs, cloud cover — 7 days from the probe's hourly data,
  timeline-aware cursor. *Done: readable in both schemes; probe move redraws.*

**Phase 1 exit:** PLAN.md §6 Phase 1 acceptance met; commit tagged `phase-1`.

## Phase 2 — Live Layers

- [x] S10 — Tile-drape engine (slippy tiles on sphere, LOD, fade-in; the risk slice)
- [x] S11 — RainViewer global radar layer + trailing-2h loop on the timeline
- [x] S12 — CONUS high-res mosaic: IEM NEXRAD n0q tiles (5-min, −50 min archive
  steps), auto-shown over CONUS. Raw MRMS via proxy moves to Phase 6.
- [x] S13 — GIBS satellite layers (VIIRS true color + IR; GOES sub-daily later)
- [x] S14 — Blitzortung lightning websocket (LZW decode, flash-decay shader;
  density layer + strike-rate later)
- [x] S15 — METAR station-model plots (canvas sprites, grid thinning; via proxy —
  aviationweather.gov blocks CORS)
- [x] S16 — NWS alert polygons + alert panel (ticker deferred to a polish slice)
  - [x] Panel filters to viewport; click a mapped alert → map zooms to its polygon.
  - Note: zone-based alerts (no polygon in the feed) can't be located without
    fetching each zone's geometry from api.weather.gov/zones — they sit behind an
    "unmapped" switch for now; zone-geometry resolution is a future polish item.
- [x] S17 — Layer rail v2: opacity sliders, per-layer health badges, failure
  dimming (manual re-ordering deferred; renderOrder is fixed by design)

## Phase 2.5 — Map Engine Swap (user feedback: fidelity, zoom, basemap, UI)

- [x] Replace the custom R3F tile globe with **MapLibre GL v5** (globe projection):
  deep zoom to street level, proper LOD (no holes/diamonds), inertial camera.
- [x] **OpenFreeMap vector basemap** (keyless, no caps): cities, towns, roads,
  rivers, labels — `dark` style for dark mode, `positron` for light.
- [x] All layers ported: radar (RainViewer maxzoom-capped at 7 to avoid their
  placeholder tiles + IEM bounds-limited raster), satellite, alerts (now filled
  polygons), lightning (circle layers w/ age ramp), METAR (symbol layer with
  **built-in decluttering + screen-fixed size**), graticule.
- [x] Data layers insert **below basemap label layers** (labels stay readable).
- [x] R3F/three retained for Phase 6 3D views; custom tile engine deleted.
- Gotchas: maplibre's default blob worker dies silently in sandboxed webviews →
  CSP worker build with explicit `setWorkerUrl`; maplibre pinned to v5.

## Phase 3 — Wind (built; PINNED BUG, layer off by default)

- [x] Proxy: GFS via NOMADS **grib filter CGI** (OPeNDAP retired per SCN 25-81),
  decoded with grib2class, 0.5° int8 payload, run auto-discovery, 30-min cache.
- [x] Client: WebGL2 GPGPU particle system (RG32F ping-pong sim, equirect →
  mercator draw through the map matrix), level select (10m→250hPa), particle
  count + opacity settings, health wiring.
- [ ] **PINNED BUG — wind field corruption.** A rectangular garbage patch (e.g.
  ~74 m/s mean speed at 250 hPa off Baja, ~22N 120W) renders as a salmon
  particle "block" (user-reported; confirmed by wind-layer A/B toggle). Facts so
  far: server-side |UGRD| in that region ≈ 45 m/s from BOTH 0p25 and 0p50 files
  (consistent), but client speed ≈ 74 → the v-component adds ~59 m/s, so the
  prime suspects are (a) grib2class mis-decoding VGRD messages, (b) a u/v
  assembly/offset bug in server payload or client parse. Next step when
  resumed: run the VGRD region spike (compare grib2class VGRD vs known-good
  values, e.g. from Open-Meteo point queries at the same spot), then fix
  decode or assembly accordingly. Layer defaultEnabled:false until fixed.

## Phase 4 — Sounding Suite (core complete)

- [x] Open-Meteo pressure-level adapter (19 levels; Magnus dewpoint from RH),
  hour picked from the global timeline; fixture recorded.
- [x] Science core in `core/met` with 19 vitest reference cases: Bolton
  LCL, pseudoadiabatic parcel lift, SBCAPE/CIN/LI/PWAT, bulk shear,
  Bunkers right-mover, SRH. (Stated simplification: no virtual-temp
  correction.)
- [x] Skew-T log-p (isobars/skewed isotherms/dry adiabats, T/Td traces,
  parcel path, CAPE shading), hodograph (height-colored, RM marker),
  indices table with plain-language tooltips.
- Deferred to polish: interactive parcel drag, real radiosonde (00z/12z)
  overlay, moist adiabat/mixing-ratio background lines, 3D column view
  (Phase 6 R3F), ML/MU parcels.

## Phase 5 — Models & Time (core complete)

- [x] Timeline v2: forecast side to +16d (hatched region + now tick on the
  scrubber); play runs into the forecast; probe panels (skew-T, meteogram,
  models cursor) follow the scrubbed hour.
- [x] Models panel: GFS/ECMWF/ICON/GEM/UKMO spaghetti for temp/precip/wind
  (10 days), GFS ensemble members underlay (temp), timeline cursor.
- Deferred: run-to-run dProg/dt, forecast verification mode, historical
  archive mode (1940+, whole-workstation replay), workspace/share URLs.
- Review note: MeteogramChart and ModelsChart share axis/grid/now-cursor
  boilerplate — extract a chart frame when a third d3 chart appears.

## Phase 6 — Radar Suite (in progress)

- [x] R1 — L2 access + decode: /proxy/nexrad shim to the
  `unidata-nexrad-level2-chunks` bucket; pure-TS MSG31 decoder
  (seek-bzip records → radials with REF/VEL/SW/ZDR/PHI/RHO moment blocks),
  5 vitest cases against a committed real KTLX chunk. seek-bzip audited
  before install (7.3M dl/wk, clean).
- [x] R2 — Volume assembly: bundled WSR-88D site list (159, nearest-to-view
  auto-select), current-volume discovery over the wrapping 0–999 ring,
  incremental chunk streaming into a decode worker (Buffer polyfill —
  seek-bzip needs it in-worker).
- [x] R3 — Polar renderer: custom WebGL layer, R8 polar texture (720×gates),
  mercator→(range,az) fragment shader, NWS reflectivity LUT, dual-bin
  azimuth write. **Map now defaults to mercator** — globe projection broke
  simple custom-layer matrices (also the wind layer's placement); globe
  returns via maplibre's projection shader API later.
- Known v1 gaps: brief blank at volume rollover; radial gaps while a
  volume is mid-stream; site is auto-only (no manual pick yet).
- [ ] R4 — Tilt control + gate probe (all moments + beam height).
- [ ] R5 — Velocity + SRV (dealiasing with raw toggle).
- [ ] R6 — Level 3 products: meso/TVS/tracks/hail icons + storm cell table.
- [ ] R7 — All-Tilts, cross-section, cell trend charts.
- [ ] R8 — 3D volume (R3F returns; raymarch/isosurface).

## Phase 7 (coarse; slice when reached)

Chase HUD: PWA → GPS → warnings → intercept/escape → placefiles → trainer.
