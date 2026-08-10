/**
 * Fixture mode: `?fixture=<case>` swaps every adapter to bundled recordings
 * under src/fixtures/<case>/ — the whole app must boot offline on these.
 */
const modules = import.meta.glob('/src/fixtures/**/*.json', { import: 'default' })

export function fixtureCase(): string | null {
  return new URLSearchParams(window.location.search).get('fixture')
}

export function fixtureActive(): boolean {
  return fixtureCase() !== null
}

export async function loadFixture<T>(name: string): Promise<T> {
  const c = fixtureCase()
  if (c === null) throw new Error('loadFixture called outside fixture mode')
  const path = `/src/fixtures/${c}/${name}.json`
  const loader = modules[path]
  if (!loader) throw new Error(`missing fixture: ${path}`)
  return (await loader()) as T
}
