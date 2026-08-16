import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Popup, type MapMouseEvent } from 'maplibre-gl'
import { useMapContext } from '@/map/MapView'
import { popupFor, popupLayerIds } from '@/map/popups/registry'
import { PointPopup } from '@/map/popups/PointPopup'

interface Open {
  lngLat: { lat: number; lng: number }
  /** null = bare-map click → location card. */
  layerId: string | null
  properties: Record<string, unknown>
}

/**
 * The map's one click story: every click answers AT the click. An orb
 * (registered feature) wins over the bare map; the bare map opens the
 * location card, where interrogating a point is a deliberate action —
 * clicks no longer silently retarget every panel.
 */
export function MapPopup() {
  const { map } = useMapContext()
  const [open, setOpen] = useState<Open | null>(null)
  const container = useMemo(() => document.createElement('div'), [])
  const popupRef = useRef<Popup | null>(null)

  useEffect(() => {
    const onClick = (e: MapMouseEvent): void => {
      const ids = popupLayerIds().filter((id) => map.getLayer(id) !== undefined)
      const hits = ids.length > 0 ? map.queryRenderedFeatures(e.point, { layers: ids }) : []
      const top = hits[0]
      setOpen({
        lngLat: { lat: e.lngLat.lat, lng: e.lngLat.lng },
        layerId: top?.layer.id ?? null,
        properties: (top?.properties as Record<string, unknown>) ?? {},
      })
    }
    map.on('click', onClick)

    // Pointer cursor over anything clickable. Layer-scoped handlers match
    // lazily, so layers added later still get the affordance.
    const enter = (): void => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const leave = (): void => {
      map.getCanvas().style.cursor = ''
    }
    const ids = popupLayerIds()
    for (const id of ids) {
      map.on('mouseenter', id, enter)
      map.on('mouseleave', id, leave)
    }
    return () => {
      map.off('click', onClick)
      for (const id of ids) {
        map.off('mouseenter', id, enter)
        map.off('mouseleave', id, leave)
      }
    }
  }, [map])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) {
      popupRef.current?.remove()
      popupRef.current = null
      return
    }
    if (!popupRef.current) {
      popupRef.current = new Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: '300px',
        offset: 12,
        className: 'synoptic-popup',
      })
        .setDOMContent(container)
        .addTo(map)
      popupRef.current.on('close', () => setOpen(null))
    }
    popupRef.current.setLngLat(open.lngLat)
    return undefined
  }, [open, map, container])

  useEffect(
    () => () => {
      popupRef.current?.remove()
    },
    [],
  )

  if (!open) return null
  const entry = open.layerId !== null ? popupFor(open.layerId) : undefined
  const close = (): void => setOpen(null)
  const Body = entry?.component
  return createPortal(
    Body ? (
      <Body properties={open.properties} onClose={close} />
    ) : (
      <PointPopup lat={open.lngLat.lat} lon={open.lngLat.lng} onClose={close} />
    ),
    container,
  )
}
