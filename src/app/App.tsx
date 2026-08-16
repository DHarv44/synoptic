import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { theme } from '@/app/theme'
import { Shell } from '@/app/shell/Shell'
import { DataDocsPage } from '@/app/docs/DataDocsPage'
import { FeatureBackground } from '@/app/FeatureBackground'

/** /data serves the documentation page; everything else is the workstation. */
function route(): 'data' | 'app' {
  return window.location.pathname.replace(/\/$/, '') === '/data' ? 'data' : 'app'
}

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="bottom-right" />
      {route() === 'data' ? (
        <DataDocsPage />
      ) : (
        <>
          <FeatureBackground />
          <Shell />
        </>
      )}
    </MantineProvider>
  )
}
