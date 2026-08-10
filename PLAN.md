# SYNOPTIC — Feature Plan

A web-native **weather workstation**: real data, real latency, real forecaster tools, rendered
with a 3D-first interface. Not a consumer weather app — the litmus test for every feature is
*"would a forecaster on shift, a storm chaser, or a serious hobbyist actually use this view?"*

- **Stack:** React + Vite + TypeScript + react-three-fiber / three.js + Mantine, custom
  GLSL where it counts
- **Aesthetic:** instrument-panel workstation. Dense, keyboard-friendly, no whimsy. Data
  is the decoration. **Dark + light modes, defaulting to system** (dark is the identity;
  light earns its keep in daytime glare).
- **Data policy:** free sources. Keyless preferred; **free-tier API keys are acceptable**
  (keys live in the proxy's `.env`, never shipped to the client — terrain-builder pattern).
  No paid plans, no scraping behind auth.
- **Location:** `T:\Dev\synoptic`, dev port **5192**

---

## 1. Vision & principles

1. **Workstation, not app.** Multi-panel layout like an ops console: globe/map center stage,
   layer stack on one flank, analysis panels on the other. Everything visible is live data.
2. **Truth about latency.** Show data age everywhere (`radar 4m ago`, `GFS run 06z`). Never
   fake "live". Professionals live with 5–10 min latency; so do we, honestly.
3. **3D where 3D earns it.** The atmosphere is a 3D fluid; flat maps throw away the vertical
   dimension that drives all interesting weather. Wind fields, radar volumes, and soundings
   are inherently 3D — render them that way. But 2D tools (skew-T, meteograms) stay 2D
   because that's what the pros read fastest.
4. **Compute client-side.** Derived indices (CAPE, shear, helicity) are math on data we
   already fetched. No backend model runs — the browser is the analysis engine.
5. **Emergent depth over guided modes.** No tutorials, no gamification. Deep tools that
   reward learning, like a real instrument.

---

## 2. Data source catalog

| Source | What | Coverage | Cadence / latency | Access |
|---|---|---|---|---|
| **Open-Meteo** | Forecasts from ~15 national models; current conditions; **pressure-level fields** (1000→30 hPa); air quality; marine; 1940+ archive | Global | Hourly steps; model runs every 6h | Free JSON, no key, ~10k req/day |
| **RainViewer** | Global composite radar tiles (past 2h + 30min nowcast) | Global (where radar exists) | 10 min | Free tile API |
| **NASA GIBS** | Satellite imagery layers (true color, IR, water vapor) as XYZ tiles | Global | 10 min – daily by layer | Free tiles, no key |
| **NOAA GOES-16/18** | Full-disk / CONUS satellite imagery, all 16 bands | Americas + Pacific | 10 min (5 min CONUS) | Open AWS S3 |
| **aviationweather.gov** | METAR / TAF — real airport observations & aerodrome forecasts | Global (~9000 stations) | ~Hourly obs | Free JSON API |
| **NWS API** (api.weather.gov) | Alerts, gridded forecasts, obs, AFD discussion text | US | Minutes | Free JSON |
| **Blitzortung** | Community lightning strikes | Global (network-dependent) | Seconds (websocket) | Free community feed |
| **NDBC** | Ocean buoys: wind, waves, pressure, SST | Global oceans | 10–60 min | Free |
| **U. Wyoming / IGRA** | Real radiosonde (balloon) soundings, ~800 stations | Global | 00z + 12z daily | Free text/CSV |
| **NEXRAD Level 2** | Raw US radar volumes — super-res reflectivity, velocity, spectrum width, dual-pol (ZDR/CC/KDP), every elevation sweep; archive to 1991 | US (~160 WSR-88D sites) | Volume ~4–6 min; **real-time chunks bucket streams radials in seconds** | Open AWS S3 (`noaa-nexrad-level2` archive, `unidata-nexrad-level2-chunks` live) |
| **NEXRAD Level 3** | NWS algorithm output per site: mesocyclone detections (MD), TVS, storm cell tracks + motion (NST), hail index, VIL, echo tops, hydrometeor classification, precip accum | US + ~45 TDWR terminal radars | Per volume scan | Open AWS S3 (`unidata-nexrad-level3`) |
| **MRMS** | Multi-Radar Multi-Sensor merged mosaics: composite reflectivity, **rotation tracks (azimuthal shear)**, **MESH hail size**, precip rate/accum, echo tops, VIL | CONUS | **2 min** | Open AWS S3 (`noaa-mrms-pds`) |
| **SPC** | Convective outlooks (Day 1–3 categorical + probabilistic), mesoscale discussions, watch boxes | US | As issued | Free GeoJSON/shapefile |
| **IEM (Iowa Env. Mesonet)** | Local Storm Reports (hail/tornado/wind sightings), warning archives, many NWS feeds re-served as clean GeoJSON | US | Minutes | Free JSON APIs |
| **mPING** | Crowdsourced precip-type/hail reports (NSSL) | US mostly | Live | Free (registration) |
| **OSM / OSRM / Overpass** | Road network, routing, surface tags (paved/dirt), fuel POIs | Global | Static | Free / self-hostable |
| **NOAA GFS / ECMWF open data** | Raw gridded GRIB2 model output (for the wind globe's global fields) | Global | 6h runs | Open S3/Azure buckets |
| **USGS / OpenTopography** | Terrain DEM (reuse terrain-builder pipeline) | Global | Static | Free (proxied key exists) |

**Keyed free tiers worth adding** (key stays in the proxy, generous free quotas):

| Source | What it adds over the keyless set | Free tier |
|---|---|---|
| **OpenWeatherMap** | Global precip/cloud/pressure/temp **map tiles**; second opinion on current conditions | 1k calls/day + tile layers |
| **MapTiler** (or Protomaps self-host) | Quality basemap/terrain tiles for the flat-map mode | 100k tiles/mo |
| **CheckWX** | Cleaner METAR/TAF JSON with decoded fields (fallback/enrichment for aviationweather.gov) | ~2k calls/day |
| **api.nasa.gov key** | Higher GIBS/EPIC rate limits (works keyless at lower limits) | Free key, generous |
| **Windy webcams API** | Live webcam thumbnails per region — "eyeball verification" layer | Free tier |
| **Tomorrow.io** | Nowcasting fields as a comparison source (evaluate; tier is tight) | 500 calls/day |

Rule of thumb: keyless sources remain the backbone (they're genuinely better here — Open-Meteo,
NOAA, GIBS are the gold standard); keyed tiers fill gaps (basemaps, tile overlays, webcams)
rather than becoming load-bearing.

**Latency banner rule:** every layer carries a `dataTime` and renders its age. Stale (> 2×
cadence) layers dim and flag themselves.

---

## 3. Feature areas

### 3.1 The Globe (core scene)

The centerpiece: a WebGL Earth that is also a data canvas.

- R3F sphere with day/night terminator computed from actual solar position; night side shows
  city lights. Subtle atmosphere rim shader (Rayleigh-ish gradient, no cartoon glow).
- **Projection dualism:** seamless morph between 3D globe and flat map (Mercator/equirect)
  for regional work. One scene graph, projection handled in the vertex shader.
- Camera: inertial orbit, scroll zoom from full-disk to ~street scale (tile LOD),
  double-click to fly-to a location.
- Graticule, coastlines, borders as vector layers (Natural Earth data, bundled — static,
  trusted source).
- Picking: every click resolves to lat/lon and drives the analysis panels ("probe" model —
  the globe is the input device for the whole workstation).

### 3.2 Wind particle layer (the signature visual)

GPU particle advection through real wind fields — earth.nullschool.net class, but interactive
and integrated.

- ~0.5–1M particles advected in a ping-pong FBO simulation (GPGPU); wind field uploaded as a
  texture (u/v components in RG channels) from model data.
- **Pressure-level selector:** surface → 850 → 700 → 500 → 250 hPa. Scrub through altitude
  and watch surface flow give way to the jet stream. This selector is a first-class UI
  element (vertical slider styled like an altimeter).
- Particle color by speed (perceptual ramp) or temperature at that level; trail length as a
  tunable.
- Time interpolation: blend between hourly wind fields so scrubbing the timeline animates the
  flow smoothly.
- Data path: Open-Meteo gridded endpoints or pre-sliced GFS GRIB via the proxy → compact
  binary (Float16/RG16F) texture upload.

### 3.3 Radar (the flagship module)

Goal: match or beat the paid field — RadarScope ($10 + subscription tiers), GR2Analyst
($80–250), GRLevel3, Baron — using the same free NEXRAD data they all consume. Everything
they paywall (dual-pol, super-res, all-tilts, streaming updates) is in the open buckets.

**3.3.1 Data & ingest**
- **Global baseline:** RainViewer composite tiles (10 min, 2h history + 30 min nowcast) so
  the radar layer works everywhere on Earth. Per-country open feeds (DWD, Environment
  Canada GeoMet, BOM) as future adapters.
- **CONUS mosaic:** MRMS merged reflectivity at 2-min cadence — the "national picture"
  layer, plus MRMS derived products (rotation tracks, MESH, precip accum, echo tops).
- **Single-site Level 2:** super-res base data (0.25 km × 0.5° gates) — reflectivity,
  velocity, spectrum width, ZDR, correlation coefficient, KDP, all elevation tilts.
- **Live streaming:** the `unidata-nexrad-level2-chunks` bucket publishes each volume in
  radial chunks seconds after the antenna sweeps — poll it and paint radials as they
  arrive, RadarScope-style "sweeping beam", sub-minute latency. Not waiting for full
  volume files is *the* difference between feeling live and feeling stale.
- **Level 3 products:** NWS algorithm output ingested per site — meso/TVS detections,
  storm tracks (NST), hail index, VIL, echo tops, hydrometeor classification (HCA),
  storm-total precip. TDWR terminal radars (~45 sites, finer resolution near cities) too.
- **Archive mode:** any volume from any site back to 1991 — case studies and chase replay.
- Decode pipeline: bzip2 + MSG31 parsing in a Web Worker (proxy pre-chews if a solid JS
  path doesn't pan out); decoded radials → GPU textures without touching the main thread.

**3.3.2 Rendering**
- **Native polar rendering:** radials uploaded as polar textures, resampled to screen in
  the fragment shader — no pre-rasterized raster tiles, no resolution loss. Crisp gates at
  full zoom like GR2, draped on globe or flat map.
- **Smoothing toggle:** raw gates (purist mode) ↔ GPU bilinear/spline smoothing
  (GR2-style presentation smoothing). Never smooth by default; honesty first.
- **Color tables:** NWS standard, RadarScope-like, and colorblind-safe ramps built in;
  full support for the community **`.pal` color table format** (GRLevelX ecosystem) with
  import + a live editor. High-dynamic-range mapping (Level 2 is continuous data, not
  4-bit steps).
- **Beam geometry honesty:** beam height (4/3-earth model) and beam width shown in the
  probe readout; range-folded/no-data regions rendered distinctly, never as "no echo".
- **Velocity dealiasing:** Level 2 velocity folds at the Nyquist (~±25–32 m/s); implement
  region-based dealiasing in the worker, with a "raw aliased" toggle for verification.
  This is the hardest DSP task in the module and a known quality differentiator.
- **Storm-relative velocity:** subtract storm motion (from NST cell tracks or user-set
  vector) — the tool for seeing rotation couplets.

**3.3.3 Interrogation tools**
- **Tilt control:** every elevation angle, keyboard step, and **All-Tilts mode** — click a
  point, see that column at every elevation simultaneously (GR2Analyst's signature
  feature).
- **Gate probe:** hover → exact dBZ / velocity / ZDR / CC / KDP / spectrum width at the
  gate, plus beam height AGL at that range. Multi-product probe: all moments at once.
- **Cross-section (RHI):** drag a line, get an instant vertical slice of any moment.
- **3D volume:** raymarched reflectivity volume + isosurface mode (e.g. the 50 dBZ shell);
  orbit a supercell, see hook echo / BWER / hail core aloft. Velocity volume with
  storm-relative coloring for 3D mesocyclone structure.
- **Dual-pol analysis presets:** one-click composites that colocate signatures —
  *hail core* (high Z + near-zero ZDR), *tornado debris signature* (low CC + high Z
  colocated with a velocity couplet → auto-flag with confidence), *ZDR arc / KDP foot*
  overlays for the supercell literati. HCA hydrometeor classes as a layer.
- **Rotation:** MRMS rotation tracks (accumulated azimuthal shear swaths — where has this
  storm been rotating for the last hour) + gate-to-gate delta-V readout at couplets +
  NWS meso/TVS icons from Level 3.
- **Storm cell table:** sortable live table of cells (from NST + own association): max
  dBZ, VIL, echo top, MESH hail size, meso/TVS flags, motion vector, distance/bearing
  from probe or GPS. Click row → fly to cell.
- **Cell trend charts:** per-cell history across volume scans — VIL, max dBZ, echo top,
  MESH, lightning flash rate (from 3.5). Strengthening/weakening at a glance; lightning
  jump flagging.
- **Volume coverage awareness:** display active VCP (clear-air vs precip modes), handle
  SAILS/MESO-SAILS supplemental low-level sweeps correctly (they give ~1–2 min low-tilt
  refresh mid-volume — paid apps handle this; most free ones don't).

**3.3.4 Multi-radar & site management**
- Site selector with auto-nearest, per-site status (sites go down mid-event), VCP badge.
- Same storm from two radars side-by-side (viewing-angle comparison of a couplet).
- Seamless zoom story: MRMS national mosaic at low zoom hands off to single-site
  super-res as you zoom into a cell.

**3.3.5 Time behavior — active radar, live or historical**
- Volume-scan-accurate looping with per-frame real timestamps (no fake even spacing),
  variable loop length/speed, and live "sweep painting" mode at the head of the timeline.
- **Radar is always animated, never a still:** the layer owns a rolling frame buffer and
  loops by default. Live mode loops the trailing 1–2h and extends itself as new volumes
  land; scrubbing anywhere in the past replays with identical motion.
- **Historical animation is first-class:** pick any date range since 1991 → frames
  prefetch in the background (progress shown) → the radar animates volume-by-volume with
  every interrogation tool live (tilts, SRV, probe, cells, 3D). Watching Moore 1999 or
  El Reno 2013 *move* is the acceptance test, not a stretch goal.
- Prefetch/eviction policy: decode ahead of the playhead, keep a bounded set of decoded
  volumes in memory (they're big), spill older frames to IndexedDB.

### 3.4 Satellite

- GIBS true-color + IR + water-vapor tile layers on the globe (global, simple, day one).
- GOES full-disk imagery as a textured hemisphere — the actual view from geostationary
  orbit, animated over the last few hours. Band selector for the 16 ABI channels with a
  one-line "what this band shows" annotation (visible, IR window, water vapor, fire
  detection…).
- IR-derived cloud-top temperature ramp — overshooting tops light up.

### 3.5 Lightning

- Blitzortung websocket feed → strikes appear on the globe **seconds** after they happen.
  Expanding-ring shader pulse at strike location, fading over ~60s; recent-strike density as
  a heat layer.
- Strike rate counter per storm cluster (flash-rate jumps precede severe weather — a real
  nowcasting signal).
- Audio option: soft geiger-style ticks scaled by viewport strike rate. Instrument, not toy.

### 3.6 Surface observations

- METAR layer: airport stations plotted with **real station models** (the WMO circle:
  wind barb, temp, dewpoint, pressure, weather symbol) — the classic synoptic plot,
  clustering by zoom.
- NDBC buoys with wave height/period/SST — the marine picture.
- Ob-vs-model delta mode: color stations by (observed − forecast) temperature or pressure.
  Where the model is wrong *right now* — genuinely useful and almost nowhere else visible.

### 3.7 Alerts & warnings

- NWS alert polygons (US): tornado warnings pulse red on the globe, severe thunderstorm,
  flash flood, etc., with full alert text in a panel. Non-US: model-derived severe flags
  (see 3.9) as a global fallback.
- Optional alert ticker strip across the top — TOC style.

### 3.8 Point analysis — the sounding suite (the pro core)

Click anywhere on Earth → full vertical atmosphere analysis from Open-Meteo pressure-level
data; near a radiosonde site at 00z/12z, overlay the **real balloon** sounding vs the model.

- **Skew-T log-P diagram**, done properly: temperature + dewpoint traces, dry/moist
  adiabats, mixing-ratio lines, wind barbs along the right rail. SVG/canvas, crisp.
- **Interactive parcel physics:** drag the surface parcel's temp/dewpoint and watch the
  parcel path, CAPE shading, and indices recompute live. (This is the "emergent sandbox"
  hook — you *feel* why a warm front or a cap changes everything.)
- **Hodograph** with storm-relative helicity shading, Bunkers storm motion vectors.
- **Derived indices panel:** CAPE (SB/ML/MU), CIN, LCL/LFC/EL heights, lifted index, 0–1km
  and 0–6km bulk shear, SRH, supercell composite, significant tornado parameter, PWAT,
  freezing level, wet-bulb profile. All computed client-side, each with a hover-tooltip
  one-liner of what it means and what values matter.
- **3D column view:** the same profile extruded on the globe — temperature-colored column,
  wind barbs corkscrewing with height, cloud layers rendered where RH saturates, tropopause
  lid. The 3D twin of the skew-T.

### 3.9 Forecast & meteograms

- **Meteogram wall:** dense multi-panel time series for the probed point — temp/dewpoint
  band, precip bars + probability, wind barbs, pressure trace, cloud cover by layer
  (low/mid/high as stacked shading), CAPE/shear timeline. 7–16 days, one glance.
- Hourly detail table (forecaster style, not consumer cards).
- **Severe timeline:** shading when model CAPE×shear crosses severe thresholds — a global
  poor-man's convective outlook.

### 3.10 Model comparison & ensembles

The feature consumer apps don't have and pro sites paywall.

- Same point, same variable, **every model overlaid**: GFS vs ECMWF vs ICON vs GEM vs UKMO
  spaghetti. Divergence between models = uncertainty made visible.
- Ensemble view via Open-Meteo ensemble API: 30+ GFS/ECMWF ensemble members as spaghetti +
  percentile fans (P10–P90 shading).
- Run-to-run "dProg/dt": how the forecast for a fixed valid time has shifted across the last
  N model runs — trend arrows for confidence.
- Verification mode: yesterday's forecasts vs what actually happened (archive API) — which
  model has been winning lately, per region.

### 3.11 Time engine

One global timeline owns the whole workstation.

- Scrubber spanning −48h (obs/radar/satellite) through +16d (models); **now** marker; every
  layer interpolates or steps to the timeline honestly (radar steps in 10-min frames, model
  fields lerp between hours).
- Play/pause with speed control; keyboard: space, ←/→ frame-step, shift for faster.
- Past = observed data, future = forecast; the boundary is visually explicit (solid vs
  hatched region on the scrubber).

### 3.12 Locations & session

- Geocoding search (Open-Meteo geocoding API, free), recent locations, pinned favorites.
- Multi-probe: pin 2–3 analysis points and compare soundings/meteograms side by side.
- Workspace persistence: layer state, camera, probes, units in localStorage; shareable URL
  encoding (lat/lon/zoom/layers/time).
- Units: metric/imperial/aviation (knots, hPa, °C mixes) — per-quantity, like real tools.

### 3.13 Historical mode

Open-Meteo's archive goes back to **1940** — a time machine for free.

- Enter a date → the whole workstation replays it: wind globe of the 1987 Great Storm, the
  2021 Texas cold wave, any hurricane's steering flow.
- Climate normals overlay: today vs 1991–2020 percentile for the probed point ("this is the
  3rd warmest March 12 since 1940").

---

### 3.13a Settings & feature registry (universal togglability)

**Every layer, tool, and panel in this document is individually togglable from Settings.**
This is architectural, not cosmetic:

- Each feature ships as a self-registering module with a manifest — id, title, settings
  schema, layers/panels/hotkeys it contributes, data subscriptions it needs.
- The Settings UI is **generated from the registry** (searchable, grouped by feature
  area), so a new feature gets its toggles for free and nothing can be un-togglable.
- Disabling a feature disables its data fetching too — toggles are also bandwidth and
  battery controls (critical for Chase HUD).
- **Presets:** Workstation (default), Chase, Minimal, and user-saved custom profiles;
  workspace export/import as JSON; per-feature settings persist in localStorage.
- Per-feature options live under the same node as the on/off switch (e.g. Radar →
  enabled, smoothing, color table, dealiasing display, loop length).

### 3.14 Chase mode (Chase HUD)

A second face of the app sharing the same data layer: mobile-first, 2D-fast, GPS-centric,
bandwidth-light. The Workstation is for the desk; the Chase HUD is for the truck. Safety
stance baked into the UI: *not a substitute for official warnings.*

**Situational awareness**
- **GPS-on-radar:** browser geolocation with heading/speed trail; range rings and
  distance/bearing readouts centered on *you*; storm-relative position framing.
- Radar cadence that matters in a chase: MRMS 2-min mosaic + single-site streaming chunks
  (sub-minute), never the 10-min composite.
- **Warning awareness:** "you are inside a Tornado Warning (PDS), issued 4 min ago";
  estimated time-until-cell-arrival at your position from storm motion vectors.
- **SPC first-class:** Day 1–3 outlooks, probabilistic layers, watch boxes, and mesoscale
  discussions (with full text) as toggleable layers.

**Intercept planning (the original contribution)**
- **Intercept solver:** cell motion vector + your position + OSM road network + your speed
  → concrete guidance: "US-183 north 12 mi; storm crosses the road in 22 min; you arrive
  8 min ahead." Routing via OSRM/Valhalla on OSM data.
- **Escape routes:** the inverse solve — routes diverging from storm motion, with OSM
  surface tags surfaced (paved vs dirt; dirt + rain = trap). Always visible while inside
  a warning polygon.
- **Terrain viewshed:** from a candidate viewing spot (DEM pipeline reuse), can you
  actually see the storm base or is a ridge in the way?
- Logistics: sunset countdown, fuel stops along route (Overpass), data-budget meter.

**Ground truth & community**
- Live Local Storm Reports (IEM GeoJSON) and mPING reports as map layers.
- **Placefile import:** parse the GRLevelX placefile format — inherit the community's
  overlay ecosystem wholesale; also a credibility signal to the target audience.
- Convoy mode: share-a-URL live position sharing between friends via a tiny relay
  (opt-in, ephemeral). Spotter Network's closed feed is explicitly out of scope.

**Chase replay trainer**
- Historical events (archived Level 2 + warnings + LSRs) replayed with a virtual GPS
  position: pick intercept routes in real time, get scored against the storm's actual
  track. Deep-sandbox training nothing else offers outside NWS internal tools.

**Mobile engineering profile**
- PWA + service worker; aggressive caching; low-bandwidth mode (flat map, no globe, no
  particles, single-tilt fetches only); battery/thermal restraint; big-thumb UI.

## 4. Architecture

```
Browser (does ~90% of the work)
├── R3F scene: globe, layers, volumes (custom GLSL)
├── Web Workers: GRIB/NEXRAD decode, index math (CAPE etc.), tile prep
├── Data layer: fetch + IndexedDB cache (respect cadences, dedupe)
└── State: zustand; one timeline store, one probe store, one layer store

Node proxy (small Express, same box)
├── CORS shim for NOAA/Wyoming endpoints
├── GRIB slicer: fetch GFS from S3, extract wind u/v @ levels → compact binary for textures
└── Static serve in prod
```

- No accounts, no user DB. localStorage/IndexedDB only.
- `window.__wx` dev hook: expose stores, force timeline, inject synthetic fields (dev-only),
  matching the `__game` pattern from other projects.
- Rate-limit discipline: per-source fetch schedulers with backoff; never hammer free APIs.

### 4.1 UI system — Mantine

- **Mantine v7+** for all DOM UI: `@mantine/core` + `@mantine/hooks`, **`@mantine/spotlight`
  as the Ctrl+K command palette** (fronts the feature registry), `@mantine/notifications`
  for alert toasts, `@mantine/dates` for archive date-range picking. CSS-modules era
  Mantine (no runtime CSS-in-JS) — right perf profile for a data-dense app.
- Mantine best practices throughout: one custom theme object (tokens, not ad-hoc colors),
  polymorphic components over wrappers, `use*` hooks from `@mantine/hooks` before writing
  our own, compound component patterns, no style props sprinkled inline — variants and
  CSS modules.
- **Color scheme: dark + light, `defaultColorScheme="auto"`** (follows OS), user override
  persisted. Dark is the workstation default aesthetic; light mode is a first-class
  citizen — it's what you can read in daytime sun glare in a truck (Chase HUD cares).
- The "hue belongs to data" rule holds in both schemes: chrome is achromatic grayscale in
  each; **data color ramps are designed/tested against both backgrounds** (a dBZ ramp
  that reads on near-black must be re-checked on white — scheme-aware ramp variants where
  needed).
- The R3F canvas is outside Mantine but reads the same theme tokens (scene background,
  graticule/coastline colors react to scheme).

### 4.2 Engineering conventions (anti-monolith charter)

Written for a codebase that AI agents and humans navigate constantly: small files, obvious
seams, no archaeology required.

- **No monoliths, enforced:** soft cap ~250 lines per file, one component per file;
  when a file grows past it, split by responsibility — that's the signal, not an
  exception. No "utils.ts" dumping grounds; utilities live with their domain.
- **Layering:** `ui` (dumb primitives) → `features` (manifest + components + hooks +
  service + types per feature) → `core` (data, time, settings, units) → `scene`.
  **Features never import from other features** — they meet only through core stores and
  the registry. Enforced with ESLint import-boundary rules, not convention.
- **Services are pure TypeScript** — data adapters, decoders, science math (CAPE,
  dealiasing, intercept solver) are framework-free functions/classes, imported *by* hooks,
  never containing React. This is what makes them unit-testable and worker-portable.
- **Types colocated per feature** (`features/radar/types.ts`), shared domain types in
  `core/types`; `strict: true`, no `any`, no non-null assertions without a comment
  earning it.
- **Single-source domain services:** one `units` service (all conversions, formatting),
  one `time` service (UTC internally, `Date` only at the display edge, sim-time from the
  timeline store only). Inline conversions are review-rejected.
- **State:** zustand slices per concern; components subscribe via narrow selectors;
  derived data in memoized selectors, not duplicated state. Persisted state
  (settings/workspaces) carries a schema version + migration function from day one.
- **Tests where they pay:** vitest on science math against published reference values
  (SPC sounding cases, dealiasing fixtures, beam-height tables) and on data decoders with
  recorded fixture files. No UI snapshot theater.
- **Tooling:** ESLint (+ boundaries) + Prettier, `tsc --noEmit` in CI-equivalent script;
  `CLAUDE.md` in repo root stating these conventions so every session inherits them.

## 5. Dependencies (trusted, established only)

three / @react-three/fiber / drei · **@mantine/core + hooks + spotlight + notifications +
dates** · zustand · d3-geo (projections) + d3-scale/shape (skew-T, meteograms) · comlink
(typed workers) · idb (IndexedDB cache) · vitest · express (proxy). Raw tile handling on
the custom globe (maplibre only as a pre-planned retreat for flat mode if sphere-tile LOD
becomes a tar pit). grib2/nexrad decode: evaluate established JS decoders; if none are
trustworthy, decode on the proxy with a well-known lib instead of adopting sketchy
packages. No downloaded binary assets except Natural Earth public-domain vectors.

---

## 6. Build phases

**Phase 1 — Foundation: shell, globe, probe.** Scaffold (Vite/TS/Mantine/R3F, CLAUDE.md,
git), app shell (top bar / layer rail / analysis dock / timeline bar), dark+light auto
theme, **feature registry + generated settings screen**, **timeline store skeleton**,
data-adapter framework with **fixture mode** and the **data-health strip**, thin proxy,
globe (coastlines, terminator, fly-to, picking), geocoding search, probe → Open-Meteo
current conditions + forecast panel + first meteogram. *Done when: click anywhere on
Earth → credible readout in <2s; every feature toggles off cleanly; the app boots offline
on fixtures.*

**Phase 2 — The Live Layers.** Tile-drape engine on the globe (the shared-risk item,
confronted first), RainViewer global radar + **MRMS 2-min CONUS mosaic**, GIBS satellite,
Blitzortung websocket lightning, METAR station plots, NWS alert polygons, data-age
badges, trailing-2h timeline scrubbing with **animated radar looping**. *Done when: a
live severe weather event in the US is watchable end-to-end with moving radar.*

**Phase 3 — Wind.** GPGPU particle layer, pressure-level selector, GRIB proxy slicing,
timeline scrubbing of wind fields. *Done when: the jet stream is visible and scrubbing
altitude/time is smooth (60fps, 500k+ particles).*

**Phase 4 — The Sounding Suite.** Skew-T, hodograph, full derived-index panel, interactive
parcel, real radiosonde overlay, 3D column view. *Done when: computed CAPE/shear matches
SPC mesoanalysis within tolerance for test cases.*

**Phase 5 — Models & Time.** Multi-model spaghetti, ensembles, dProg/dt, historical mode,
workspace URLs. *Done when: you can relive a named historical storm and compare live model
disagreement.*

**Phase 6 — The Radar Suite.** Level 2 streaming ingest (chunks bucket), native polar
rendering, tilt control + All-Tilts, gate probe, SRV + dealiasing, Level 3 products
(meso/TVS/tracks/hail), MRMS mosaic + rotation tracks + MESH, storm cell table with
trends, cross-sections, raymarched 3D volume, `.pal` color table support. *Done when: a
live severe event is fully interrogatable — couplet visible in SRV, TDS auto-flagged,
cell trends plotting — and a 2013 El Reno archive replay shows the hook echo in 3D.*

**Phase 7 — Chase HUD.** Mobile PWA profile, GPS-on-radar, warning awareness +
time-to-arrival, SPC/MD/LSR/mPING layers, intercept + escape solvers, placefile import,
viewshed, replay trainer. *Done when: a simulated chase on an archived event is
navigable start-to-finish on a phone over throttled LTE.*

---

## 7. Risks & constraints

- **GRIB2 in-browser** is the hard part of Phase 3 — mitigation: proxy-side slicing to
  simple binary. Don't let file-format wrestling block visuals.
- **Level 2 decode + velocity dealiasing** are the hard parts of Phase 6: bzip2/MSG31
  parsing is fiddly but mechanical; dealiasing is a genuine algorithm (region-based) with
  known failure modes. Ship with an "aliased raw" toggle so wrong dealiasing is never
  silently trusted.
- **Radar bandwidth:** a Level 2 volume is 5–20 MB; chase mode must fetch per-tilt and
  per-moment on demand, never whole volumes on mobile.
- **Open-Meteo limits** (~10k/day free): fine for point queries; gridded wind fields must be
  fetched sparingly and cached aggressively (one global field per level per hour, shared).
- **Blitzortung** feed etiquette: community-run; reconnect politely, no abuse.
- **RainViewer free tier** could change terms; radar layer should degrade gracefully.
- **Globe tile math** (raster tiles on a sphere with LOD) is real work; consider flat-map
  first for tile layers with globe drape as a fast-follow.
- Pane suspension: hidden Browser pane freezes rAF — verify via dev hooks headlessly, as
  established in other projects.

## 8. Stretch ideas (parking lot)

- Hurricane mode: NHC track/cone ingest, wind-radii rendering, recon aircraft obs (free HDOB feeds).
- Aviation mode: TAF decode, cross-section along a great-circle route, icing/turbulence proxies.
- Webcam network overlay (Windy webcams API or similar free source).
- Space weather pane: aurora oval (NOAA SWPC OVATION), Kp index — same S3-style open data.
- Sferics audio: lightning strikes spatialized in stereo by bearing from probe point.
