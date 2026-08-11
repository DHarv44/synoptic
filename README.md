# SYNOPTIC

A web-native **weather workstation** built entirely on free, public data — streaming
Level 2 radar with professional interrogation tools, severe weather alerts,
forecaster-grade sounding analysis, and multi-model comparison, in one dark
instrument-panel UI.

**▶ [Live demo](https://synoptic-production.up.railway.app/)**

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
| Forecast panels | Plain-language 24 h / 3-day / 7-day / 10-day outlooks per location | 🔭 |
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
| My location | One-tap center/zoom on where you are | 🔭 |
| Notifications | Desktop alerts for warnings and incoming rain at your location | 🔭 |
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
   and is due a deliberate design pass. The map should be the hero; chrome
   should be summonable, not permanent.

   **Chrome restructure**
   - **Fold Layers into Settings** and retire the permanent left rail. Layer
     toggles, opacity, and source health are settings — they don't need to
     occupy a column full-time. Reclaims that width for the map.
   - **Settings becomes a drawer**, not a modal: slides in over the edge,
     dismissible with Esc or a click outside, scrollable, with the existing
     registry-generated sections plus the layer stack at the top.

   **Right panel reorganization** — the dock has grown to seven tabs
   (Alerts, Cells, Now, Meteogram, Skew-T, Models, 3D) and forecast panels
   would push it past ten; the tab strip already wraps. The real problem
   isn't count, it's that the tabs mix two different mental models:
   *"tell me about this point"* (probe-driven) and *"what's happening around
   here"* (viewport-driven). Proposed collapse to three top-level tabs:
   - **Place** — everything about the probed point, grouped by how deep you
     want to go: conditions + forecast at the top (a scrollable stack, not
     tabs — they're one story at different time scales), with Sounding and
     Models as sub-views for when you want the full analysis.
   - **Nearby** — the viewport-driven situation: active warnings and storm
     cells merged into one severity/distance-ranked list rather than two
     separate tabs answering the same question.
   - **Radar** — the radar tool bench: site, tilt, moment, SRV/RAW, the 3D
     echo view, and the cross-section, all in one place. This also gives the
     floating site control a real home instead of hovering over the map.

   **Deeper settings** — the registry already generates the settings UI from
   each feature's manifest, so new controls are cheap to add; the discipline
   is choosing ones that earn their place. Priority order:
   - **Alert filtering by event type + severity floor** — the biggest noise
     win available (Special Marine Warnings routinely make up the large
     majority of active alerts; inland users should be able to retire them).
   - **Decoupled units** — wind in kt/mph/km-h/m-s, pressure in hPa/inHg,
     heights in m/ft/kft, distance in km/mi/nm, independent of the metric /
     imperial system switch, the way professional tools do it.
   - **Level 2 defaults** — default moment and tilt, site lock (manual pick
     vs auto-nearest), range rings, dealiasing default.
   - **Radar loop behavior** — loop length (30 min / 1 h / 2 h), speed,
     end-frame dwell.
   - **Lightning fade window**, **storm-cell display thresholds** (min dBZ /
     VIL, or TVS-and-meso only), **METAR content + density**, satellite
     product/band expansion, wind trail length and color-by, timeline
     defaults (range, arrow-key step, auto-return-to-live), basemap style
     and label density, per-source refresh cadence for bandwidth/battery.
   - **Presets** — Workstation / Chase / Minimal plus user-saved profiles
     (specified in PLAN.md §3.13a, never built) and **settings search**;
     both matter much more once the knob count grows.
   - **Session / workspace persistence** — feature settings already persist
     to localStorage (versioned), but session state does not: map camera,
     probe point, timeline position, active dock tab, and radar tilt/moment/
     SRV selections all reset on reload. Restore them, add the shareable
     workspace URL from PLAN.md §3.12, and offer workspace export/import.
   - Deliberately *not* exposing per-layer draw order — the stacking is
     meaningful (labels over radar over satellite) and mostly offers users a
     way to break their own display.

   Also in scope: timeline affordances, information density, empty states,
   keyboard access (tab switching, Esc to dismiss drawers), and the deferred
   polish items (alert ticker, manual radar site picker, layer re-ordering,
   zone-alert geometry resolution, restoring globe projection once custom
   WebGL layers adopt MapLibre's projection API).

   - **Mobile / responsive view** — the workstation layout currently assumes a
     desktop-width screen. Needs a real small-screen story: drawers as
     bottom sheets, touch-sized controls, a phone-appropriate timeline, and
     sensible defaults for what's on screen at once. This is also the
     groundwork the Chase HUD builds on (it's the same problem solved for a
     truck mount), so it lands before or alongside item 5.
3. **Make it personal** — three related features that turn the instrument into
   something you'd keep open every day:
   - **My location** — a small button on the map that centers and zooms to
     where you are (browser geolocation), remembered as your home point so
     panels and alerts can default to it.
   - **Forecast panels** — plain-language outlooks alongside the existing
     probe tabs (Now / Meteogram / Skew-T / Models): a **24-hour** hour-by-hour
     strip, then **3-day**, **7-day**, and **10-day** summaries with daily
     highs/lows, precip chance and totals, wind, and a short written
     characterization. Same data path as the meteogram, so it's mostly
     presentation; 10-day is the honest limit of useful skill from the free
     model set (and model spread from the Models tab can annotate confidence).
   - **Desktop notifications** — opt-in alerts for your home location: NWS
     warnings as they're issued, "rain starting in ~20 minutes" nowcasts from
     the radar trend, and severe-parameter thresholds crossing. Needs a
     notification-permission flow, a background poll that survives a
     backgrounded tab, and strict de-duplication so a single warning fires once.
4. **Performance pass** — the app has been built feature-first and never
   profiled. Known suspects, roughly in order of expected payoff:
   - **The live clock re-renders everything.** The timeline ticks 4×/second
     and `simTime` drives the meteogram cursor, radar frame selection and
     sounding lookup — so panels re-render continuously even when nothing
     visible changed. Coarsen the live tick, or expose a throttled derived
     time for subscribers that only need minute resolution.
   - **Level 2 memory and copying.** Sweeps are retained per tilt/moment
     (~1.3 MB each, tens of them) and the selected sweep is deep-copied and
     transferred on *every* arriving chunk. Throttle posting to animation
     cadence, cap retained tilts, and reuse buffers.
   - **Per-poll GeoJSON rebuilds.** Alerts (hundreds of polygons) and cells
     (~900 points) rebuild their whole FeatureCollection on each poll, and
     lightning rebuilds up to 4096 features every second. Diff or reuse.
   - **Code-splitting.** three.js/R3F/drei load eagerly for a single 3D
     panel; d3 and the chart panels could split too. Lazy-load them.
   - **Viewport work.** Cell/alert viewport filtering runs on every
     `moveend` over the full national list — bucket spatially or debounce.
   - Then measure properly: frame timings with radar streaming, memory over
     a long session, bundle analysis, and a low-end/mobile device pass
     (which also de-risks the Chase HUD).
5. **Chase HUD** *(PLAN.md §3.14)* — a mobile-first second face: GPS-on-radar,
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
