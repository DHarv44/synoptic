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
| Dual-pol products | Spectrum width, ZDR, correlation coefficient and differential phase, each with its own colour ramp | ✅ |
| Scan time + VCP | Sweep collection time, age, and coverage pattern on the panel | ✅ |
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
| Forecast panels | Next 24 hours hour-by-hour + 3/5/10-day outlook per location | ✅ |
| Interactive parcel | Drag the surface parcel, watch CAPE recompute | 🔭 |
| Radiosonde overlay | Real 00z/12z balloon data vs the model profile | 🔭 |

### Situational awareness

| Feature | What it does | Status |
|---|---|---|
| NWS alerts | Warning polygons above every layer + viewport-filtered panel, filtered by severity and category | ✅ |
| Lightning | Live Blitzortung strikes, bolt icons with flash decay | ✅ |
| Surface obs | METAR station models (temp/dewpoint/barb), decluttered | ✅ |
| Satellite | NASA GIBS imagery, timeline-dated | ✅ |
| Basemap | OpenFreeMap vector tiles — cities, roads, labels, dark/light | ✅ |
| Wind particles | GPU flow field, surface → jet stream | ⚠️ built, disabled (see roadmap) |
| My location | Locate button → centre/zoom, remembered as home | ✅ |
| Notifications | Desktop alerts for warnings covering your location (rain nowcast still planned) | ✅ |
| Alert ticker | Top-bar scrolling severe ticker | 🔭 |

### Interface

| Feature | What it does | Status |
|---|---|---|
| Map-first shell | Edge-to-edge map; a right-edge icon rail carries navigation above, layer toggles below | ✅ |
| Analysis dock | Location / Nearby / Radar / Settings / Help — one scrolling column of collapsible sections | ✅ |
| Section expansion | Collapse/expand per section, persisted | ✅ |
| Settings | Registry-generated, searchable, with per-feature and global reset | ✅ |
| Session persistence | Camera, probe, timeline, tabs and radar selection survive a reload | ✅ |
| Dark + light | Follows the OS by default; translucent map chrome with adjustable opacity | ✅ |
| Units & time | Metric/imperial, with temperature, wind, pressure and precipitation independently switchable; local or UTC clock | ✅ |
| Loading + health | Live loading indicator plus per-source status dots | ✅ |
| Mobile layout | Bottom tab bar with three panel heights; layers expand from a map button | ✅ |
| Section summaries | Collapsed sections showing their headline value, alert-toned when it matters | ✅ |
| Help & About | Help tab: interaction guide, keyboard map, instrument glossary, credits | ✅ |

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
   into the same vertical icon strip. The **radar bench left the map**: its
   controls now lead the Radar panel where each can be labelled, with ↑/↓
   stepping tilts so walking a storm needs no panel, a searchable picker for
   all 159 WSR-88D sites, a button to centre the map on the chosen radar, and
   a lock that stops the map from swapping sites out from under work in
   progress.

   **Still to do.**
   - **Section summary lines** ✅ — collapsed sections now report themselves:
     "22°C · Partly cloudy", "23°C / 17°C · 40% from 13:00", "CAPE 1758 ·
     shear 30 kt", "22 in view · 16 severe", "149 in view · 32 rotating",
     "2 warnings". Counts that mean something is happening render in the
     alert tone, so a collapsed stack still answers "is there anything here
     for me". *Still open:* a plain-language verdict in the **Location
     header** ("Severe risk — moderately unstable, strong shear"), which is
     a writing problem more than a plumbing one.
   - **Rail indicators** — the mechanism shipped (features declare
     `dockIndicator`; the rail collects them by panel group, so the shell
     never reads a feature store) and Radar uses it for a slow green pulse
     while a site is attached. Nearby still needs its warning-count badge.
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
   - **Alert filtering by event type + severity floor** ✅ — a severity floor
     plus per-category switches (flood, tropical, winter, heat, marine and
     coastal, other advisories). Marine defaults to off, which on a sample
     afternoon hid 104 of 274 active alerts — 38% of the list. Tornado and
     thunderstorm warnings deliberately have no switch. The panel says how
     many are hidden, so a filter can't be mistaken for a quiet day, and one
     filter drives the map, the list and the summary alike.
   - **Storm-cell display threshold** ✅ (all / hail-and-large / rotating /
     tornado signatures) and **lightning fade window** ✅ (2–30 min).
   - **Decoupled units** ✅ — wind (kt/mph/km-h/m-s), pressure (hPa/inHg) and
     precipitation (mm/in) each switch independently of the metric/imperial
     system, joining temperature, which already did. Each defaults to
     "follow system", so the simple case stays one control. *Still open:*
     heights in m/ft/kft and distance in km/mi/nm — currently the radar
     readouts use kft and km by convention, and changing those means
     deciding whether a radar display should follow a general preference at
     all.
   - **Level 2 defaults** — default moment and tilt, range rings, dealiasing
     default. (Site lock shipped with the radar picker.)
   - **Radar loop behavior** — loop length (30 min / 1 h / 2 h), speed,
     end-frame dwell.
   - Remaining smaller ones: **METAR content + density**, satellite
     product/band expansion, wind trail length and color-by, timeline
     defaults (range, arrow-key step, auto-return-to-live), basemap style
     and label density, per-source refresh cadence for bandwidth/battery.
   - **Presets** — Workstation / Chase / Minimal plus user-saved profiles
     (specified in PLAN.md §3.13a, never built) and **settings search**;
     both matter much more once the knob count grows.
   - **Session persistence** ✅ — a reload now comes back where you were: map
     camera (centre, zoom, bearing, pitch), probe point, timeline position,
     dock tab and section expansion, tool panel and width, and the radar
     selection. Only choices are stored, never downloaded volumes: the radar
     site is kept only while locked, since unlocked the map reassigns it on
     the first move. A scrub position outside the −48 h/+16 d window comes
     back live rather than off-screen, and playback never resumes by itself.
     *Still open:* the shareable workspace URL from PLAN.md §3.12 and
     export/import.
   - Deliberately *not* exposing per-layer draw order — the stacking is
     meaningful and mostly offers users a way to break their own display.
     It is declared once in `map/layerOrder.ts`: imagery, then radar by
     resolution (global composite → CONUS mosaic → single-site Level 2),
     fields, the warning wash, then basemap labels, then point data, then
     warning outlines and annotations on top.

   **Help & About** ✅ — a Help tab in the right rail, beside the map rather
   than in a dialog, so instructions sit next to the thing they describe:
   you can read how a cross-section is drawn while drawing one. Four
   collapsible sections in the same pattern as every other tab — Getting
   started (the interactions that aren't visible from the interface),
   Keyboard, Reading the instruments (plain-language notes on dBZ, velocity
   folding, VCP, beam height, CAPE, CIN, shear, SRH, hodographs, PWAT), and
   About with version, GitHub link, license, per-source attribution and the
   official-warnings disclaimer. Still open: first-run hint text.
   - **Teaching layer** *(later, after the structural work)* — the strongest
     moat against paid apps for the enthusiast audience, who want the pro
     tools *and* a ramp into them: contextual "why this matters" notes beside
     each analysis tool, worked examples on real events, and short lessons
     (reading a skew-T, spotting a hook echo, what a velocity couplet means).
     Deliberately scoped after the structural UI work — it's content writing,
     not layout, and it should attach to panels whose shape has settled.

   Also still open: keyboard access (tab switching, Esc), and the deferred
   polish items (alert ticker, zone-alert geometry
   resolution, restoring globe projection once custom WebGL layers adopt
   MapLibre's projection API).

   - **Mobile follow-ups** — the first pass shipped (bottom tab bar, three
     panel heights, expanding layer strip, full-width playback, relocated
     radar bench, UTC-only clock). Remaining: **drag-to-resize** the panel
     with momentum and snap points (tap-to-cycle only today — needs
     hand-rolled pointer handling or a small dep like `vaul`), a "Data
     sources" entry to replace the footer that mobile hides, and a touch
     pass on the radar bench. This is the groundwork the Chase HUD builds on.
3. **Make it personal** — mostly shipped. The instrument now knows where you
   are and what that means for you:
   - **My location** ✅ — a locate button on the map centers and zooms to you,
     probes the point so the analysis panels fill in, and remembers it as home
     across reloads. Stored locally; it reaches the network only as the
     coordinates of a forecast request.
   - **Forecast panels** ✅ — "Next 24 hours" hour-by-hour and a 3/5/10-day
     "Outlook" with highs/lows, precip chance and totals, and notable gusts,
     in the Location tab beside Now / Meteogram / Skew-T / Models. 10-day is
     the honest limit of useful skill from the free model set.
   - **Desktop notifications** — warnings covering your home location fire
     once each, opt-in via a permission prompt, with a severity threshold in
     Settings and de-duplication by NWS alert id that survives reloads. The
     alerts feed doesn't pause on a hidden tab, so it keeps working in the
     background. *Still to do:* "rain starting in ~20 minutes" nowcasts from
     the radar trend, and severe-parameter thresholds crossing — both need a
     trend signal the app doesn't compute yet.
   - Still open: a **written characterization** of the forecast (the
     plain-language line that makes the outlook scannable), and annotating
     confidence from the Models tab's spread.
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
   - **Nearest-neighbour sampling** ✅ — Level 2 has an opt-in smoothing
     setting that interpolates across azimuth and range, off by default per
     the honesty rule. It is deliberately not a hardware LINEAR filter: raw
     0 and 1 are sentinels for below-threshold and range-folded, so blending
     them with real returns would paint mid-range echo along every data
     edge. The shader renormalises over whichever neighbours are real, and
     the gate under each fragment still decides *whether* to draw, so
     smoothing softens colour steps without extending echo into gates that
     measured nothing. The two composite layers honour the same Smoothing
     switch through `raster-resampling`, which is what made an overzoomed
     mosaic look blocky.
   - **Volume continuity** — partial sweeps show as wedges while a volume
     streams in, and there's a brief blank at volume rollover. Retain the
     previous complete sweep until the new one covers each azimuth.
   - Range-folded and below-threshold gates should be visually distinct
     from "no echo" — all three currently just don't draw. (The dual-bin
     azimuth write was previously listed here as possibly widening returns.
     It isn't: each radial writes bins N and N+1, but for super-res 0.5°
     data the next radial overwrites N+1, so it self-corrects and only fills
     genuine gaps and the sweep's trailing edge.)
   - **Displayable dual-pol moments** ✅ — spectrum width, differential
     reflectivity, correlation coefficient and differential phase each have
     a colour ramp and can be painted, and the gate probe reads all six.
     They are retained on the lowest cuts only: a sweep is ~1.3 MB, and low
     tilts are where these fields are actually read. The product picker
     offers only what the current volume carries. This unblocks the clutter
     masking above and the TDS/hail presets in PLAN.md §3.3.3.
   - **Scan time and VCP on the panel** ✅ — the displayed sweep's collection
     time, its age in minutes (orange past 15, stale under any scan
     strategy), and the volume coverage pattern. Age is computed against the
     client clock, which can run slow enough to put a fresh sweep in the
     future, so negative ages clamp to "just now" rather than printing.
5. **Performance pass** — a first profiled round has landed. Done, with
   measurements:
   - **Initial bundle** 2,679 kB → 1,751 kB (762 → 511 kB gzip). three.js,
     R3F and drei served one panel most sessions never open; everything
     importing three hangs off `Volume3D`, so lazily importing that module
     splits the whole subtree into a 916 kB on-demand chunk.
   - **The live clock** took a new `simTime` on every 250 ms tick, re-rendering
     the meteogram cursor, radar/satellite frame pickers and sounding lookup
     four times a second while idle. Quantised to 10 s, returning the same
     state object between steps so zustand skips the notify: 3 notifications
     per 34 s idle, against 136.
   - **Decode worker churn.** The tilt list was re-posted on every chunk
     (8 array replacements per 36 s carrying 2 real changes — now 1:1), and
     the ~1.3 MB selected sweep was copied and transferred per chunk, now
     leading-edge throttled to 120 ms.
   - **3D mesh build** ~245 ms → 58 ms on a 599k-vertex volume: per-vertex
     colour went from a stop scan plus three `parseInt`s on hex substrings to
     a precomputed table, and geometry from growing plain arrays to
     preallocated `Float32Array`s written by index. Covered by tests now.
   - **Lightning** rebuilt up to 4096 features and re-parsed its source every
     second regardless of change; now redraws on new strikes or every 5 s for
     the fade, and not at all when idle. *Reasoned, not profiled — the feed
     was empty during testing.*

   Still open:
   - **Alert/cell GeoJSON** already memoise per poll (minutes apart), so they
     are not hot — but a busy severe day is untested.
   - **Viewport work.** Cell/alert filtering runs on every `moveend` over the
     full national list — cheap at ~900 items, worth bucketing if lists grow.
   - **Level 2 memory.** Sweeps are retained per tilt/moment (~1.3 MB each,
     tens of them) with no cap; long sessions are unmeasured.
   - **Remaining main-thread blocks are MapLibre's, not ours.** With the
     radar site locked — no worker restart, no basemap-floor render, no mesh
     rebuild — an instantaneous cross-country jump still produced a single
     1360 ms task, which is vector-tile upload and symbol placement. Note
     that a teleport is the pathological case; incremental panning loads far
     fewer tiles. Levers are style complexity (layer and label count) and
     preferring animated `flyTo` over `jumpTo`, which spreads the work.
     The 3D view's hidden-map floor render was *suspected* and cleared by
     measurement: the pixel readback is ~0 ms and teardown ~10 ms, with the
     ~330 ms it takes being off-thread tile loading.
   - **Mesh building still runs during render.** Now ~58 ms on a full
     volume, and threshold drags commit on release rather than per tick, but
     moving it into the worker would take it off the main thread entirely.
   - Still to measure: memory over a long session, and a low-end/mobile
     device pass (which also de-risks the Chase HUD).
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
