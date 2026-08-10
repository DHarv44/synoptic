import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { theme } from '@/app/theme'
import { Shell } from '@/app/shell/Shell'

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="bottom-right" />
      <Shell />
    </MantineProvider>
  )
}
