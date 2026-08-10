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
  service, types) → `core` (data, time, settings, units) → `scene`. **Features never
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

## Dev/verify

- `window.__wx` — dev hook; stores attach themselves (inspect state, set time headlessly).
- Hidden Browser pane suspends rAF — verify via `__wx` where possible.
- Git: commit and push completed slices freely; tag phase completions.
