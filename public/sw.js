/* eslint-env serviceworker */
/**
 * Service worker: makes SYNOPTIC installable and quick to launch, without ever
 * lying about the weather.
 *
 * The rule that shapes everything here: **cache the app, never the data.**
 * A cached radar tile served inside a standalone window — where there is no
 * address bar, no reload button and no obvious sign you are offline — is
 * indistinguishable from live weather. Every request that carries observations
 * goes to the network and is allowed to fail loudly.
 *
 * It also fixes a failure we hit for real: deploying while a tab is open used
 * to blank the app, because the running page asked for a lazy chunk whose
 * hashed filename no longer existed on the server. Hashed assets are immutable,
 * so caching them means an open session keeps working through a deploy.
 */

const VERSION = 'v1'
const SHELL = `synoptic-shell-${VERSION}`
const ASSETS = `synoptic-assets-${VERSION}`
const MINE = [SHELL, ASSETS]

/** Enough to boot offline; everything else is picked up as it is used. */
const SHELL_URLS = ['/', '/manifest.webmanifest', '/favicon-32.png', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((n) => !MINE.includes(n)).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

// The page asks for this once the user accepts an update, so a reload is the
// user's decision rather than something that happens under their cursor.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') void self.skipWaiting()
})

/** Weather, not app. Anything matching this is never cached, ever. */
function isData(url) {
  return url.pathname.startsWith('/proxy/')
}

/** Content-hashed by Vite, so a given URL can never change meaning. */
function isImmutable(url) {
  return url.pathname.startsWith('/assets/')
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  }
  return response
}

/**
 * Navigations go to the network first so a deploy is picked up on the next
 * load, and fall back to the cached shell only when the network is gone.
 */
async function navigation(request) {
  try {
    return await fetch(request)
  } catch {
    return (await caches.match('/')) ?? Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Leave everything we do not own completely alone: other origins, non-GET,
  // and every data route.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (isData(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(navigation(request))
    return
  }
  if (isImmutable(url)) {
    event.respondWith(cacheFirst(request, ASSETS))
    return
  }
  // Icons, manifest and the like: small, stable, worth having offline.
  if (/\.(png|svg|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL))
  }
})
