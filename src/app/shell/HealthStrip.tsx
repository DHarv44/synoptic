import { Group, Tooltip } from '@mantine/core'
import { useHealth } from '@/core/data/healthStore'
import type { SourceHealth } from '@/core/data/types'
import { fmtUtcTime } from '@/core/time/format'

const DOT_COLOR: Record<SourceHealth['status'], string> = {
  idle: 'var(--mantine-color-gray-6)',
  ok: 'var(--mantine-color-green-6)',
  stale: 'var(--mantine-color-yellow-6)',
  error: 'var(--mantine-color-red-6)',
  disabled: 'var(--mantine-color-gray-7)',
}

function label(s: SourceHealth): string {
  const age = s.lastSuccess !== undefined ? ` · last ${fmtUtcTime(s.lastSuccess)}` : ''
  const err = s.lastError !== undefined ? ` · ${s.lastError}` : ''
  return `${s.label}: ${s.status}${age}${err}`
}

/** Per-source connection dots — the data-health strip (PLAN.md honesty rule). */
export function HealthStrip() {
  const sources = useHealth((s) => s.sources)
  const list = Object.values(sources)
  if (list.length === 0) return null

  return (
    <Group gap={6} wrap="nowrap">
      {list.map((s) => (
        <Tooltip key={s.id} label={label(s)}>
          <div
            aria-label={label(s)}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: DOT_COLOR[s.status],
              opacity: s.status === 'disabled' ? 0.4 : 1,
            }}
          />
        </Tooltip>
      ))}
    </Group>
  )
}
