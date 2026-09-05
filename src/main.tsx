import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/spotlight/styles.css'
import '@/app/global.css'

import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { installDevHook } from '@/dev/wx'
import { initInstall } from '@/app/install'
import { initUrlTime } from '@/core/time/urlTime'
import '@/features'

installDevHook()
// Before render: `beforeinstallprompt` fires early, and missing it costs the
// install button for the whole session.
initInstall()
// Before render too, so a #t= deep link never flashes the live view first.
initUrlTime()

const root = document.getElementById('root')
if (!root) throw new Error('missing #root element')

// No StrictMode wrapper — double-invoked effects break R3F scene lifecycles.
createRoot(root).render(<App />)
