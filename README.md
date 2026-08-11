# SYNOPTIC

A web-native **weather workstation** built entirely on free, public data — streaming
Level 2 radar with professional interrogation tools, severe weather alerts,
forecaster-grade sounding analysis, and multi-model comparison, in one dark
instrument-panel UI.

<p><strong>▶ <a href="https://synoptic-production.up.railway.app/" target="_blank" rel="noopener noreferrer">Live demo</a></strong></p>

![stack](https://img.shields.io/badge/react-19-blue) ![stack](https://img.shields.io/badge/maplibre-5-green) ![stack](https://img.shields.io/badge/vite-7-purple) ![license](https://img.shields.io/badge/license-MIT-lightgrey)

Every layer and tool is individually togglable, the whole workstation follows one
timeline (−48 h of observations → +16 d of forecast), and clicking anywhere on Earth
probes that point. Works on desktop and mobile, in dark or light.

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
| Cross-section | Draw A→B on the map → RHI slice at true beam heights | ✅ |
| 3D echo | Tilt surfaces in 3D over a basemap floor, threshold + orbit, heading tape | ✅ |
| Storm cells | TVS/meso/hail attributes, table + session trend charts | ✅ |
| Radar quality + resolution | Clutter suppression, seamless zoom handoff, multi-site blending | ⚠️ needs work |
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

### Interface

| Feature | What it does | Status |
|---|---|---|
| Map-first shell | Edge-to-edge map; a right-edge icon rail carries navigation above, layer toggles below | ✅ |
| Analysis dock | Location / Nearby / Radar / Settings — one scrolling column of collapsible sections | ✅ |
| Section expansion | Collapse/expand per section, persisted | ✅ |
| Settings | Registry-generated, searchable, with per-feature and global reset | ✅ |
| Dark + light | Follows the OS by default; translucent map chrome with adjustable opacity | ✅ |
| Units & time | Metric/imperial, independent temperature unit, local or UTC clock | ✅ |
| Loading + health | Live loading indicator plus per-source status dots | ✅ |
| Mobile layout | Bottom tab bar with three panel heights; layers expand from a map button | ✅ |
| Section summaries | Collapsed sections showing their headline value | 🔭 |
| Help & About | Interaction guide, keyboard map, data-source credits | 🔭 |

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
2. **UI overhaul pass** — largely shipped; the remainder is listed below.

   **Shipped.** The structural work is done. The permanent left rail is gone
   and the map runs edge to edge. A persistent icon rail on the right edge
   carries navigation above and layer toggles below — layer *visibility* is
   an operation you perform while working, so it lives on the map, while
   opacity, colour tables and products are preferences and live in Settings.
   Clicking the active rail tab hides the panel and clicking any other
   reveals it, so there are no separate collapse buttons. The dock's seven
   wrapping tabs collapsed into four sections chosen by mental model —
   **Location** (probe-driven), **Nearby** (viewport-driven), **Radar**
   (storm tools) and **Settings** — each a single scrolling column of
   collapsible sections whose order and expansion persist per tab and can be
   reordered by drag or menu. Settings itself was rebuilt to convention:
   sticky search that also matches option labels, hairline sections instead
   of nested cards, label-left/control-right rows on a fixed control column,
   sliders for continuous ranges, and per-feature plus global reset.
   Attribution moved to a footer strip and playback became a floating map
   control; map chrome is translucent with a user-adjustable opacity; a
   loading indicator reports both API fetches and tile loads; times follow a
   local/UTC preference (local by default). **Mobile** drops the rail for a
   bottom tab bar with three panel heights, and the layers button expands
   into the same vertical icon strip.

   **Still to do.**
   - **Section summary lines** — the plumbing shipped (`summary` on the panel
     contract) but no feature fills it yet. A collapsed section should say
     "SBCAPE 1886 · shear 45 kt" or "3 warnings in view", and the *Location*
     header should carry a plain-language verdict ("Severe risk — moderately
     unstable, strong shear"). This is the highest-leverage item left for the
     hobbyist audience.
   - **Rail indicators** — warning count badge on Nearby, live dot on Radar.
   - **Typographic pass** — values should dominate their labels (tabular
     figures, larger, higher contrast); labels recede. Plus a density setting.
   - **Timeline as an information display** — radar frame ticks, warning
     issue/expiry bars, model-run boundaries, and a precip-probability
     sparkline for the probed point, so scrubbing has a visible purpose.
   - **Desktop panel resize** — 360 px is cramped for a skew-T; a drag handle
     would let it widen for analysis and narrow for monitoring.
   - **Section reordering, done safely** — briefly shipped with native HTML5
     drag and removed: a permanently draggable container swallows every
     press inside it (canvases, sliders, map gestures), and arming the drag
     from a grip still left it fragile and touch-hostile. If it returns it
     should use a pointer-based library (`dnd-kit`) with a proper drag
     handle, or sidestep dragging altogether with move-up/move-down
     controls in an explicit "arrange" mode.

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
   - **Session / workspace persistence** — feature settings, dock tab, section
     order and expansion now persist (versioned localStorage), but the rest of
     the session does not: map camera, probe point, timeline position, and
     radar tilt/moment/SRV all reset on reload. Restore them, add the
     shareable workspace URL from PLAN.md §3.12, and offer export/import.
   - Deliberately *not* exposing per-layer draw order — the stacking is
     meaningful (labels over radar over satellite) and mostly offers users a
     way to break their own display.

   **Help & About** — nothing currently explains the app to a newcomer, and
   several controls are undiscoverable (shift+click for a cross-section is
   the worst offender). Add:
   - A **help panel or drawer** covering the interaction basics (click to
     probe, shift+click for a slice, tilt/moment controls, what the timeline
     scrubs), a keyboard-shortcut list, and short plain-language notes on
     reading the pro tools — what CAPE and SRH mean, how to read a hodograph,
     why velocity folds. The tooltips already do some of this; this is the
     place they graduate to.
   - An **About panel** with the version/build, a link to the GitHub repo,
     the license, full data-source attribution (currently only the map
     credit is visible), and the standing "not a substitute for official
     warnings" statement.
   - Discoverability fixes alongside: hint text on first run, and surfacing
     hidden gestures in the relevant panel rather than only in docs.
   - **Teaching layer** *(later, after the structural work)* — the strongest
     moat against paid apps for the enthusiast audience, who want the pro
     tools *and* a ramp into them: contextual "why this matters" notes beside
     each analysis tool, worked examples on real events, and short lessons
     (reading a skew-T, spotting a hook echo, what a velocity couplet means).
     Deliberately scoped after the structural UI work — it's content writing,
     not layout, and it should attach to panels whose shape has settled.

   Also still open: keyboard access (tab switching, Esc), and the deferred
   polish items (alert ticker, manual radar site picker, zone-alert geometry
   resolution, restoring globe projection once custom WebGL layers adopt
   MapLibre's projection API).

   - **Mobile follow-ups** — the first pass shipped (bottom tab bar, three
     panel heights, expanding layer strip, full-width playback, relocated
     radar bench, UTC-only clock). Remaining: **drag-to-resize** the panel
     with momentum and snap points (tap-to-cycle only today — needs
     hand-rolled pointer handling or a small dep like `vaul`), a "Data
     sources" entry to replace the footer that mobile hides, and a touch
     pass on the radar bench. This is the groundwork the Chase HUD builds on.
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
4. **Radar quality and resolution** — the biggest gap between SYNOPTIC and the
   paid apps is how radar *looks*, especially as you zoom in.

   **Resolution.** The composite layers are pre-rendered raster tiles that
   run out of detail well before the map does: RainViewer's global mosaic
   stops around zoom 7 and is overzoomed (blurred) beyond it, and the IEM
   CONUS mosaic tops out near zoom 12. Level 2 is the answer — it's true
   super-resolution data (250 m gates, 0.5° azimuth) rendered natively in
   polar coordinates, so it stays sharp at any zoom — but today it only
   appears past zoom 6 as a separate layer you have to notice. Goals:
   - **Seamless handoff** — one "Radar" layer that silently upgrades from
     global composite → CONUS mosaic → single-site Level 2 as you zoom,
     rather than three layers the user manages by hand.
   - **Multi-site blending** — a single site leaves a cone of silence
     overhead and degrades at long range as the beam climbs; nearby sites
     should fill in, which is exactly what a proper mosaic does.
   - Raise the per-source zoom ceilings and stop overzooming blurred tiles
     where sharper data exists.

   **Quality.** The single-site layer reads noisy and speckled next to the
   composites. Suspects, in order:
   - **No clutter suppression.** Raw super-res base data includes ground
     clutter, biological returns (birds/insects — the big low-dBZ bloom
     around each site at night), anomalous propagation and interference
     spikes. The dual-pol fields we already decode are the standard fix:
     mask gates with low correlation coefficient (non-meteorological), and
     optionally use the clutter filter power removed (CFP) field.
   - **A low display floor.** Everything ≥ ~5 dBZ is drawn; a configurable
     floor (and a smarter transparency ramp near it) would remove most of
     the speckle without touching real echo.
   - **Nearest-neighbour sampling** in the polar shader, producing hard
     gate edges at high zoom. Add optional bilinear sampling across
     azimuth/range as an opt-in "smoothing" setting, matching the presentation
     smoothing paid apps offer — off by default, per the honesty rule.
   - **Volume continuity** — partial sweeps show as wedges while a volume
     streams in, and there's a brief blank at volume rollover. Retain the
     previous complete sweep until the new one covers each azimuth.
   - Also worth revisiting: dual-bin azimuth writes were a stopgap for
     1°-spaced cuts and may be widening returns; range-folded and
     below-threshold gates should be visually distinct from "no echo".
5. **Performance pass** — the app has been built feature-first and never
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
6. **Chase HUD** *(PLAN.md §3.14)* — a mobile-first second face: GPS-on-radar,
   time-to-arrival from storm motion, SPC outlooks and mesoscale discussions,
   an intercept/escape route solver over OSM roads, placefile import, and a
   replay trainer over archived events.

7. **Historical mode** *(needs a deeper design pass)* — the timeline currently
   covers −48 h to +16 d, but the underlying archives go much further back and
   the app is already built to replay them: Open-Meteo's reanalysis reaches
   **1940**, NEXRAD Level 2 volumes are public back to **1991**, and both flow
   through code paths the live app already uses. Open questions worth settling
   before building:
   - **How the user picks a period.** Named events ("El Reno, 31 May 2013")
     are the most useful entry point and the best demo, but a plain date/time
     picker plus a duration ("this day," "this 6-hour window") is what makes
     it a general tool. Probably both: a curated case list plus free date entry.
   - **What's available when.** Coverage differs per source and per era —
     radar to 1991, models to 1940, satellite and lightning much later — so
     the timeline needs to *show* what exists rather than silently rendering
     nothing. This is the same enrichment the live timeline wants.
   - **Fetch and cache strategy.** Replay wants many frames at once, which is
     the opposite of the live app's trickle; needs prefetch with progress,
     bounded memory, and IndexedDB spill.
   - **User-supplied datasets** — letting people load their own archives
     (a saved Level 2 volume, a GRIB file, a CSV of observations) turns the
     app into an analysis tool for research and post-event review. Needs
     format decisions, a parsing/validation story, and a clear boundary so
     imported data is never confused with live feeds.
   - **Playback controls** distinct from live scrubbing: loop a window, step
     by volume, and export a frame or animation for sharing.

**Later** — run-to-run
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
