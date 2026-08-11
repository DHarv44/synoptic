# HANDOFF — read me first (written by Fable 5 for the next session)

Single entry point for continuing SYNOPTIC. Read in this order:
1. This file (state + in-flight work + traps).
2. [CLAUDE.md](CLAUDE.md) — conventions charter + toolchain gotchas (binding).
3. [SLICES.md](SLICES.md) — per-slice status ledger (kept current; trust it).
4. [PLAN.md](PLAN.md) — full product spec (the "why" behind everything).

## Where things stand (2026-08-11)

- **Done & verified live**: Phases 1, 2, 2.5, 4, 5 (tags exist) and radar suite
  slices R1–R6 (Level 2 streaming decode → polar WebGL render → tilts/probe →
  dealiasing/SRV → storm-cell table). Everything committed and pushed to
  https://github.com/DHarv44/synoptic (remote `origin`, branch `main`).
- **Working state is clean**: no uncommitted work in flight. If you find dirty
  files, `git status` + diff them against this doc's claims before trusting either.
- **Next planned work (R7, not started)**: All-Tilts (probe a point → values
  across every elevation; worker already retains all sweeps — add a message
  type), vertical cross-section (drag line → range-height slice), cell trend
  charts (needs client-side snapshot accumulation of the IEM attr feed —
  there is no history API). Then R8: 3D radar volume (react-three-fiber
  returns; deps still installed).

## The end-game queue (user-agreed order: features first, then these)

1. **Pinned wind bug** — full diagnosis state in SLICES.md "Phase 3". Resume at:
   VGRD region spike vs known-good values (e.g. Open-Meteo point winds at
   250 hPa, 22N 120W). Suspects: grib2class VGRD decode, or u/v assembly.
   Also re-test after any fix WITH the globe/mercator note below in mind —
   part of the original misplacement was the globe-projection matrix issue.
   The wind feature ships `defaultEnabled: false` until fixed.
2. **UI overhaul** — user will provide a gripe list against the current build;
   deferred items to fold in: alert ticker, radar color-table `.pal` support,
   manual Level 2 site picker, layer re-ordering, zone-alert geometry
   resolution, globe projection restoration (needs maplibre projection
   shader API in custom layers).
3. **Phase 7 Chase HUD** — PLAN.md §3.14.
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
