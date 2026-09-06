import type { SheetState } from '@/app/shell/dockStore'

/** Bottom tab bar height; the sheet at peek is the bar alone. */
export const TAB_BAR_HEIGHT = 56
/** The top bar a full sheet stops under. */
const TOP_BAR = 44
/** Half sheet as a fraction of the viewport. */
const HALF_FRACTION = 0.54

/** A release faster than this (px/ms) is a flick: one detent in its direction. */
export const FLICK_PX_PER_MS = 0.4
/** Within this of a detent a flick counts as starting FROM it. */
const DETENT_TOLERANCE = 24
/** Finger travel before a press becomes a drag (a tab tap must stay a tap). */
export const DRAG_THRESHOLD = 6

export const SHEET_ORDER: readonly SheetState[] = ['peek', 'half', 'full']

/** Resting heights as CSS, so the sheet follows the viewport between drags. */
export const SHEET_CSS_HEIGHT: Record<SheetState, string> = {
  peek: `${TAB_BAR_HEIGHT}px`,
  half: `${HALF_FRACTION * 100}dvh`,
  full: `calc(100dvh - ${TOP_BAR}px)`,
}

/** The same detents in pixels for a given viewport height. */
export function snapHeights(viewportHeight: number): Record<SheetState, number> {
  return {
    peek: TAB_BAR_HEIGHT,
    half: Math.round(viewportHeight * HALF_FRACTION),
    full: Math.max(TAB_BAR_HEIGHT, viewportHeight - TOP_BAR),
  }
}

export function clampHeight(height: number, viewportHeight: number): number {
  const h = snapHeights(viewportHeight)
  return Math.min(h.full, Math.max(h.peek, height))
}

/**
 * Where a released sheet settles. A flick goes one detent in its direction,
 * past whichever detent the finger is still near; otherwise the nearest
 * detent wins. `velocity` is px/ms, positive = sheet growing.
 */
export function snapTarget(height: number, velocity: number, viewportHeight: number): SheetState {
  const h = snapHeights(viewportHeight)
  if (velocity > FLICK_PX_PER_MS) {
    return SHEET_ORDER.find((s) => h[s] > height + DETENT_TOLERANCE) ?? 'full'
  }
  if (velocity < -FLICK_PX_PER_MS) {
    return [...SHEET_ORDER].reverse().find((s) => h[s] < height - DETENT_TOLERANCE) ?? 'peek'
  }
  let best: SheetState = 'peek'
  for (const s of SHEET_ORDER) {
    if (Math.abs(h[s] - height) < Math.abs(h[best] - height)) best = s
  }
  return best
}
