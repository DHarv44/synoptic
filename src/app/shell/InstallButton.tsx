import { ActionIcon, Tooltip } from '@mantine/core'
import { IconDeviceDesktopDown, IconReload } from '@tabler/icons-react'
import { applyUpdate, promptInstall, useInstall } from '@/app/install'

/**
 * Two states of the same slot in the top bar, both of which only exist when
 * they are actionable.
 *
 * An update offer outranks an install offer: if a new version is waiting, that
 * is the more useful thing to tell someone. Neither renders otherwise — a
 * permanently greyed-out install button on a browser that cannot install is
 * just clutter.
 */
export function InstallButton() {
  const prompt = useInstall((s) => s.prompt)
  const updateReady = useInstall((s) => s.updateReady)

  if (updateReady) {
    return (
      <Tooltip label="A new version is ready — click to reload">
        <ActionIcon variant="subtle" color="blue" onClick={applyUpdate} aria-label="Reload to update">
          <IconReload size={17} stroke={1.6} />
        </ActionIcon>
      </Tooltip>
    )
  }

  if (!prompt) return null

  return (
    <Tooltip label="Install as a desktop app">
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => void promptInstall()}
        aria-label="Install as a desktop app"
      >
        <IconDeviceDesktopDown size={17} stroke={1.6} />
      </ActionIcon>
    </Tooltip>
  )
}
