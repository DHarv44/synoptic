import { Stack } from '@mantine/core'
import { DockSection } from '@/app/shell/DockSection'
import { GettingStarted } from '@/app/help/GettingStarted'
import { Shortcuts } from '@/app/help/Shortcuts'
import { Glossary } from '@/app/help/Glossary'
import { DataPage } from '@/app/help/DataPage'
import { About } from '@/app/help/About'

/**
 * Help as a dock tab rather than a dialog, so instructions sit beside the
 * thing they describe — you can read how a cross-section is drawn while
 * drawing one, which a modal covering the map cannot offer.
 *
 * Same collapsible sections as every other tab: no new interaction to learn
 * in the one place someone goes when they don't know how something works.
 */
export function HelpPanel() {
  return (
    <Stack gap={0}>
      <DockSection id="help-start" title="Getting started">
        <GettingStarted />
      </DockSection>
      <DockSection id="help-keys" title="Keyboard">
        <Shortcuts />
      </DockSection>
      <DockSection id="help-terms" title="Reading the instruments">
        <Glossary />
      </DockSection>
      <DockSection id="help-data" title="Data catalog">
        <DataPage />
      </DockSection>
      <DockSection id="help-about" title="About">
        <About />
      </DockSection>
    </Stack>
  )
}
