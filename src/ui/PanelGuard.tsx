import type { ReactNode } from 'react'
import { Alert, Loader, Text } from '@mantine/core'
import { useProbe } from '@/core/probe/store'

interface PanelGuardProps {
  error: string | null
  loading: boolean
  children: ReactNode
}

/**
 * Shared gate for probe-driven analysis panels: no-probe prompt,
 * failure state, loading state — then the panel content.
 */
export function PanelGuard({ error, loading, children }: PanelGuardProps) {
  const point = useProbe((s) => s.point)

  if (!point) {
    return (
      <Text size="xs" c="dimmed">
        Click the globe to probe a location.
      </Text>
    )
  }
  if (error !== null) {
    return (
      <Alert color="red" title="Source unreachable" variant="light">
        <Text size="xs">{error}</Text>
      </Alert>
    )
  }
  if (loading) return <Loader size="xs" />
  return <>{children}</>
}
