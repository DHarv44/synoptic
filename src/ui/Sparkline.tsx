/**
 * A tiny inline line chart: x from the first sample to the last, y scaled
 * to the sample range. Draws nothing until there are two samples — one
 * point is a value, not a trend.
 */
export function Sparkline({
  samples,
  width = 48,
  height = 12,
  color = 'currentColor',
}: {
  samples: Array<{ x: number; y: number }>
  width?: number
  height?: number
  color?: string
}) {
  if (samples.length < 2) return null
  const ys = samples.map((s) => s.y)
  const lo = Math.min(...ys)
  const hi = Math.max(...ys)
  const x0 = samples[0].x
  const x1 = samples[samples.length - 1].x
  const px = (x: number): number => (x1 === x0 ? width : ((x - x0) / (x1 - x0)) * width)
  const py = (y: number): number => (hi === lo ? height / 2 : height - 1 - ((y - lo) / (hi - lo)) * (height - 2))
  const d = samples.map((s, i) => `${i === 0 ? 'M' : 'L'}${px(s.x).toFixed(1)},${py(s.y).toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} aria-hidden style={{ flexShrink: 0 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.2} opacity={0.85} />
    </svg>
  )
}
