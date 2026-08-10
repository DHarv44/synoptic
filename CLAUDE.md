# SYNOPTIC

Web-native weather workstation: real public weather data (Open-Meteo, NEXRAD, MRMS, GOES,
Blitzortung…), R3F globe, pro analysis tools (skew-T, radar interrogation), chase mode.
**Read PLAN.md** (full spec) and **SLICES.md** (build order + status) before working.

## Commands

- `npm run dev` — Vite dev server on **port 5192** (also `.claude/launch.json` name `synoptic`)
- `npm run typecheck` / `npm run test` / `npm run build`

## Hard conventions (PLAN.md §4.2 is the authority)

- **No monoliths:** ~250-line soft cap per file, one component per file, no `utils.ts`
  dumping grounds. Split by responsibility when a file grows.
- **Layering:** `ui` (dumb primitives) → `features/<x>` (manifest, components, hooks,
  service, types) → `core` (data, time, settings, units) → `map` (MapLibre surface;
  a `scene/` dir returns in Phase 6 for R3F 3D views). **Features never
  import other features** — they meet only through core stores and the registry.
- **Services are pure TypeScript** (no React) — adapters, decoders, science math live in
  plain functions/classes; hooks wrap them. Science math gets vitest tests against
  published reference values.
- **Single sources of truth:** all unit conversions via `core/units`; all time via
  `core/time` (UTC internally, `Date` only at display edge; sim-time only from the
  timeline store). No inline conversions.
- **Every feature is registry-registered and togglable** (settings UI is generated from
  manifests). Disabled feature = no fetching.
- TS `strict`, no `any`. Persisted state carries a schema version.
- **No React StrictMode** (breaks R3F lifecycles). No editing source via node/sed/regex —
  Edit tool only.

## UI

Mantine v9 (core/hooks/spotlight/notifications), dark+light with
`defaultColorScheme="auto"`. Chrome stays achromatic — **hue belongs to data**; data
color ramps must be checked in both schemes. Monospace numerics, UTC-first clocks,
data-age badges everywhere, no layer ever renders blank on failure (degraded state +
data-health strip instead).

## Data policy

Free sources only; keyless preferred; free-tier keys allowed but live in `server/.env`
(proxy) — never in client code. Respect cadences (per-source schedulers, backoff).
Fixture mode (`?fixture=<case>`) must keep the whole app bootable offline.

## Toolchain pins & gotchas

- **Vite is pinned to v7 (rollup)** — Vite 8's rolldown optimizer produced duplicate
  fiber/React chunks ("invalid hook call" at boot). Keep the `resolve.dedupe` +
  `optimizeDeps.include` config in vite.config.ts.
- **Map surface is MapLibre GL, pinned to v5** (globe projection), with the
  **OpenFreeMap** vector basemap (keyless). MapLibre's default inlined-blob worker
  fails SILENTLY in sandboxed webviews (vector tiles never load, raster fine) —
  we use the CSP worker build via `setWorkerUrl` in MapView.tsx; keep it.
- Data layers must be inserted **before the basemap's first symbol layer**
  (`firstSymbolLayerId`) so labels render above radar/satellite. `setStyle` wipes
  custom layers — all layer setup goes through `useMapLayer` (styleVersion-keyed).
- R3F/three stays in the deps for Phase 6 3D views (volumetric radar, sounding
  column); the map itself is MapLibre-only.
- **Hidden Mantine tab panels defer updates** (React 19 `<Activity>`): a hidden
  tabpanel's DOM can show stale content until its tab is selected. This is correct
  behavior — do NOT chase it as a state bug, and don't verify panel reactivity by
  reading hidden panels headlessly; select the tab first.
- `aviationweather.gov` blocks browser CORS → `/proxy/metar` (vite dev proxy; the
  prod Express proxy must serve the same route).

## Dev/verify

- `window.__wx` — dev hook; stores attach themselves (inspect state, set time headlessly).
- Hidden Browser pane suspends rAF — verify via `__wx` where possible.
- Git: commit and push completed slices freely; tag phase completions.
