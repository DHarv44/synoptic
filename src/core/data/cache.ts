import { openDB, type IDBPDatabase } from 'idb'

interface Entry {
  t: number
  v: unknown
}

let dbPromise: Promise<IDBPDatabase> | undefined

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB('synoptic', 1, {
    upgrade(d) {
      d.createObjectStore('products')
    },
  })
  return dbPromise
}

/** Returns the cached value if present and younger than maxAgeMs. */
export async function cacheGet<T>(key: string, maxAgeMs: number): Promise<T | undefined> {
  const entry = (await (await db()).get('products', key)) as Entry | undefined
  if (!entry) return undefined
  if (Date.now() - entry.t > maxAgeMs) return undefined
  return entry.v as T
}

export async function cachePut(key: string, value: unknown): Promise<void> {
  await (await db()).put('products', { t: Date.now(), v: value } satisfies Entry, key)
}
