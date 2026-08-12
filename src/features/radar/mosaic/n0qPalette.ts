/**
 * The canonical IEM n0q colour ramp, so mosaic pixels can be read back as
 * values instead of being displayed as somebody else's picture.
 *
 * n0q tiles are rendered from a 256-level indexed raster where the palette
 * index *is* the measurement: `dBZ = index / 2 - 32`, index 0 meaning no
 * data. That is the same indexing `reflectivityLut()` already uses for the
 * Level 2 shader, so a mosaic pixel translates to our colour table by index,
 * with no arithmetic in between — which is what keeps the two layers
 * genuinely identical rather than merely similar.
 *
 * Verified against live tiles: every opaque pixel matched a palette entry
 * exactly (alpha is only ever 0 or 255 — the renderer does not antialias),
 * so the reverse lookup is exact and needs no nearest-colour fallback.
 *
 * Regenerate from IEM's own raster if it ever changes — the archive
 * composites are 8-bit indexed and carry the palette in their PNG `PLTE`
 * chunk:
 *   https://mesonet.agron.iastate.edu/archive/data/YYYY/MM/DD/GIS/uscomp/n0q_YYYYMMDDHHMI.png
 */

/** 256 RGB triples, palette order. */
const PALETTE_B64 =
  'AAAAhXGPhXKPhnONh3WLh3aLiHeJiXmHiXqHinuFi32Ei36EjH+CjYGAjYKAjoN+j4R8j4V8kId7' +
  'kYh5kYl5kot3k411lpFTmJRXm5dbnZpgoJ1ko6BopaNtqKZxqql2rax6sK9+srKDt7iMuruQvb6U' +
  'v8GZwsSdxMeix8qmys2qzNCv0tS0z9K0ycy0xsm0w8e0wMS0vcG0ub60tru0s7m0sLa0rbO0qrC0' +
  'pKu0oKi0naW0mqK0l6C0lJ20kZq0lJu1kJi0jJWziJKygIywfImveIaudIOscICrbH2qZ3mpY3ao' +
  'X3OnW3CmV22kT2eiS2ShR2GgQ16fQVueQ2GiRWimSG+qSnauTX2yT4S2UYu7VpnDWZ/HW6bLXq3P' +
  'YLTUYrvYZcLcZ8ngatDkb9boaNbXWdazUtaiS9aQQ9Z+PNZtNdZbEdUYEdEXEM0XEMgWEMQWD7wV' +
  'D7cUDrMUDq8TDqsTDaYSDaISDZ4RDJkRDJUQDJEQC4gPC4QOCoAOCnwNCncNCXMMCW8MCWsLCGYL' +
  'CGIKCV4JMnMIRn0IW4gHb5IHhJ0GmKgGrbIFwb0F1scE6tIE/+IA/9gA/9MA/84A/8kA/8QA/8AA' +
  '/7sA/7YA/7EA/6wA/6cA/6IA/5kA/5QA/48A/4oA/4UA/4AA/wAA+AAA8QAA6gAA4wAA1QAAzQAA' +
  'xgAAvwAAuAAAsQAAqgAAowAAmwAAlAAAjQAAfwAAeAAAcQAA//////X//+r//9///9T//8n//77/' +
  '/7P//53//5L//3X//Gv9+WD69lb380v08EDx7Tbv6ivs5yDp4QvjsgD/rAD8pAD3mwD0kwDviADq' +
  'gwDoeQDicgDdaQDbBezwBevwBerwBd3gBdzgBdvgBc3QBczQBL3ABLzABLvABK6wBK2wBJ6gBJ2g' +
  'BJygA46QA42QA4yQA36AA32AA29wA25wA21wAl9gAl5gAk9QAk5QAk1QAj9AAj5AAj1AATAwAS8w' +
  'ASAgAR8gAR4gOme1Oma1OmW1OmS1OmO1OmK1'

/** Palette index → dBZ. Index 0 is "no data", not −32 dBZ. */
export function n0qDbz(index: number): number {
  return index / 2 - 32
}

let indexByRgb: Map<number, number> | null = null

/**
 * Packed 24-bit RGB → palette index. Built once; the mosaic transform does
 * one lookup per opaque pixel, so this is the hot path's whole cost.
 */
export function n0qIndexByRgb(): Map<number, number> {
  if (indexByRgb) return indexByRgb
  const bytes = atob(PALETTE_B64)
  const map = new Map<number, number>()
  for (let i = 0; i < 256; i++) {
    const rgb =
      (bytes.charCodeAt(i * 3) << 16) |
      (bytes.charCodeAt(i * 3 + 1) << 8) |
      bytes.charCodeAt(i * 3 + 2)
    // Duplicate colours exist at the very top of the ramp; first wins, so a
    // pixel always resolves to the lowest dBZ that can produce it.
    if (!map.has(rgb)) map.set(rgb, i)
  }
  indexByRgb = map
  return map
}
