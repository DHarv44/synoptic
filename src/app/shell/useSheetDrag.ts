import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SyntheticEvent,
} from 'react'
import type { SheetState } from '@/app/shell/dockStore'
import { DRAG_THRESHOLD, clampHeight, snapTarget } from '@/app/shell/sheetSnap'

/** Samples older than this don't count toward the release velocity. */
const VELOCITY_WINDOW_MS = 100

interface Sample {
  t: number
  y: number
}

interface DragSession {
  pointerId: number
  startY: number
  startHeight: number
  /** Past the threshold: the press is a drag, not a tap. */
  moved: boolean
  samples: Sample[]
}

/** The browser must not pan or select on a drag surface. */
const SURFACE_STYLE: CSSProperties = { touchAction: 'none', userSelect: 'none' }

export interface SheetDrag {
  /** Live height (px) while a finger is on it, else null and the state's CSS height applies. */
  height: number | null
  /** Spread onto each surface that drags the sheet (grab header, tab bar). */
  surfaceProps: { onPointerDown: (e: ReactPointerEvent) => void; style: CSSProperties }
  /** On the sheet root: swallows the click a drag would otherwise leave on a tab. */
  onClickCapture: (e: SyntheticEvent) => void
}

/**
 * Drag-to-resize for the mobile sheet. The finger moves the sheet live;
 * release snaps to a detent (nearest, or one past in the flick's direction).
 * A press that never travels stays a tap, so the tab bar keeps working.
 */
export function useSheetDrag(
  sheetRef: RefObject<HTMLElement | null>,
  setSheet: (s: SheetState) => void,
): SheetDrag {
  const [height, setHeight] = useState<number | null>(null)
  const session = useRef<DragSession | null>(null)
  const swallowClick = useRef(false)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = session.current
      if (!s || e.pointerId !== s.pointerId) return
      const dy = s.startY - e.clientY
      if (!s.moved) {
        if (Math.abs(dy) < DRAG_THRESHOLD) return
        s.moved = true
      }
      s.samples.push({ t: e.timeStamp, y: e.clientY })
      while (s.samples.length > 1 && e.timeStamp - s.samples[0].t > VELOCITY_WINDOW_MS) {
        s.samples.shift()
      }
      setHeight(clampHeight(s.startHeight + dy, window.innerHeight))
    }
    const finish = (e: PointerEvent) => {
      const s = session.current
      if (!s || e.pointerId !== s.pointerId) return
      session.current = null
      if (!s.moved) return
      const first = s.samples[0]
      const last = s.samples[s.samples.length - 1]
      const dt = last.t - first.t
      const velocity = e.type === 'pointercancel' || dt <= 0 ? 0 : (first.y - last.y) / dt
      const live = clampHeight(s.startHeight + (s.startY - e.clientY), window.innerHeight)
      setSheet(snapTarget(live, velocity, window.innerHeight))
      setHeight(null)
      // The click dispatches in this same task, right after pointerup.
      swallowClick.current = true
      setTimeout(() => {
        swallowClick.current = false
      }, 0)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [setSheet])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const el = sheetRef.current
      if (!el) return
      session.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startHeight: el.getBoundingClientRect().height,
        moved: false,
        samples: [{ t: e.timeStamp, y: e.clientY }],
      }
    },
    [sheetRef],
  )

  const onClickCapture = useCallback((e: SyntheticEvent) => {
    if (!swallowClick.current) return
    e.stopPropagation()
    e.preventDefault()
  }, [])

  return { height, surfaceProps: { onPointerDown, style: SURFACE_STYLE }, onClickCapture }
}
