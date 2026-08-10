import { useMemo } from 'react'
import { Table, Tooltip } from '@mantine/core'
import type { Sounding } from '@/core/data/openMeteo/sounding'
import { precipitableWater, surfaceCape } from '@/core/met/thermo'
import { bulkShear, bunkersRightMover, stormRelativeHelicity } from '@/core/met/kinematics'

const MS_TO_KT = 1.94384

interface Row {
  label: string
  value: string
  hint: string
}

/** Derived severe-weather indices, computed client-side from the profile. */
export function IndicesTable({ sounding }: { sounding: Sounding }) {
  const rows = useMemo<Row[]>(() => {
    const lv = sounding.levels
    const cape = surfaceCape(
      lv.map((l) => l.p),
      lv.map((l) => l.T),
      lv[0].T,
      lv[0].Td,
    )
    const pw = precipitableWater(lv.map((l) => l.p), lv.map((l) => l.Td))
    const rm = bunkersRightMover(lv)
    const srh1 = stormRelativeHelicity(lv, 1000, rm)
    const srh3 = stormRelativeHelicity(lv, 3000, rm)
    const sh1 = bulkShear(lv, 1000)
    const sh6 = bulkShear(lv, 6000)
    const rmDir = (Math.atan2(-rm.u, -rm.v) * 180) / Math.PI
    const rmSpd = Math.hypot(rm.u, rm.v)

    return [
      {
        label: 'SBCAPE',
        value: `${Math.round(cape.cape)} J/kg`,
        hint: 'Surface-based buoyant energy. >1000 notable, >2500 large.',
      },
      {
        label: 'CIN',
        value: `${Math.round(cape.cin)} J/kg`,
        hint: 'Convective inhibition (the cap). Below −100 is a strong cap.',
      },
      {
        label: 'Lifted Index',
        value: cape.liftedIndex === null ? '—' : cape.liftedIndex.toFixed(1),
        hint: 'Env minus parcel at 500 hPa. Below −4 is very unstable.',
      },
      {
        label: 'LCL',
        value: `${Math.round(cape.lclP)} hPa`,
        hint: 'Lifting condensation level — cloud-base pressure for a surface parcel.',
      },
      {
        label: 'LFC / EL',
        value: cape.lfcP === null ? '—' : `${Math.round(cape.lfcP)} / ${Math.round(cape.elP ?? 0)} hPa`,
        hint: 'Level of free convection and equilibrium level.',
      },
      {
        label: 'PWAT',
        value: `${pw.toFixed(0)} mm`,
        hint: 'Precipitable water. >40 mm is a very moist column.',
      },
      {
        label: 'Shear 0–1 km',
        value: `${Math.round(sh1 * MS_TO_KT)} kt`,
        hint: 'Low-level bulk shear. >15 kt supports rotating updrafts.',
      },
      {
        label: 'Shear 0–6 km',
        value: `${Math.round(sh6 * MS_TO_KT)} kt`,
        hint: 'Deep-layer shear. >35 kt supports supercells.',
      },
      {
        label: 'SRH 0–1 km',
        value: `${Math.round(srh1)} m²/s²`,
        hint: 'Storm-relative helicity (Bunkers right-mover). >150 significant.',
      },
      {
        label: 'SRH 0–3 km',
        value: `${Math.round(srh3)} m²/s²`,
        hint: 'Deep-layer streamwise vorticity available to a right-moving storm.',
      },
      {
        label: 'Storm motion',
        value: `${Math.round((rmDir + 360) % 360)}° / ${Math.round(rmSpd * MS_TO_KT)} kt`,
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
