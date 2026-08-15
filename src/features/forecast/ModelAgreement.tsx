import { Text } from '@mantine/core'
import { useFeatureEnabled } from '@/core/settings/store'
import { dayLabel } from '@/features/forecast/service'
import { temperatureAgreement } from '@/core/data/openMeteo/confidence'
import { useModels } from '@/core/data/openMeteo/useModels'

/**
 * One line of confidence under the outlook, read from cross-model temperature
 * spread. Uses the same cached fetch as the Models section, so when that
 * section is mounted this costs nothing; with the models feature disabled it
 * fetches nothing and says nothing, rather than quietly re-enabling the feed.
 */
export function ModelAgreement() {
  const enabled = useFeatureEnabled('models')
  const { data } = useModels(enabled)

  if (!enabled || !data) return null
  const now = Date.now()
  const a = temperatureAgreement(data, now)
  if (!a) return null

  return (
    <Text size="xs" c="dimmed">
      {a.divergesOn === null
        ? `Models agree on temperature through ${dayLabel(a.throughDate, now)}.`
        : a.divergesOn === a.throughDate
          ? `Models diverge from ${dayLabel(a.divergesOn, now)} — low confidence.`
          : `Models agree through ${dayLabel(a.throughDate, now)}, diverge from ${dayLabel(a.divergesOn, now)}.`}
    </Text>
  )
}
