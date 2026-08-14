/**
 * Generate the installable-app icon set from design/icon-source.jpg.
 *
 * Kept as a script rather than checked-in-by-hand output so the whole set can
 * be regenerated when the artwork changes, and so the geometry and encoding
 * settings are written down instead of living in someone's image editor.
 *
 *   node scripts/build-icons.mjs
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const SRC = fileURLToPath(new URL('design/icon-source.jpg', root))
const OUT = (name) => fileURLToPath(new URL(`public/${name}`, root))

/** Matches the app chrome, for the icons that must be opaque. */
const BACKGROUND = { r: 0x16, g: 0x18, b: 0x1d, alpha: 1 }

/**
 * The scope's outer edge in the source, measured off the artwork rather than
 * guessed: the white ring runs x 95→929 and y 94→932 in a 1024² frame.
 * Everything outside it is the JPEG's black filler, which is what made the
 * icons square black tiles instead of a round mark.
 */
const CIRCLE = { cx: 512, cy: 513, r: 418 }

/** How much room to leave around the ring. 1.05 puts the circle at ~95%. */
const MARGIN = 1.05

/**
 * Android and some launchers crop icons to a circle, so a maskable icon must
 * keep everything important inside the middle 80% — and must be opaque, since
 * the crop needs something to sit on.
 */
const MASKABLE_INSET = 0.78

/**
 * The source is a noisy JPEG, so a straight PNG encode runs to ~430 kB at
 * 512px — absurd for an icon fetched on install. Quantising to a palette takes
 * it well under half that with no visible loss at icon sizes.
 */
const encode = (img) => img.png({ palette: true, quality: 90, compressionLevel: 9, effort: 10 })

/**
 * The artwork cropped to its circle, transparent outside, at `size`.
 * `dest-in` keeps the source only where the mask is opaque; the SVG circle is
 * rendered antialiased, so the edge stays clean at every size.
 */
async function circleArt(size) {
  const half = Math.round(CIRCLE.r * MARGIN)
  const r = ((CIRCLE.r / half) * size) / 2
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff"/></svg>`,
  )
  return sharp(SRC)
    .extract({ left: CIRCLE.cx - half, top: CIRCLE.cy - half, width: half * 2, height: half * 2 })
    .resize(size, size)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

/** Round mark on nothing, so launchers and tabs supply their own backdrop. */
async function transparent(name, size) {
  await encode(sharp(await circleArt(size))).toFile(OUT(name))
  return `${name} ${size}x${size} transparent`
}

/** Round mark on the app's own background, for the places alpha isn't welcome. */
async function opaque(name, size, inset) {
  const inner = Math.round(size * inset)
  const pad = Math.round((size - inner) / 2)
  const canvas = sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  }).composite([{ input: await circleArt(inner), top: pad, left: pad }])
  await encode(canvas).toFile(OUT(name))
  return `${name} ${size}x${size} opaque, art at ${Math.round(inset * 100)}%`
}

const written = [
  await transparent('icon-512.png', 512),
  await transparent('icon-192.png', 192),
  await transparent('favicon-32.png', 32),
  await transparent('favicon-16.png', 16),
  // Maskable must fill its frame; iOS flattens alpha onto black, so give it a
  // background we chose rather than one we got by accident.
  await opaque('icon-maskable-512.png', 512, MASKABLE_INSET),
  await opaque('apple-touch-icon.png', 180, 1),
]

for (const line of written) console.log('  ' + line)
