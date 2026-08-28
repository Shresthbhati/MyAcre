import { MapContainer, TileLayer, Rectangle, Tooltip } from 'react-leaflet'
import { formatINR } from '../../lib/format'

// Projects the property's token grid onto the map as a set of small
// lat/lng rectangles centered on the listing's coordinates — the "chunks"
// referenced throughout the product flow, rendered where they'd physically
// sit on the plot. Cells marked non-sellable (roads / common area) render
// as excluded and are never clickable.
const LAT_SPAN = 0.0022
const LNG_SPAN = 0.0032

function cellBounds(centerLat, centerLng, row, col, rows, cols) {
  const cellHeight = (LAT_SPAN * 2) / rows
  const cellWidth = (LNG_SPAN * 2) / cols
  const north = centerLat + LAT_SPAN - row * cellHeight
  const south = north - cellHeight
  const west = centerLng - LNG_SPAN + col * cellWidth
  const east = west + cellWidth
  return [
    [south, west],
    [north, east],
  ]
}

function plotStyle(plot, inCart) {
  if (inCart) return { color: '#f8fafc', fillColor: '#f8fafc', fillOpacity: 0.55, weight: 2 }
  if (plot.status === 'EXCLUDED') {
    return { color: 'rgba(255,255,255,0.15)', fillColor: '#000000', fillOpacity: 0.3, weight: 1, dashArray: '3 3' }
  }
  if (plot.status === 'SOLD') return { color: '#3f3f46', fillColor: '#27272a', fillOpacity: 0.75, weight: 1 }
  if (plot.status === 'PARTIAL') return { color: 'rgba(255,255,255,0.6)', fillColor: '#ffffff', fillOpacity: 0.32, weight: 1.5 }
  return { color: 'rgba(255,255,255,0.4)', fillColor: '#ffffff', fillOpacity: 0.08, weight: 1 }
}

function remainingSqFt(plot) {
  return Math.max(0, plot.totalSqFt - plot.soldSqFt)
}

export default function PlotGridMap({ listing, plots, cart, onPickPlot }) {
  return (
    <MapContainer
      center={[listing.latitude, listing.longitude]}
      zoom={17}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        className="map-tiles-dark"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {plots.map((plot) => {
        const inCart = cart.has(plot.id)
        const clickable = plot.status !== 'EXCLUDED' && plot.status !== 'SOLD'
        return (
          <Rectangle
            key={plot.id}
            bounds={cellBounds(listing.latitude, listing.longitude, plot.row, plot.col, listing.gridRows, listing.gridCols)}
            pathOptions={plotStyle(plot, inCart)}
            eventHandlers={clickable ? { click: () => onPickPlot(plot) } : undefined}
          >
            <Tooltip sticky direction="top" opacity={1}>
              <span className="font-mono text-[10px]">
                {plot.status === 'EXCLUDED' && 'Road / common area — not for sale'}
                {plot.status === 'SOLD' && 'Sold'}
                {plot.status === 'PARTIAL' &&
                  `${remainingSqFt(plot).toFixed(0)} sqft left · ${formatINR(listing.pricePerSqFt)}/sqft`}
                {plot.status === 'AVAILABLE' &&
                  `${plot.totalSqFt.toFixed(0)} sqft · ${formatINR(listing.pricePerSqFt)}/sqft`}
              </span>
            </Tooltip>
          </Rectangle>
        )
      })}
    </MapContainer>
  )
}
