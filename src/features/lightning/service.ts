import { reportError, reportOk } from '@/core/data/healthStore'
import { fixtureActive } from '@/core/data/fixtures'
import type { SourceRef } from '@/core/data/types'

export const BLITZORTUNG: SourceRef = { id: 'blitzortung', label: 'Blitzortung' }

export interface Strike {
  lat: number
  lon: number
  timeMs: number
}

export const MAX_STRIKES = 4096
export const STRIKE_TTL_MS = 10 * 60_000

const HOSTS = ['wss://ws1.blitzortung.org', 'wss://ws7.blitzortung.org', 'wss://ws8.blitzortung.org']

/** Blitzortung's LZW-style string compression (their web protocol). */
export function lzwDecode(data: string): string {
  const dict = new Map<number, string>()
  let currChar = data[0]
  let oldPhrase = currChar
  const out = [currChar]
  let code = 256
  let phrase: string
  for (let i = 1; i < data.length; i++) {
    const currCode = data.charCodeAt(i)
    if (currCode < 256) {
      phrase = data[i]
    } else {
      phrase = dict.get(currCode) ?? oldPhrase + currChar
    }
    out.push(phrase)
    currChar = phrase[0]
    dict.set(code, oldPhrase + currChar)
    code++
    oldPhrase = phrase
  }
  return out.join('')
}

/** Ring buffer of recent strikes, read imperatively by the layer. */
class StrikeBuffer {
  readonly strikes: Strike[] = []
  /** Bumped on every change, so the layer can skip a no-op redraw. */
  version = 0

  push(s: Strike): void {
    this.strikes.push(s)
    if (this.strikes.length > MAX_STRIKES) this.strikes.splice(0, this.strikes.length - MAX_STRIKES)
    this.version++
  }

  prune(nowMs: number): void {
    const cutoff = nowMs - STRIKE_TTL_MS
    let firstLive = 0
    while (firstLive < this.strikes.length && this.strikes[firstLive].timeMs < cutoff) firstLive++
    if (firstLive > 0) {
      this.strikes.splice(0, firstLive)
      this.version++
    }
  }
}

export const strikeBuffer = new StrikeBuffer()

interface RawStrike {
  time: number // ns epoch
  lat: number
  lon: number
}

/**
 * Connect to the community feed with polite reconnect/backoff across hosts.
 * Returns a stop function. In fixture mode, synthesizes a Gulf-coast storm.
 */
export function connectLightning(): () => void {
  if (fixtureActive()) {
    const timer = setInterval(() => {
      const now = Date.now()
      strikeBuffer.push({
        lat: 28 + Math.random() * 4,
        lon: -92 + Math.random() * 6,
        timeMs: now,
      })
      strikeBuffer.prune(now)
    }, 400)
    reportOk(BLITZORTUNG)
    return () => clearInterval(timer)
  }

  let ws: WebSocket | null = null
  let stopped = false
  let hostIndex = 0
  let retryMs = 2000

  function open(): void {
    if (stopped) return
    ws = new WebSocket(HOSTS[hostIndex % HOSTS.length])
    ws.onopen = () => {
      retryMs = 2000
      ws?.send(JSON.stringify({ a: 111 }))
      reportOk(BLITZORTUNG)
    }
    ws.onmessage = (ev) => {
      try {
        const raw = JSON.parse(lzwDecode(String(ev.data))) as RawStrike
        if (typeof raw.lat === 'number' && typeof raw.lon === 'number') {
          strikeBuffer.push({ lat: raw.lat, lon: raw.lon, timeMs: raw.time / 1e6 })
          strikeBuffer.prune(Date.now())
        }
      } catch {
        // malformed frame — ignore
      }
    }
    ws.onclose = () => {
      if (stopped) return
      reportError(BLITZORTUNG, 'websocket closed')
      hostIndex++
      setTimeout(open, retryMs)
      retryMs = Math.min(retryMs * 2, 60_000)
    }
  }

  open()
  return () => {
    stopped = true
    ws?.close()
  }
}
