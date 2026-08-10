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

- [ ] **S3 — Feature registry + settings.** `defineFeature()` manifest type, registry
  store, settings screen generated from registered manifests (Mantine modal/route,
  searchable), enable/disable wiring, localStorage persistence with schema version,
  presets scaffold (Workstation/Minimal). *Done: a dummy feature registers, appears in
  settings, toggles a rail entry live.*

- [ ] **S4 — Timeline store (skeleton).** zustand slice: `simTime`, `now`, play/pause,
  speed, range clamp (−48h now; forecast later), bottom-bar UI with scrubber +
  transport, keyboard (space, ←/→). All layers will read time from here — nothing else.
  *Done: scrubbing updates `simTime`; `__wx.setTime()` works.*

- [ ] **S5 — Data core + fixtures.** Source-adapter interface (`subscribe(products) →
  scheduler → cache → store`), fetch scheduler with per-source cadence/backoff +
  pause-when-disabled, IndexedDB cache (idb), **fixture mode** (`?fixture=<case>` swaps
  every adapter to bundled recordings), data-health store + top-bar strip (per-source
  dot + age). *Done: a fake adapter round-trips through scheduler→cache→store; fixture
  flag forces offline; health strip reflects a killed source.*

- [ ] **S6 — Globe.** R3F canvas in viewport: sphere, Natural Earth coastlines/borders
  (world-atlas npm pkg, no downloads), graticule, day/night terminator from real solar
  position, inertial orbit + zoom, fly-to(lat/lon), click→lat/lon picking event.
  Scene colors read Mantine scheme. *Done: globe spins at 60fps, terminator correct for
  current UTC, click logs coordinates.*

- [ ] **S7 — Probe + first data feature.** `probe` store (click sets probe point, marker
  on globe); **`features/conditions`** — Open-Meteo adapter (current + hourly), analysis
  dock panel: current conditions readout with units service (metric/imperial), data age.
  First real registry-registered feature. *Done: click anywhere on Earth → readout <2s;
  works from fixture too.*

- [ ] **S8 — Geocoding search.** Open-Meteo geocoding in top bar (Spotlight-integrated),
  recents, fly-to + probe on select. *Done: type "Norman, OK" → globe flies, probe set.*

- [ ] **S9 — Meteogram v1.** `features/meteogram` dock panel: d3-drawn temp/dewpoint
  band, precip bars, wind barbs, cloud cover — 7 days from the probe's hourly data,
  timeline-aware cursor. *Done: readable in both schemes; probe move redraws.*

**Phase 1 exit:** PLAN.md §6 Phase 1 acceptance met; commit tagged `phase-1`.

## Phase 2 — Live Layers (slice list, detail when Phase 1 closes)

- [ ] S10 — Tile-drape engine (slippy tiles on sphere, LOD, fade-in; the risk slice)
- [ ] S11 — RainViewer global radar layer + trailing-2h loop on the timeline
- [ ] S12 — MRMS 2-min CONUS mosaic (via proxy) + seamless swap at zoom
- [ ] S13 — GIBS satellite layers (true color / IR / water vapor)
- [ ] S14 — Blitzortung lightning websocket + strike pulse shader + density
- [ ] S15 — METAR station-model plots with zoom clustering
- [ ] S16 — NWS alert polygons + alert panel + ticker
- [ ] S17 — Layer rail v2: opacity, ordering, per-layer age badges, failure states

## Phase 3+ (coarse; slice when reached)

Wind particles (FBO sim → levels → time-lerp) · Sounding suite (skew-T → indices →
hodograph → 3D column → radiosonde overlay) · Models/ensembles · Historical mode ·
Radar suite (chunks ingest → polar render → tilts/probe → SRV/dealias → L3 products →
cell table/trends → volume 3D) · Chase HUD (PWA → GPS → warnings → intercept/escape →
placefiles → trainer).
