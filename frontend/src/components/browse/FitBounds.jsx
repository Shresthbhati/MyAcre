import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { latLngBounds } from 'leaflet'

export default function FitBounds({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points || points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 13)
      return
    }
    map.fitBounds(latLngBounds(points), { padding: [40, 40] })
  }, [map, points])

  return null
}
