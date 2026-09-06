import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Popup, type MapMouseEvent, type MapTouchEvent } from 'maplibre-gl'
import { useMapContext } from '@/map/MapView'
import { popupFor, popupLayerIds } from '@/map/popups/registry'
import { PointPopup } from '@/map/popups/PointPopup'

interface Open {
  lngLat: { lat: number; lng: number }
  /** null = bare-map click → location card. */
  layerId: string | null
  properties: Record<string, unknown>
}

/** Hold this long without moving to count as a long-press on touch. */
const LONG_PRESS_MS = 500
const LONG_PRESS_SLOP_PX = 10

/**
 * The map's click story. A left click on a registered feature opens its
 * card; a left click on the bare map opens nothing and closes whatever is
 * open — panning around must never leave cards behind. The location card
 * (interrogate a point, set home) is a deliberate gesture: right-click on
 * a desktop, long-press on touch.
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
      if (!top) {
        setOpen(null)
        return
      }
      setOpen({
        lngLat: { lat: e.lngLat.lat, lng: e.lngLat.lng },
        layerId: top.layer.id,
        properties: (top.properties as Record<string, unknown>) ?? {},
      })
    }
    const openLocation = (lngLat: { lat: number; lng: number }): void => {
      setOpen({ lngLat: { lat: lngLat.lat, lng: lngLat.lng }, layerId: null, properties: {} })
    }
    const onContextMenu = (e: MapMouseEvent): void => {
      e.preventDefault()
      openLocation(e.lngLat)
    }
    // iOS never fires contextmenu; time a still touch ourselves.
    let press: { at: number; x: number; y: number } | null = null
    const onTouchStart = (e: MapTouchEvent): void => {
      press = e.points.length === 1 ? { at: Date.now(), x: e.point.x, y: e.point.y } : null
    }
    const onTouchEnd = (e: MapTouchEvent): void => {
      if (!press) return
      const held = Date.now() - press.at
      const moved = Math.hypot(e.point.x - press.x, e.point.y - press.y)
      press = null
      if (held >= LONG_PRESS_MS && moved < LONG_PRESS_SLOP_PX) openLocation(e.lngLat)
    }
    map.on('click', onClick)
    map.on('contextmenu', onContextMenu)
    map.on('touchstart', onTouchStart)
    map.on('touchend', onTouchEnd)

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
      map.off('contextmenu', onContextMenu)
      map.off('touchstart', onTouchStart)
      map.off('touchend', onTouchEnd)
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

  // A card describing a feature of a layer that is no longer on the map is
  // a card about nothing — it used to sit there after the layer was toggled
  // off. Every layer add/remove fires styledata, so that is the hook.
  useEffect(() => {
    if (!open || open.layerId === null) return
    const layerId = open.layerId
    const check = (): void => {
      if (map.getLayer(layerId) === undefined) setOpen(null)
    }
    map.on('styledata', check)
    return () => {
      map.off('styledata', check)
    }
  }, [open, map])

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
