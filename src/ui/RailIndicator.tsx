import { Badge } from '@mantine/core'

/**
 * Status mark on a dock rail tab. The live dot breathes slowly rather than
 * blinking — enough to notice a source came alive, not enough to pull the
 * eye off the map. Features decide when to render one; this owns the look.
 */
export function RailIndicator({ count }: { count?: number }) {
  if (typeof count === 'number') {
    return (
      <Badge size="xs" circle color="red" style={{ position: 'absolute', top: 5, right: 3 }}>
        {count > 99 ? '99' : count}
      </Badge>
    )
  }

  return (
    <div
      className="wx-pulse"
      style={{
        position: 'absolute',
        top: 9,
        right: 7,
        width: 6,
        height: 6,
        borderRadius: 3,
        background: 'var(--mantine-color-green-6)',
      }}
    />
  )
}
