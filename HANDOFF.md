# HANDOFF — read me first (written by Fable 5 for the next session)

Single entry point for continuing SYNOPTIC. Read in this order:
1. This file (state + in-flight work + traps).
2. [CLAUDE.md](CLAUDE.md) — conventions charter + toolchain gotchas (binding).
3. [SLICES.md](SLICES.md) — per-slice status ledger (kept current; trust it).
4. [PLAN.md](PLAN.md) — full product spec (the "why" behind everything).

## Shell architecture (read before touching the UI)

The layout rule that decides where anything goes:
**settings are preferences that persist; controls are state you change while
working.** Layer *visibility* is a control (on the map), layer *opacity* is a
setting (in Settings). Radar tilt is a control (floating bench), default tilt
would be a setting.

Three surfaces, split by kind, not by topic:
- **Map** — the hero, edge to edge. Carries the playback control, the
  loading indicator and the reorient button, and nothing else. The radar
  bench that used to float here was removed: unlabelled controls over the
  map read as a mystery box to anyone who isn't already a radar user.
- **Left rail + tool panel** (`ToolRail`/`ToolPanel`, `toolStore`) — *views*
  with their own camera/navigation. Today: the radar workbench (3D echo |
  cross-section). Resizable, % width persisted. Features contribute via
  `FeatureManifest.tools`.
- **Right rail + dock** (`DockRail`/`AnalysisDock`, `dockStore`) — *readouts*,
  in five tabs: Location (probe-driven), Nearby (viewport-driven), Radar
  (Level 2 controls + readouts), Settings, Help. Settings and Help are
  special-cased in `DockContent`; the rest come from the registry. Each is a
  scrolling column of collapsible
  `DockSection`s; expansion persists. Features contribute via
  `FeatureManifest.panels` with a `group`.
- Clicking the active rail tab collapses that panel; there are no separate
  collapse buttons. Mobile replaces the right rail with a bottom tab bar
  (peek/half/full) and the tool rail with buttons across the top of the map;
  layers expand from a map button into the same vertical icon strip.

Radar state is centralised in `features/radar/level2/store.ts` — the map layer
is the only writer; bench, workbench and readouts all read from it.

**Map layer stacking** is declared once in `map/layerOrder.ts`. Always add
map layers with `addDataLayer(map, spec, slot)`, never `map.addLayer` — the
order otherwise depends on which feature mounted last, and toggling a layer
off and on moves it to the top (this is how radar came to cover warnings).

## Where things stand (2026-08-11)

- **Done & verified live**: Phases 1, 2, 2.5, 4, 5 (tags) and the whole radar
  suite R1–R8 (tag `phase-6`): streaming Level 2 decode → polar WebGL render →
  tilts/probe/All-Tilts → dealiasing + SRV → storm cells with session trends →
  cross-section → 3D echo. Plus the **UI overhaul** (see the shell
  architecture above): rails, tool panel, four-section dock, rebuilt settings,
  mobile layout, translucent chrome, loading indicator, local/UTC times.
  Everything committed and pushed to https://github.com/DHarv44/synoptic
  (remote `origin`, branch `main`).
- **Recently removed on purpose**: section drag-and-drop (a permanently
  draggable container swallows presses on its content — canvases, sliders,
  map gestures; arming from a grip was still fragile and touch-hostile) and
  shift+click for cross-sections (MapLibre binds shift to box zoom and
  consumes it). Cross-sections are now drawn from an explicit Draw button
  with a rubber-band line, Cancel/Esc, and Redraw. Both are on the roadmap
  with the safer approaches noted.
- **Working state is clean**: no uncommitted work in flight. If you find dirty
  files, `git status` + diff them against this doc's claims before trusting either.
- **Unverified end-to-end**: the surface-obs fix (sprite generation batched
  across frames, cached, source no longer torn down per fetch) was justified
  by wall-clock measurement — 80 stations cost 119 ms synchronously, 111 ms of
  it `getImageData` — but the METAR feed was returning HTTP 502 upstream at
  the time, so it was never watched working against live observations.
  Re-check when the feed recovers.
- **PHASE 6 RADAR SUITE COMPLETE (R1–R8)**: streaming L2 decode → polar
  WebGL render → tilts/probe/All-Tilts → dealiasing/SRV → storm cells +
  trends → cross-section → 3D echo view.
- **Since then (all pushed)**: session persistence; alert filtering by
  severity + category with cell/lightning thresholds; decoupled wind /
  pressure / precipitation units; a Help dock tab; collapsed-section summary
  lines; a profiled performance round; displayable dual-pol moments; scan
  time + VCP on the radar panel; opt-in Level 2 smoothing; and a run of
  radar-correctness fixes listed under "Radar composites" below.
- **Next up is the end-game queue below** (wind bug → UI overhaul → Chase
  HUD). Optional radar polish if asked: raymarched isosurface instead of
  tilt surfaces, `.pal` color tables, dual-pol presets
  (TDS/hail auto-flagging — PLAN.md §3.3.3), volume-rollover blanking.

## Radar composites: what's true, and what I got wrong

The user reported for a long time that "the radar changes when I zoom". I
chased it across four commits (`1125cf5`, `60528ef`, `e53cd71`, `84d5cbe`)
and **made it worse**, then reverted the lot in `e0c86f6`. Read this before
touching [RadarLayer.tsx](src/features/radar/RadarLayer.tsx) again.

**The mistake.** To stop the two composites blending, I hid the global one
whenever the viewport fitted inside the mosaic's coverage box, and added a
`raster-resampling` step expression to soften overzoomed tiles. Between them
that put *three* appearance transitions in the way of the very complaint I
was chasing: a whole-product swap keyed on viewport bounds (so zoom **and**
pan flipped it, with different colour tables either side), plus nearest→
linear flips at z7 and z12. `MOSAIC_CORE` only existed to patch a bug the
swap itself introduced — hiding the global layer over Cuba, the Gulf and
central Canada left the map bare. None of it was measured first.

**The lesson**: don't add zoom-keyed rendering behaviour to fix a
zoom-dependent complaint. Verified after the revert — z4 shows continuous
coverage across North America, and z4/z6/z8 at the same centre resolve the
same storm structure in the same place.

Real causes found in that period, all still fixed and worth keeping:

- **Level 2 chunk listings must drop earlier ring passes.** Volume prefixes
  wrap 0–999 and old objects are never deleted, so a prefix holds both the
  current pass and one from days ago. The stale pass owns the low sequence
  numbers, so its start chunk reset the sweep store with three-day-old
  radials. `currentPassChunks` filters on the timestamp in the key.
- **A sweep belongs to its site.** `setSite` drops the retained sweep when the
  origin moves, or old echo is redrawn around the new radar.

What was *measured and found correct*, so don't re-litigate it: mosaic tiles
are georeferenced consistently across zooms (870 points, z9 vs z10, 99.1%
agreement at zero offset; every trial shift made it worse), and the Julian
date decode matches S3 keys that embed their own timestamp to within seconds.

**Known and accepted**: the two composites are stacked, and the mosaic's "no
echo" is transparent, so inside CONUS the picture is mosaic-over-global
rather than mosaic alone. Living with a blend beats a hard swap.

### The actual bug, and the fix

Every zoom level was serving a **different generation of the mosaic**. The
cached tile products (`nexrad-n0q-900913` and its `-mXXm` siblings) are
rolling images with `Cache-Control: max-age=300`, so each tile shows whatever
generation existed at its own fetch moment. Proved by sampling one lat/lon at
one instant: **z7 read deep red `198,0,0`, z10 read yellow `255,226,0`** — and
ten minutes later z10 had caught up to red. Same weather, minutes apart, per
zoom level. Storms move between generations, so each zoom step redrew the
echo somewhere else. Neighbouring tiles skewed the same way, which is where
the hard rectangular seams in the user's screenshots came from.

This is what the user reported from the very beginning, in these words: it
gains fidelity as you zoom (correct, expected) but the sharper data lands in
the wrong place. It is **not** a projection or georeferencing fault — tiles
are correctly placed, which is why the tile-agreement measurement passed and
then got misused for months to dismiss the complaint.

Fixed by pinning an absolute valid time on every request:

- `iemValidTime()` quantizes to a 5-minute generation, one step back from now.
- `iemTileTemplate()` targets `wms/nexrad/n0q-t.cgi`,
  `LAYERS=nexrad-n0q-wmst`, `TIME=<iso>`, `BBOX={bbox-epsg-3857}`.

Verified after: 16-point grid, z7 vs z10, same pinned time — 7 exact colour
matches, 15/16 within one shade, worst case bright green vs dark green (one
intensity step, i.e. resolution). Before, the same comparison flipped whole
intensity categories.

Don't go back to `/cache/tile.py` for this layer. Also don't reach for
`wms/nexrad/n0q.cgi` — it accepts `TIME` and ignores it (identical bytes for
any timestamp); only the `-t.cgi` variant honours it. Cost of the WMS is
~0.5–0.75 s/tile against ~0.3 s for the tilecache: it renders on demand
rather than serving pre-cut tiles. That is the price of every tile agreeing
on what time it is.

### Values, not pictures (`features/radar/mosaic/`)

Mosaic tiles are translated back to reflectivity and recoloured with *our*
table before MapLibre sees them. This is what makes the composite and the
Level 2 sweep one product rather than two that resemble each other.

How it works, and why each piece is the way it is:

- **`addProtocol`, not a custom layer.** `synoptic-mosaic://<floor>/<upstream>`
  intercepts the fetch; MapLibre keeps tiling, caching, overzoom and fading.
  Confirmed against the installed source — a protocol handler may return an
  `ImageBitmap` directly, so there is no PNG re-encode.
- **The floor rides in the URL.** MapLibre caches on URL, so changing it
  invalidates tiles. Put it anywhere else and old colours linger.
- **The reverse lookup is exact, not nearest-match.** n0q renders from a
  256-level indexed raster where `dBZ = index / 2 - 32` — the same indexing
  `reflectivityLut()` already used, so translation is index to index with no
  arithmetic between. Verified on live tiles: alpha is only ever 0 or 255 (no
  antialiasing) and all 14 sampled colours were exact palette entries.
- **The palette came from IEM's own raster.** The archive composites at
  `/archive/data/YYYY/MM/DD/GIS/uscomp/n0q_YYYYMMDDHHMI.png` are 8-bit indexed
  and carry it in the PNG `PLTE` chunk. Regenerate from there if it changes.
  Dead ends already checked: `GetLegendGraphic` returns a blank 75-byte PNG,
  and `FORMAT=image/png; mode=8bit` gives a *per-tile adaptive* 111-entry
  quantization, not the canonical ramp.
- **Cost, measured:** 1.18 ms recolour + 0.3 ms decode per tile, ~30 ms across
  a 20-tile viewport, interleaved with network waits. `buildTranslation` is
  0.7 ms and memoized per floor. No worker needed; `recolor` is pure, so
  moving it to one is a lift-and-shift if that changes.

### Playback is a loop, not a scrub

`play` cycles `LOOP_WINDOW_MS` (1 h) in `LOOP_FRAME_MS` (5 min) steps — 13
frames — and wraps, holding the newest for `LOOP_END_HOLD` frames so the
cycle is readable. It used to run `simTime` forward continuously from now,
which meant pressing play at LIVE (the default state) advanced the clock into
the forecast while the radar sat frozen, because radar has no forecast.

- The **accumulator lives in the driver, not the store.** Each frame schedules
  the next via `setTimeout`; putting a counter in the store would notify every
  subscriber several times a second to report that nothing had changed.
- **Wrapping re-reads the window**, so a loop left running picks up new scans
  instead of cycling a frozen hour. Stepping past the old newest frame simply
  continues when newer generations have since arrived.
- **The mosaic source must not be rebuilt per frame.** `MosaicLayer` creates it
  once and uses `setTiles`; keying `useMapLayer` on the tile URL threw away the
  source's tile cache on every frame. Measured before/after: 2 rebuilds in 8 s
  → 0.
- **Known freshness cost:** `iemValidTime` steps back one generation, so the
  newest loop frame is 5–10 minutes old. Deliberate — the current generation
  may be incomplete — but it is the thing to revisit if latency matters.
- **Do not trust playback-rate measurements taken in the Browser pane.** Timers
  are clamped there; a 350 ms frame interval sampled as ~1.5 s, and the 60 ms
  poller measuring it was clamped too. Verify the sequence by calling
  `advanceFrame()` directly instead.

### Prefetching the loop (`mosaic/prefetch.ts`)

Cold, a frame's tiles take ~800 ms; cached, ~11 ms. Without prefetching, the
first pass of a loop is a slideshow and every later pass is smooth — an
inconsistency that reads as the app being broken. Playback now warms all 13
frames, so the whole loop runs from cache.

- **The tile geometry comes from MapLibre, not from re-deriving its maths.**
  The protocol handler records the `BBOX` of every URL it is asked for, and
  prefetch reissues those bboxes at the other valid times. MapLibre 5.24 does
  not expose source caches at a stable path, and its covering-tile rules
  (a 256 px source requests `round(zoom) + 1`) are easy to get subtly wrong.
- **Measure with real URLs, never hand-built ones.** Bboxes are floating-point
  strings; a hand-computed one will not byte-match MapLibre's, so it misses
  the cache and every frame looks cold. That produced a completely false
  reading once. Pull URLs out of `performance.getEntriesByType('resource')`
  instead — those are exactly what was issued.
- **Verified:** 13 frames warmed, oldest and newest both 11 ms for 20 tiles,
  against a 1445 ms cold control on the same bboxes at an unvisited time.
- Sweeps are debounced 500 ms after `moveend`, bboxes expire after 12 s and
  are capped at 48. Every extra bbox is multiplied by the frame count — before
  those limits a session was issuing 1191 requests per sweep against 540 now.
- `raster-fade-duration` drops to 0 while playing. At 175 ms per frame a
  150 ms cross-fade leaves two frames dissolving into each other for most of
  the loop, smearing the motion the loop exists to show.

**One composite draws, and the user picks it** (`radar.source`). The two are
different products with different valid times and colour tables, so drawing
both blends rather than overlays. Deciding automatically was worse — keying
it on the viewport made it flip while panning. It is a setting on purpose.

## Installable app (PWA)

`public/manifest.webmanifest`, the icon set, and `src/app/install.ts`. Icons
are generated by `scripts/build-icons.mjs` from `design/icon-source.jpg` — run
it rather than editing PNGs by hand; the circle geometry, maskable inset and
palette encoding all live there.

Rules that are load-bearing:

- **The service worker caches the app, never the data.** `isData()` excludes
  `/proxy/*` and the fetch handler ignores other origins outright. A cached
  radar tile inside a standalone window — no address bar, no reload button, no
  sign you are offline — is indistinguishable from live weather. Every
  observation request must be allowed to fail loudly.
- **`sw.js`, `index.html` and the manifest must never be cached** by the
  server (`NEVER_CACHE` in `server/index.mjs`). A cached service worker cannot
  ship its own replacement, and the app would be frozen at that version for
  everyone who ever loaded it.
- **Hashed `/assets/*` are cached cache-first on purpose.** That is what stops
  a deploy blanking an open tab: the running page asks for a lazy chunk whose
  filename no longer exists on the server, and the cache still has it.
- **No service worker in dev** — it would sit in front of Vite's module graph
  and serve yesterday's code.
- Updates are offered, not forced: a waiting worker sets `updateReady`, the
  top bar shows a reload button, and only then does the page post
  `skip-waiting` and reload on `controllerchange`.

**Cannot be verified in the Browser pane.** Service worker registration fails
there with "An unknown error occurred when fetching the script" even though
`sw.js` serves 200 as `text/javascript`, parses clean, and plain `Worker`
construction succeeds — the pane blocks service workers specifically. Verify
installs and update flow in a real Brave/Chrome window.

## The end-game queue (user-agreed order: features first, then these)

1. **Pinned wind bug** — full diagnosis state in SLICES.md "Phase 3". Resume at:
   VGRD region spike vs known-good values (e.g. Open-Meteo point winds at
   250 hPa, 22N 120W). Suspects: grib2class VGRD decode, or u/v assembly.
   Also re-test after any fix WITH the globe/mercator note below in mind —
   part of the original misplacement was the globe-projection matrix issue.
   The wind feature ships `defaultEnabled: false` until fixed.
2. **UI overhaul — STRUCTURAL WORK DONE** (see README roadmap item 2 for the
   full shipped list). Rail + 4-tab dock + collapsible reorderable sections +
   rebuilt settings + mobile bottom-tab layout + translucent chrome +
   loading indicator + local/UTC time preference are all in.
   Remaining, roughly in priority order:
   - **Section summary lines**: done. Every dock section fills
     `PanelContribution.summary` with a `<SectionHint>`; `tone="alert"` is
     for counts that mean something is happening. Viewport filtering moved
     into `useVisibleAlerts`/`useVisibleCells` and sounding indices into
     `sounding/indices.ts` so panel and summary can't disagree. Still open:
     a plain-language verdict line in the Location header.
   - **Rail indicators**: mechanism is in — a feature declares
     `dockIndicator` in its manifest (a component that renders
     `<RailIndicator />`), and `DockRail` collects them by panel group, so
     the shell never reads feature stores. Level 2 uses it for its live dot.
     Alerts and cells should contribute counts the same way.
   - Typographic pass (values should dominate labels), timeline as an
     information display, desktop panel resize, keyboard access.
   - **Deeper per-feature settings**: alert filtering, cell threshold and
     lightning fade window are done. Two patterns to copy: filtering lives
     in one hook that the layer, panel and summary all read
     (`useFilteredAlerts`, `useVisibleCells`) so surfaces can't disagree,
     and whatever is hidden gets counted back to the user, so a filter never
     reads as a quiet feed. `useFeatureOptions(id)` gives all of a feature's
     options with manifest defaults filled in; `featureOption(id, key)` is
     the non-hook version for services. Units are decoupled too: `useUnits()`
     returns the resolved set (temp/wind/pressure/precip) and the formatters
     take a unit rather than a system, each setting defaulting to `auto`.
     Still open (README has the list): height/distance units, L2 defaults,
     radar loop length/speed, METAR content/density, timeline defaults,
     per-source cadence. Then **presets** (PLAN §3.13a, never built) and
     settings search. Adding fields is cheap — they're declared in
     `FeatureManifest.settings` and the UI generates itself.
   - **Session persistence**: done. Persisted stores are `synoptic.` +
     settings / dock / tools / home / camera / probe / timeline / radar, all
     versioned (add a version + migration to any new one, per CLAUDE.md).
     Two rules worth keeping: persist choices, not downloads (the radar
     store partializes to selection only, and keeps `site` just while
     locked), and **don't persist the clock** — `rehydrateTimeline` always
     returns live, and `persistedTimeline` keeps only the loop speed.
     Restoring a scrub position meant a tab reopened hours later showed an
     old sky with only a timestamp to say so, and the loop made it routine
     because looping leaves `isLive` false. A version bump also needs
     `migrate` (`migrateTimeline`), or zustand discards the whole blob and
     the one preference worth keeping silently resets.
     Still open: shareable workspace URL (PLAN.md §3.12) and export/import.
   - **Help + About**: done, as a `help` dock tab (special-cased in
     `DockContent` alongside `settings`) rather than a modal — help beside
     the map beats help covering it. Content lives in `app/help/`; the
     shortcut list there is hand-maintained, so update it when a binding
     changes. `credits.ts` is the single source for attribution, read by
     both the footer strip and About. Version comes from a Vite `define`.
   - Plus: timeline affordances, empty states, keyboard (tab switch, Esc),
     deferred polish (alert ticker, `.pal` tables,
     layer re-ordering, zone-alert geometry, globe projection restore).
   - **Mobile/responsive pass** (drawers as bottom sheets, touch targets,
     phone timeline) — shares groundwork with the Chase HUD, do it
     before/with item 4.
3. **"Make it personal" — DONE** (location button, forecast panels, warning
   notifications, verdict line, model confidence). Where the last two live:
   - `forecast/characterize.ts` — pure; returns tokens (`{timeMs}`,
     `{gustMs}`) not text, so `ForecastVerdict` can honour the local/UTC and
     wind-unit preferences at the display edge. Rendered by `ContextHeader`
     for the place tab.
   - `models/confidence.ts` — cross-model 2 m temperature spread by day;
     `ModelAgreement` sits under the Outlook table and shares `useModels`'
     cache (which now takes an `enabled` flag so a disabled models feature
     fetches nothing).
   Deferred by design, needs a radar trend signal that doesn't exist yet:
   "rain in ~20 min" nowcast notifications and severe-parameter thresholds.
4. **Performance pass — first round done and measured** (numbers in README
   roadmap item 5): three.js split out of the initial bundle via a lazy
   `Volume3D` (2,679 → 1,751 kB), live clock quantised to 10 s (136 → 3 idle
   notifications per ~35 s), decode worker no longer re-posts identical tilt
   lists or a 1.3 MB sweep copy per chunk, 3D mesh build ~245 → 58 ms, and
   lightning skips no-op redraws. **The remaining big blocks are MapLibre's,
   not ours**: with the site locked (no worker restart, no floor render, no
   mesh rebuild) a cross-country `jumpTo` still cost one 1360 ms task —
   vector-tile upload and symbol placement. A teleport is the worst case;
   normal panning is far gentler. Don't chase this in feature code. The
   floor render was suspected and cleared by measurement (readback ~0 ms).
   Still open: long-session memory and retained-sweep caps, viewport
   filtering if lists grow, mesh building moved into the worker, and a
   low-end/mobile device pass, which also de-risks the Chase HUD.
   Profiling recipe: `PerformanceObserver` on `longtask` in the dev hook;
   store churn via `window.__wx.stores.<x>.subscribe`.
5. **Phase 7 Chase HUD** — PLAN.md §3.14.
6. **Radar quality + resolution** (README roadmap item 4). Two halves:
   *resolution* — one composite now draws (chosen by `radar.source`) and it
   shares a colour table and display floor with Level 2, so the groundwork is
   in; what remains is fading Level 2 in over a zoom range so it reads as
   detail resolving, plus multi-site blending so a single site's cone of
   silence and long-range beam climb are filled in.
   *quality* — the display floor is done (`radar.floor`, 15 dBZ). Clutter and
   biological returns still aren't suppressed; the CC and CFP fields we decode
   can do it for Level 2, but not for the composite, where IEM has already
   discarded the dual-pol moments. Sampling is nearest-neighbour, and partial
   sweeps show as wedges mid-volume.
7. **Historical mode** — needs a design pass before code (README has the
   open questions): period picking (curated named events + free date entry),
   showing per-source coverage on the timeline (radar→1991, models→1940),
   prefetch/cache strategy for many frames, **user-uploaded datasets**
   (own Level 2 volumes / GRIB / CSV — needs format + validation decisions
   and a hard boundary so imported data never mixes with live feeds), and
   replay-specific playback controls (loop, step-by-volume, export).
8. **Everything hurricane** (README roadmap item 8) — a tropical mode in the
   same sense as the Chase HUD. Nearly all of it is free and keyless from
   NHC. Core: active storms as selectable objects, track + cone, 34/50/64 kt
   wind radii (which is what gives arrival time at the home location),
   tropical watches/warnings, storm surge. Then spaghetti/ensemble tracks,
   recon HDOB and dropsondes, a satellite floater that follows the storm, and
   an intensity trace. Two things to settle before code: whether it is a mode
   or just layers that appear when storms are active, and how the 6-hourly
   advisory cadence sits on a timeline built for continuous radar. Two things
   to get right rather than fast: the cone shows where the *centre* may go,
   not where the effects reach, and surge is the layer most likely to be read
   as a promise.
9. Deferred science: virtual-temp CAPE correction, interactive parcel drag,
   radiosonde overlay, ML/MU parcels, dProg/dt, historical archive mode.

## Traps that cost hours (all reproducible, all documented)

- **Map must stay mercator** until custom layers use maplibre's projection
  API — globe breaks their matrices silently (CLAUDE.md).
- **MapLibre worker**: CSP build + `setWorkerUrl` is mandatory in this
  webview; the default blob worker dies silently (vector tiles just never load).
- **seek-bzip needs `buffer` polyfill in Web Workers** (Node tests hide this).
- **Vite pinned to 7.x**, maplibre pinned to 5.x — both v-next majors broke us
  (details in CLAUDE.md). Don't upgrade casually.
- **Hidden Mantine tab panels defer DOM updates** (React 19 Activity): select
  a tab before reading its panel in headless checks — stale text is not a bug.
- **In-app browser quirks**: `document.hidden` is true when the pane is hidden
  (pollers with `pauseWhenHidden` stall; rAF stalls — screenshots pump frames);
  the console log accumulates across reloads (old errors look current);
  Vite dep-optimizer discovery causes surprise full page reloads.
- **Frame-rate numbers from the pane are worthless unless input is actively
  being driven.** rAF is throttled when the pane isn't being interacted with,
  so an idle measurement reports ~1 fps with two-second frames regardless of
  workload — one run reported a 24-second "frame" while nothing was
  happening. This cost hours: I bisected features against stalls that were
  the instrument, not the app. Measure *wall-clock time of the work itself*
  (e.g. 80 METAR sprites = 119 ms, 111 ms of it `getImageData`), never fps
  across tool-call gaps. If fps is genuinely needed, drive real input in the
  same evaluation and keep the whole measurement inside one JS call.
- **User's standing orders**: between-phase dedup/monolith review (do it, they
  check); audit packages before installing (npm audit + downloads + install
  scripts — policy in CLAUDE.md); don't overthink; don't over-verify small
  changes; commit+push freely; gate commits on `tsc` passing (chain with
  `if ($LASTEXITCODE -eq 0)`, not `;`).
- **Git identity**: repo-local email is the GitHub noreply — keep it; never
  commit with the user's personal email (history was scrubbed once already).

## Verify-anything recipes

- Dev server: launch name `synoptic` (registered in T:/Dev/claude-desktop
  .claude/launch.json), port 5192. Dev hook: `window.__wx.stores`
  (map, settings, timeline, probe, health, mapView, three…). Fixture boot:
  `?fixture=demo` (offline everything except tiles/L2).
- Radar quick-look: jump the map via
  `__wx.stores.map.jumpTo({center:[-97,35], zoom:7}); map.fire('moveend')`
  → screenshot (screenshots drive rAF in the hidden pane). Level 2 control
  appears bottom-left at zoom ≥ 6; SRV/RAW chips under VEL.
- Tests: `npm test` (24 green: science reference values + L2 decoder against
  a real committed KTLX chunk). Typecheck: `npm run typecheck`.

## Style expectations for continuing

Match what's here: registry-driven features (`features/<x>/index.ts` manifest,
never cross-feature imports), pure-TS services, files ≤250 lines, science math
in `core/met` with reference-value tests, SLICES.md updated as slices land,
one commit per slice with the trailer
`Co-Authored-By: <model> <noreply@anthropic.com>`.
