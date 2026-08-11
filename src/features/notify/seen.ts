const KEY = 'synoptic.notified'
const CAP = 400

/**
 * Alert ids already notified, kept across reloads so a refresh during a
 * warning doesn't fire it again. NWS ids are per-issuance — an updated
 * warning gets a new id and is treated as new, which is correct.
 */
function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

let ids: string[] = load()
let set = new Set(ids)

export function alreadyNotified(id: string): boolean {
  return set.has(id)
}

export function markNotified(id: string): void {
  if (set.has(id)) return
  ids.push(id)
  // Oldest out first; the list is only here to suppress repeats.
  if (ids.length > CAP) ids = ids.slice(ids.length - CAP)
  set = new Set(ids)
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // Private mode or a full quota — repeats are better than a crash.
  }
}
