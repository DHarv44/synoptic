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

## Phase 3 — Wind (built; FIXED, on by default) ✅

- [x] Proxy: GFS via NOMADS **grib filter CGI** (OPeNDAP retired per SCN 25-81),
  decoded with grib2class, 0.5° int8 payload, run auto-discovery, 30-min cache.
- [x] Client: WebGL2 GPGPU particle system (RG32F ping-pong sim, equirect →
  mercator draw through the map matrix), level select (10m→250hPa), particle
  count + opacity settings, health wiring.
- [x] **Field corruption — FIXED (2026-09-05).** The salmon "block" (~74 m/s
  off Baja at 250 hPa) was the negative-reference-value decode bug: grib2class
  read GRIB2 Section-5 reference values wrong for negative R, shifting every
  value by ΔR/10^D. VGRD off Baja has a real R near −4000, so the whole v-field
  jumped ~tens of m/s — a coherent block, not noise. The `grib2RefValue` reader
  (server/gfsWind.mjs) re-reads octets 12–15 straight from the message and
  corrects the shift. Spike verification against Open-Meteo GFS point values
  (same run/valid hour): Baja 14.0 vs 14.18, Kansas 13.6 vs 13.5, jet 52.9 vs
  52.84 m/s — all <0.2 m/s. Whole-field scan: zero horizontal jumps >25 m/s in
  UGRD, max |value| 91 m/s (sane). Client decode round-trip re-derived and
  confirmed. Layer is now defaultEnabled:true; live 250 hPa render shows a
  clean jet with no artefact.

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
- [x] R4 — Tilt control + gate probe: worker retains all sweeps (REF/VEL
  every tilt; ZDR/RHO low tilts), floating site control (tilt ▲▼ with
  split-cut-aware filtering, REF|VEL moment switch, velocity colormap),
  click-probe readout with az/range, beam height (4/3-earth), and all
  moments at the gate.
- [x] R5 — Velocity + SRV: gate-continuity dealiasing in the worker (raw
  and dealiased sweeps both kept; RAW toggle per the honesty rule),
  Nyquist parsed from the RAD block, storm-relative velocity applied in
  the shader with Bunkers right-mover motion computed from the site's
  model sounding (shown in the control, e.g. "storm 303°/26kt").
- [x] R6 — Storm cells: NEXRAD storm attributes via IEM's GeoJSON re-serve
  (no NIDS parsing needed — deferred until a product it can't provide):
  severity-colored cell markers + id labels on the map, viewport-filtered
  cell table (dBZ/top/hail/TVS/meso) with click-to-fly. Shared-feed
  factory extracted (alerts refactored onto it).
- [x] R7 — **All-Tilts** (probe click → per-tilt REF/VEL column with beam
  heights; worker `probeColumn`; sweep storage split to sweeps.ts),
  **vertical cross-section** (Draw button, then click A and B → worker `section`
  samples REF along the line per tilt → RHI plot at true beam heights +
  dashed map line), and **cell trends** (client-side snapshot history —
  the IEM feed has no history endpoint — with dBZ/VIL/top sparklines on
  row select and ▲▼ deltas in the table; window starts at app open).
- [x] R8 — 3D echo view (R3F returns): worker exports a downsampled REF grid
  per tilt (`volume` message); each tilt renders as its true conical
  sampling surface at 4/3-earth beam height, vertex-colored by dBZ, with an
  adjustable threshold and orbit camera. Honest by construction — gaps
  between tilts are unsampled air, not missing echo. Bridge module lets the
  panel talk to the layer's worker. Raymarched isosurface remains a future
  upgrade (PLAN.md §3.3.3).

- [x] R9 — Radar controls moved off the map into the Radar panel (the
  unlabelled floating bench read as a mystery box), with ↑/↓ tilt stepping,
  a searchable 159-site picker, centre-on-site, and a site lock so panning
  can't swap sites and discard the probe/section. Rail indicators wired
  through the feature manifest (`dockIndicator`); Radar shows a slow green
  pulse while attached. 3D echo now re-requests its volume as new elevations
  land — it previously asked once at mount and stayed empty until remounted.

- [x] R10 — Radar fidelity + correctness: dual-pol moments displayable
  (SW/ZDR/PHI/RHO, each with its own ramp; retained on low tilts only),
  scan time + age + VCP on the panel, opt-in Level 2 smoothing (sentinel-
  aware bilinear, not a hardware filter), and four correctness fixes —
  stale ring-pass chunks ignored, sweep dropped on site change, exactly one
  composite drawn at a time, global composite restored outside the mosaic
  core. See HANDOFF "Radar composite rules".

## Phase 7 (coarse; slice when reached)

Chase HUD: PWA → GPS → warnings → intercept/escape → placefiles → trainer.

## Phase 8 — Meteorological Views (README roadmap item 9)

Every slice follows the registration checklist (service.ts SourceRef →
fetchJson with a fixture → poller/cached-fetch per the decision rule →
registerFeature with sourceIds → features/index.ts import → credits.ts →
demo fixture JSON). Features never import features; shared data goes to
core/data. New proxy routes land in BOTH vite.config.ts and
server/index.mjs, above the /proxy 404.

- **M0 — layering repair** ✅ DONE. acbffc8 violated the import boundary:
  forecast/DailyPanel imports models/ModelAgreement, which imports
  forecast/dayLabel back. Move the models data access (MODELS keys/labels,
  HourlyByModel, urls, modelSeries, useModels/useEnsemble) into
  core/data/openMeteo/models.ts beside useForecast; move
  temperatureAgreement + test to core/data/openMeteo; ModelAgreement
  component moves into features/forecast (it renders in forecast's panel);
  features/models keeps colors + chart + panel. No behavior change.
- **M1 — satellite bands** ✅ DONE (GeoColor, Clean IR, Air Mass, Red
  Visible; GIBS carries no GOES water vapor — Air Mass is the WV-derived
  substitute). Add GOES ABI via GIBS: GeoColor,
  Band 13 clean IR, Band 8/9/10 water vapor, each with a one-line "what
  this band shows". Wire the dead `daily` flag: sub-daily products need an
  ISO timestamp snapped to the product's cadence (10 min) and clamped back
  far enough for GIBS latency; verify actual availability/latency per layer
  id at build time, not from memory. Switch SatelliteLayer to the
  setTiles-not-rebuild pattern (copy GlobalLayer, not the current rebuild
  on every opacity tick). Timeline scrubbing animates sub-daily bands.
- **M2 — aviation hazards** ✅ DONE for SIGMETs + PIREPs (feature
  `aviation`, /proxy/awc route, slots aviation-fill + pirep). Deferred to a
  later pass: TAFs in the panel, G-AIRMETs (LINE geometries, different
  rendering problem). New `aviation` feature: SIGMET/AIRMET
  polygons (below labels, alerts-fill styling discipline), PIREP points
  (above labels, METAR's four decisions: persistent source + setData,
  quantized viewport key, thinning, sprite pruning), TAF text beside METAR
  in the panel. Generalize the proxy: /proxy/awc/<product> → 
  aviationweather.gov/api/data/<product>, replacing the METAR-specific
  rewrite (keep /proxy/metar working or migrate its caller). Fixtures for
  each product.
- **M3 — gridded fields service** ✅ DONE (server/gfsGrid.mjs uint16 +
  per-payload scale/offset; core/grid/isolines marching squares with
  chaining; feature `fields`: MSLP/500 hgt/850 temp/CAPE at conventional
  intervals). Deferred: forecast-hour stepping (f000 analysis only, like
  wind), antimeridian seam (lines clip at ±180), GRIB decode fixture (the
  pipeline was validated against live data instead; the pinned wind bug
  lives in the u/v pair path, which scalars do not touch). Generalize
  server/gfsWind.mjs → a variable registry ({var, level, TypedArray,
  scale, offset} per plane), route /proxy/gfs-grid?var=&level=, header
  {planes:[{name,scale,offset}]}; int16 for MSLP/heights/CAPE. Client:
  core/data/grid/ fetch+decode mirroring wind/service.ts, d3-contour →
  GeoJSON → line layer + labels. First field shipped: MSLP isobars.
  Decode tests against a recorded GRIB fixture — this code hosts the
  pinned wind bug (Phase 3), so tests here either find it or fence it.
- **M4 — surface chart** ✅ DONE. The unknown resolved cleanly: IEM's AFOS
  archive re-serves the CODSUS coded bulletin with open CORS (WPC itself
  does not), so no proxy. core/data/wpc/codsus.ts parses the token stream
  (7-digit lat×10/lon×10 points, sections wrap across lines); feature
  `fronts` draws chart-colour lines + H/L centres with pressures over the
  M3 isobars. Deferred: pip sprites (triangles/semicircles — dash patterns
  stand in), stationary front two-colour alternation.
- **M5 — SPC suite** ✅ DONE. CORS open everywhere — SPC serves outlooks
  directly (the .lyr GeoJSON carries SPC's own stroke/fill per category, so
  no colour table to rot), IEM serves MCDs and current watches. Feature
  `spc`: Day 1–3 categorical fills at the bottom of the data stack, watch
  parallelograms (PDS drawn heavier) and MCD outlines up with warning
  boundaries, panel with watch details and MCD full text on expand.
  Deferred: probabilistic outlook layers (tornado/wind/hail %), Day 4–8.
- **M6 — real soundings** ✅ `core/data/iem/raob.ts`: IEM raob.py serves
  clean JSON with open CORS — no proxy needed at all (Wyoming/IGRA never
  used). Thermo levels form the profile; wind, reported on its own levels,
  interpolates to them as u/v in log-p. Nearest online station within
  400 km (`_XXX` area-alias ids return empty and are skipped), latest
  00Z/12Z behind a 2 h archive lag, one-cycle fallback for missed
  launches. SoundingTrace extracted; observed draws dashed under the
  model traces with a station/distance legend line, toggleable in
  settings. Found and fixed in passing: yOfP was vertically mirrored —
  the whole skew-T had been rendering upside down (regression test now
  pins orientation). Deferred: observed-parcel indices, hodograph overlay.
- **M7 — more observations** ✅ three slices, all landed:
  `buoys`: NDBC latest_obs.txt has no CORS → `/proxy/ndbc` (server/ndbc.mjs)
  parses the whitespace text to JSON, 10 min cache; one global file, so the
  layer polls once — no bbox chasing. Circles coloured by wave height with
  unit-aware labels; stations >3 h stale or with no marine data hidden.
  `gauges`: NWPS replaced the planned USGS iv — same keyless/CORS-open, but
  carries flood categories, which is the value a workstation wants. The
  `srid=EPSG_4326` param is mandatory or the API silently returns zero
  gauges. METAR-style viewport poller (MIN_ZOOM 6); AHPS colours, flooding
  gauges drawn larger; "flooding only" setting.
  Air quality: Open-Meteo AQ subdomain, `Air quality` row in the Now panel
  (US AQI + EPA category), nearest-hour pick that skips null readings.
  Deferred: buoy/gauge click-through details, AQ map layer.

Order: M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7. M4 depends on M3; the rest
are independent and can reorder if a data-format unknown blocks one.

## Phase 10 — volcanoes (2026-09-05) ✅ V1–V4 in one pass

Built during the Krakatau eruption (ash to FL500). `features/volcanoes/`:
- **Data** (all verified live before building): Smithsonian GVP WFS via
  `/proxy/gvp` (no CORS upstream; propertyName-trimmed to 465 KB, volcano
  NUMBER is the join key VAAs carry); USGS elevated API (CORS-open, US
  alert levels); VAAC ash advisories as FV* text bulletins via
  `/proxy/vaa` → tgftp (~39 fixed slots across seven VAACs, stale DTGs
  filtered at 24 h). GIBS SO2/aerosol was evaluated and REJECTED — the
  whole product family 404s past 2026-06-01.
- **vaa.ts parser**: header fields, deg+min coordinate decode, and
  token-stream polygon parsing — one section stacks several flight-level
  polygons (Krakatau ran SFC/FL200 + SFC/FL500 per timestep), each opened
  by a level band and closed by MOV; observed + est + 6/12/18 h forecasts.
- **Status model**: a live VAA = erupting, globally, whatever any database
  says; USGS colour codes fill in US watch/advisory; markers hide quiet
  volcanoes unless "show all Holocene" is on.
- **Display**: status-coloured triangle sprites + labels, observed ash as
  wash+outline, forecasts dashed fading with lead time (new 'volcano-ash'
  + 'volcanoes' slots), click card (GVP identity + live advisory), panel
  of erupting/elevated with raw bulletin expand, intl VA SIGMETs merged
  into the aviation feed (VA only — global TS/TURB would be clutter), and
  a Volcanic preset (VIIRS true color — GOES-East can't see Sunda).
- **Seismicity**: opening a volcano card fetches USGS ANSS quakes ≤30 km /
  7 d (CORS-open, no proxy) — card line ("7 quakes · max M1.8" or "no
  quakes catalogued", honest about the ~M4.5+ floor outside US networks)
  plus transient magnitude-scaled dots ('volcano-quakes' slot) that clear
  with the card. Verified live on Great Sitkin (7 events) and Krakatau (0).
Deferred: plume-height history, SO2 imagery when a live product returns.

## Phase 11 — Timeline as a clock (2026-09-05) ✅ borrowed from zoom.earth

Studied zoom.earth's playback (their smoothness: self-hosted multi-satellite
geocolor tiles, worker decode, single-canvas compositor — pipeline out of
reach, client patterns not).

- **Steppable clock**: day/hour/10-min segments with chevrons (TimeStepper)
  replace the 64-day slider — 5 h/pixel made a 10-min frame unreachable.
  Scrubber now covers the recent 6 h, fine-grained; steppers reach the rest.
- **Play-from-here**: play while scrubbed past the loop window SWEEPS
  forward from the playhead (frame-aligned, ungated) and goes live on
  catching up; live/recent keeps the radar-loop semantics. playMode in the
  timeline store; tooltip says which play you're getting.
- **Deep-linkable time**: `#t=2026-09-05T05:40Z` sets the clock on boot
  (urlTime.ts); a resting scrubbed clock writes itself back, live clears it.
  No writes during playback or drags (replaceState rate limits).
- **Fixes surfaced while verifying**: Tokyo VAAC publishes only fvfe01
  (fvfe02-04 were phantom slots, resurveyed tgftp live); AVO notices can
  share a noticeId across volcanoes (panel key now vnum+noticeId).
Deferred: historical radar depth via IEM archive tiles (probe first) — the
UI now reaches −48 h but most layers only have frames for the last hours.

## Phase 11b — Satellite ring + loop warmth (2026-09-05) ✅

- **Probes**: IEM n0q-t WMS archive serves 200s a full year back — CONUS
  radar history needed no new work, the clock UI already unlocked it
  (RainViewer global stays shallow; honest). GIBS carries GOES-West
  (GeoColor/IR/vis/Air Mass) and Himawari (IR/vis/Air Mass, no GeoColor),
  10-min cadence, ~1-month rolling archive — all verified against live
  capabilities + real tiles.
- **Products**: 7 new satellite options (West ×4, Himawari ×3), flat
  workstation-style menu ordered by band. Volcanic preset upgraded from
  daily VIIRS to Himawari Clean IR — 10-min plumes over the W Pacific,
  readable at night.
- **Loop warmth**: satellite now prefetches loop frames like radar
  (coveringTiles slippy math + warmXyzFrames, viewport-capped), and a
  warmth combiner (core/time/warmth.ts) lets multiple reporters gate the
  loop on the slowest — previously two prefetchers would clobber one
  channel. Satellite cuts crisp while playing (fade 0), cross-fades at
  rest. Verified: Volcanic preset loop warmed 13/13 frames, Himawari URL
  live, fade flips with transport.
- **Footprint bounds** (follow-up): product switching measured at 1.0–1.6 s
  to fully-painted — but every geostationary product was requesting the
  whole viewport and eating 404s outside its disk (GIBS capabilities claim
  world coverage; the columns were probed directly). GOES-East now carries
  real bounds [−157,−81,6,81] on the source and the prefetcher clips to
  them; West and Himawari wrap the antimeridian — one box would crop real
  coverage — so they stay unbounded and 404 only in their gap quadrant.
  Verified: East GeoColor over Europe issues zero out-of-disk requests;
  three product switches over CONUS = 108/108 responses 200.
- **Mobile pass** (follow-up): tapping a hazard row from the bottom sheet
  now collapses it to the tab bar — on a phone the sheet covered the very
  polygon the tap flew to (MobileSheet watches the camera-request store, so
  features stay decoupled). The mobile playback bar swaps its static clock
  text for the day/hour/minute steppers — the 6-h scrubber had left history
  and forecast unreachable on phones — and stepper chevrons grew to a
  usable touch size everywhere. Popups, settings (13-product select wraps),
  and sheet scrolling verified at 375×812.
- **Mobile layer menu** (user-caught): the layers button expanded into the
  desktop rail's bare-icon column — 18 unlabeled icons whose names lived in
  hover tooltips no phone can show, growing uncapped until the top rows sat
  hidden under the top bar. Now a labeled, height-capped scrolling menu
  (LayerToggles `labeled` variant: title beside icon, health dot inline; no
  hover flyout — per-layer options stay in Settings on touch). Desktop rail
  unchanged.

## Phase 12 — Paper cuts (2026-09-05) ✅

- **Poller wake-on-enable**: a feed held open by a panel while its layer was
  off parked in startPoller with a full cadence on the clock (10 min for the
  volcano feeds), so enabling the layer showed nothing until that timer ran.
  The scheduler now subscribes to the settings store and runs a parked
  poller the instant `enabled()` flips true (5 tests, minimal `document`
  stub in the node env).
- **Popup dies with its layer**: MapPopup watches `styledata`; when the
  layer behind an open card is removed from the style the card closes.
- **RainViewer stops faking history**: pickFrame returned its oldest frame
  for ANY earlier time — at −24 h the global composite showed a 2-hour-old
  sky as yesterday's. Past a frame-and-a-half before the oldest frame there
  is now no frame and the layer draws nothing (future still clamps to the
  newest scan, matching the mosaic: radar has no forecast).
- **The "Marine-preset 404s" were a misread**: with fetch, map-error and
  transformRequest hooks installed at map creation on a fresh load, every
  request is 200 and MapLibre reports no errors, idle or panning, live or
  scrubbed. The counts came from the tab's cumulative console buffer left by
  the earlier satellite-switching session (GIBS out-of-footprint 404s, since
  bounded for GOES-East). Nothing to fix; recorded so nobody chases it again.

## Phase 13 — Wind visuals zoomed in (2026-09-05) ✅ user-caught

- **Streaks**: not respawn lines after all. Spawn positions came from the
  classic fract(sin(dot(p,·))·43758.5453) hash with arguments in the
  hundreds of thousands, where GPU sin() collapses to a coarse value set —
  a spawn LATTICE. Across a continent it passed for random; with the spawn
  box under a degree wide the same few x-values became evenly spaced
  vertical columns, every particle in a column tracing one line. Replaced
  with an integer PCG hash (no range problem). The respawn detector also
  became age-based (age only decreases at respawn) — the 0.02-of-the-world
  distance test was zoom-blind.
- **Blocky**: bilinear on the 0.5° grid; zoomed in one texel spans hundreds
  of pixels and each bilinear patch is a saddle the colour ramp's low-speed
  steps rendered as hard diagonals across the view. All three shaders now
  sample through one bicubic B-spline `windAt()` (4 bilinear taps). Option
  left open: serve the native 0.25° grid (4× payload) for true extra detail.
Verified z3.5/z6/z9 screenshots before and after; clean compile on reload.

## Phase 14 — Wind finished (2026-09-05) ✅

- **Native 0.25° grid**: the server fetched 0.25° GFS and decimated to 0.5°
  to save payload (508 KB raw). Measured: the full grid gzips to 533 KB —
  the same wire cost — so it now serves 1440×721 with gzip (Node zlib, no
  dependency) on both the Express proxy and the Vite middleware, compressed
  buffer cached beside the raw one. Client was already resolution-agnostic
  (header width/height, textureSize in the shaders).
- **Zoom-aware density**: the particle budget lives in the viewport, so
  screen density was constant and street zoom read as noise. drawFraction
  thins the drawn prefix (full to z5, halving ~every 1.4 zooms, floor 0.12).
- **Speed legend**: WIND_RAMP (ramp.ts) is the single definition — it
  generates the GLSL ramp AND the legend gradient, so the key cannot drift
  from the wash. Ticks in the user's wind unit. Mounted through a new
  registry slot `legendComponent` + shell MapLegends stack (bottom-left
  above the playback bar; above the thumb buttons on mobile) — radar's dBZ
  key can use the same slot.
Verified live: payload gzip 1440×721 step 0.25; legend "10 m wind · km/h"
with 0–160 ticks; z9 streaks individually readable; 250 tests.

## Phase 15 — User-saved presets (2026-09-05) ✅

- **captureScene()** turns the current stack into the same minimal SceneSpec
  the built-ins use — enabled scene features only, each carrying just the
  options that differ from manifest defaults — so a saved preset reads like
  a hand-written one and round-trips through applyPreset/sceneMatches.
- **useUserPresets** (persist `synoptic.presets` v1): save(label) / remove(id);
  `allPresets()` = built-ins then user's. Active-preset detection and
  apply-by-id now search both. Saving also applies the new preset, which
  only resets hidden options of layers that are off — the way the scene
  matches its own preset the moment it is saved (chip lights up).
- **UI**: PresetMenu gains a "Saved scenes" section (check + trash) and
  "Save current scene…" → SavePresetModal (name, Enter to save).
Verified live: saved "Pacific jet watch" → chip shows it, spec stored
{graticule, level2, satellite ir-west, wind 250 + opacities}, delete
removes it. 4 tests (capture minimality, `true` at defaults, round-trip
match, remove).
