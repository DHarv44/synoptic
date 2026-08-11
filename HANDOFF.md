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
  in four sections: Location (probe-driven), Nearby (viewport-driven), Radar
  (Level 2 readouts), Settings. Each is a scrolling column of collapsible
  `DockSection`s; expansion persists. Features contribute via
  `FeatureManifest.panels` with a `group`.
- Clicking the active rail tab collapses that panel; there are no separate
  collapse buttons. Mobile replaces the right rail with a bottom tab bar
  (peek/half/full) and the tool rail with buttons across the top of the map;
  layers expand from a map button into the same vertical icon strip.

Radar state is centralised in `features/radar/level2/store.ts` — the map layer
is the only writer; bench, workbench and readouts all read from it.

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
- **PHASE 6 RADAR SUITE COMPLETE (R1–R8)**: streaming L2 decode → polar
  WebGL render → tilts/probe/All-Tilts → dealiasing/SRV → storm cells +
  trends → cross-section → 3D echo view.
- **Next up is the end-game queue below** (wind bug → UI overhaul → Chase
  HUD). Optional radar polish if asked: raymarched isosurface instead of
  tilt surfaces, `.pal` color tables, dual-pol presets
  (TDS/hail auto-flagging — PLAN.md §3.3.3), volume-rollover blanking.

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
   - **Section summary lines**: `PanelContribution.summary` exists and
     `DockSection` renders it as the collapsed-state hint — no feature fills
     it yet. Add per-feature summaries (CAPE/shear for sounding, warning
     count for alerts, site/tilt for radar) and a verdict line in the
     Location header.
   - **Rail indicators**: mechanism is in — a feature declares
     `dockIndicator` in its manifest (a component that renders
     `<RailIndicator />`), and `DockRail` collects them by panel group, so
     the shell never reads feature stores. Level 2 uses it for its live dot.
     Alerts and cells should contribute counts the same way.
   - Typographic pass (values should dominate labels), timeline as an
     information display, desktop panel resize, keyboard access.
   - **Deeper per-feature settings** (README has the full priority list):
     alert event-type/severity filtering first (marine warnings swamp the
     list), decoupled units (kt/inHg/kft/nm independent of metric-imperial),
     L2 defaults + site lock, radar loop length/speed, lightning fade
     window, cell display thresholds, METAR content/density, timeline
     defaults, per-source cadence. Then **presets** (PLAN §3.13a, never
     built) and settings search. Adding fields is cheap — they're declared
     in `FeatureManifest.settings` and the UI generates itself.
   - **Session/workspace persistence**: feature settings DO persist
     (`core/settings/store.ts`, zustand `persist`, key `synoptic.settings`,
     versioned) — but map camera, probe, timeline position, active dock tab
     and radar tilt/moment/SRV do NOT and reset every reload. Restore those,
     then add the shareable workspace URL (PLAN.md §3.12) and export/import.
     Any new persisted store must carry a version + migration, per CLAUDE.md.
   - **Help + About panels**: interaction basics (probe click, shift+click
     cross-section — currently undiscoverable), keyboard list, plain-language
     notes on CAPE/SRH/hodograph/velocity folding; About with version, GitHub
     repo link, license, full data-source attribution (only the map credit
     shows today) and the "not a substitute for official warnings" line.
   - Plus: timeline affordances, empty states, keyboard (tab switch, Esc),
     deferred polish (alert ticker, `.pal` tables,
     layer re-ordering, zone-alert geometry, globe projection restore).
   - **Mobile/responsive pass** (drawers as bottom sheets, touch targets,
     phone timeline) — shares groundwork with the Chase HUD, do it
     before/with item 4.
3. **"Make it personal" trio** (user-requested, see README roadmap):
   - **My location button** on the map (browser geolocation) → center/zoom,
     stored as a home point that panels/alerts default to. Small: reuse
     `useCameraStore.requestFlyTo` + the probe store.
   - **Forecast panels** — 24 h hourly strip + 3/7/10-day summaries as new
     dock tabs beside Now/Meteogram/Skew-T/Models. Data already flows via
     `core/data/openMeteo` (`useForecast`); mostly a presentation slice.
     Consider annotating confidence from the Models tab's spread.
   - **Desktop notifications** — opt-in, home-location scoped: NWS warnings,
     radar-trend "rain in ~20 min" nowcast, severe-parameter thresholds.
     Needs permission flow, background-safe polling (note: pollers with
     `pauseWhenHidden` stall when hidden — use a non-paused poller or a
     service worker), and per-alert de-duplication by NWS alert id.
4. **Performance pass** (never profiled; README has the full list). Biggest
   suspects: the 250 ms timeline tick re-rendering every simTime subscriber
   (meteogram cursor, radar frame pick, sounding lookup) even when idle;
   Level 2 sweep deep-copy + transfer on every chunk (~1.3 MB × tens of
   retained sweeps); per-poll GeoJSON rebuilds (alerts, ~900 cells,
   lightning every 1 s); eager three.js/R3F load for one panel; viewport
   filtering over national lists on every `moveend`. Then measure: frame
   timings while streaming, long-session memory, bundle analysis, low-end
   mobile — which also de-risks the Chase HUD.
5. **Phase 7 Chase HUD** — PLAN.md §3.14.
6. **Radar quality + resolution** (README roadmap item 4). Two halves:
   *resolution* — the three radar layers (RainViewer ~z7, IEM ~z12, Level 2)
   are separate user-managed toggles that blur or run out as you zoom;
   want one layer that hands off automatically, plus multi-site blending so
   a single site's cone of silence and long-range beam climb are filled in.
   *quality* — clutter/biological returns aren't suppressed (use the CC and
   CFP fields we already decode), the display floor is too low, sampling is
   nearest-neighbour, and partial sweeps show as wedges mid-volume.
7. **Historical mode** — needs a design pass before code (README has the
   open questions): period picking (curated named events + free date entry),
   showing per-source coverage on the timeline (radar→1991, models→1940),
   prefetch/cache strategy for many frames, **user-uploaded datasets**
   (own Level 2 volumes / GRIB / CSV — needs format + validation decisions
   and a hard boundary so imported data never mixes with live feeds), and
   replay-specific playback controls (loop, step-by-volume, export).
4. Deferred science: virtual-temp CAPE correction, interactive parcel drag,
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
