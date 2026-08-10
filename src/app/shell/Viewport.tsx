import { GlobeCanvas } from '@/scene/GlobeCanvas'

/** Center viewport: hosts the R3F globe scene. */
export function Viewport() {
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <GlobeCanvas />
    </div>
  )
}
