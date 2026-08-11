import { useMemo } from 'react'
import { Table, Tooltip } from '@mantine/core'
import type { Sounding } from '@/core/data/openMeteo/sounding'
import { deriveIndices, MS_TO_KT } from '@/features/sounding/indices'

interface Row {
  label: string
  value: string
  hint: string
}

/** Derived severe-weather indices, computed client-side from the profile. */
export function IndicesTable({ sounding }: { sounding: Sounding }) {
  const rows = useMemo<Row[]>(() => {
    const ix = deriveIndices(sounding)
    return [
      {
        label: 'SBCAPE',
        value: `${Math.round(ix.cape)} J/kg`,
        hint: 'Surface-based buoyant energy. >1000 notable, >2500 large.',
      },
      {
        label: 'CIN',
        value: `${Math.round(ix.cin)} J/kg`,
        hint: 'Convective inhibition (the cap). Below −100 is a strong cap.',
      },
      {
        label: 'Lifted Index',
        value: ix.liftedIndex === null ? '—' : ix.liftedIndex.toFixed(1),
        hint: 'Env minus parcel at 500 hPa. Below −4 is very unstable.',
      },
      {
        label: 'LCL',
        value: `${Math.round(ix.lclP)} hPa`,
        hint: 'Lifting condensation level — cloud-base pressure for a surface parcel.',
      },
      {
        label: 'LFC / EL',
        value: ix.lfcP === null ? '—' : `${Math.round(ix.lfcP)} / ${Math.round(ix.elP ?? 0)} hPa`,
        hint: 'Level of free convection and equilibrium level.',
      },
      {
        label: 'PWAT',
        value: `${ix.pwat.toFixed(0)} mm`,
        hint: 'Precipitable water. >40 mm is a very moist column.',
      },
      {
        label: 'Shear 0–1 km',
        value: `${Math.round(ix.shear1 * MS_TO_KT)} kt`,
        hint: 'Low-level bulk shear. >15 kt supports rotating updrafts.',
      },
      {
        label: 'Shear 0–6 km',
        value: `${Math.round(ix.shear6 * MS_TO_KT)} kt`,
        hint: 'Deep-layer shear. >35 kt supports supercells.',
      },
      {
        label: 'SRH 0–1 km',
        value: `${Math.round(ix.srh1)} m²/s²`,
        hint: 'Storm-relative helicity (Bunkers right-mover). >150 significant.',
      },
      {
        label: 'SRH 0–3 km',
        value: `${Math.round(ix.srh3)} m²/s²`,
        hint: 'Deep-layer streamwise vorticity available to a right-moving storm.',
      },
      {
        label: 'Storm motion',
        value: `${Math.round(ix.stormDirDeg)}° / ${Math.round(ix.stormSpdMs * MS_TO_KT)} kt`,
        hint: 'Bunkers right-mover estimate (direction from / speed).',
      },
    ]
  }, [sounding])

  return (
    <Table withRowBorders={false} verticalSpacing={2} fz="xs">
      <Table.Tbody>
        {rows.map((r) => (
          <Tooltip key={r.label} label={r.hint} position="left" multiline w={230}>
            <Table.Tr>
              <Table.Td c="dimmed">{r.label}</Table.Td>
              <Table.Td ff="monospace" ta="right">
                {r.value}
              </Table.Td>
            </Table.Tr>
          </Tooltip>
        ))}
      </Table.Tbody>
    </Table>
  )
}
