import type { CSSProperties } from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import { IconFocusCentered } from '@tabler/icons-react'
import { mapChromeStyle } from '@/ui/mapChrome'

/**
 * Snaps a view back to its default orientation — north up on the map, the
 * starting camera in the 3D view. Positioning is left to the caller so it
 * can clear whatever chrome shares its corner.
 */
export function ReorientButton({
  onClick,
  size = 34,
  label = 'Reset orientation',
  style,
}: {
  onClick: () => void
  size?: number
  label?: string
  style?: CSSProperties
}) {
  return (
    <Tooltip label={label} position="left">
      <ActionIcon
        size={size}
        variant="default"
        aria-label={label}
        onClick={onClick}
        style={{
          ...mapChromeStyle,
          position: 'absolute',
          zIndex: 6,
          borderRadius: size / 2,
          ...style,
        }}
      >
        <IconFocusCentered size={Math.round(size * 0.55)} stroke={1.6} />
      </ActionIcon>
    </Tooltip>
  )
}
