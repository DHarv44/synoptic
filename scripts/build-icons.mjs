/**
 * Generate the installable-app icon set from design/icon-source.jpg.
 *
 * Kept as a script rather than checked-in-by-hand output so the whole set can
 * be regenerated when the artwork changes, and so the insets and encoding
 * settings are written down instead of living in someone's image editor.
 *
 *   node scripts/build-icons.mjs
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const SRC = fileURLToPath(new URL('design/icon-source.jpg', root))
const OUT = (name) => fileURLToPath(new URL(`public/${name}`, root))

/** Matches the app chrome, and fills the corners a circular mask leaves behind. */
const BACKGROUND = { r: 0x16, g: 0x18, b: 0x1d, alpha: 1 }

/**
 * Android and some launchers crop icons to a circle, so a maskable icon has to
 * keep everything important inside the middle 80%. Sitting the full artwork at
 * 78% clears that with a little to spare.
 */
const MASKABLE_INSET = 0.78

/**
 * The source is a noisy JPEG, so a straight PNG encode runs to ~430 kB at
 * 512px — absurd for an icon fetched on install. Quantising to a palette takes
 * it under 100 kB with no visible loss at icon sizes.
 */
const encode = (img) => img.png({ palette: true, quality: 90, compressionLevel: 9, effort: 10 })

async function square(name, size) {
  await encode(sharp(SRC).resize(size, size, { fit: 'cover' })).toFile(OUT(name))
  return `${name} ${size}x${size}`
}

async function maskable(name, size) {
  const inner = Math.round(size * MASKABLE_INSET)
  const pad = Math.round((size - inner) / 2)
  const art = await sharp(SRC).resize(inner, inner, { fit: 'cover' }).toBuffer()
  const canvas = sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  }).composite([{ input: art, top: pad, left: pad }])
  await encode(canvas).toFile(OUT(name))
  return `${name} ${size}x${size} (art at ${Math.round(MASKABLE_INSET * 100)}%)`
}

const written = [
  await square('icon-512.png', 512),
  await square('icon-192.png', 192),
  await square('apple-touch-icon.png', 180),
  await maskable('icon-maskable-512.png', 512),
  await square('favicon-32.png', 32),
  await square('favicon-16.png', 16),
]

for (const line of written) console.log('  ' + line)
