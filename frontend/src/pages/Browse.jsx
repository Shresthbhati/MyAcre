import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import PageShell from '../components/layout/PageShell'
import ListingThumb from '../components/ui/ListingThumb'
import FitBounds from '../components/browse/FitBounds'
import { pinIcon } from '../lib/mapIcons'
import { formatINR } from '../lib/format'
import { api } from '../lib/api'

export default function Browse() {
  const [listings, setListings] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    api
      .getListings()
      .then((data) => {
        setListings(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  const points = listings.map((l) => [l.latitude, l.longitude])

  return (
    <PageShell>
      <section className="py-16 md:py-20">
        <div className="container-fluid">
          <p className="mono-label mb-4 text-center">Browse &amp; Buy</p>
          <h1 className="mb-10 text-center font-display text-4xl italic md:text-6xl">
            Map <span className="text-gradient-silver">View.</span>
          </h1>

          {status === 'error' && (
            <p className="mono-label glass mx-auto max-w-md rounded-xl p-6 text-center">
              Could not reach the backend. Make sure it's running on {import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}.
            </p>
          )}

          {status !== 'error' && (
            <>
              <div className="map-shell h-[420px] w-full md:h-[520px]">
                <MapContainer
                  center={[20.5937, 78.9629]}
                  zoom={5}
                  scrollWheelZoom
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    className="map-tiles-dark"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitBounds points={points} />
                  {listings.map((listing) => (
                    <Marker key={listing.id} position={[listing.latitude, listing.longitude]} icon={pinIcon()}>
                      <Popup>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-silver-low">
                          {listing.city}
                        </p>
                        <p className="mt-1 font-display text-lg italic text-white">{listing.title}</p>
                        <p className="mt-1 font-mono text-xs text-silver">
                          {formatINR(listing.pricePerToken)} / chunk
                        </p>
                        <p className="font-mono text-[10px] text-silver-low">
                          {listing.totalTokens - listing.soldCount} of {listing.totalTokens} available
                        </p>
                        <Link
                          to={`/browse/${listing.id}`}
                          className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-white underline underline-offset-4"
                        >
                          View Property
                        </Link>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {status === 'loading' &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass h-64 animate-pulse rounded-2xl" />
                  ))}

                {listings.map((listing) => (
                  <Link
                    key={listing.id}
                    to={`/browse/${listing.id}`}
                    className="glass group overflow-hidden rounded-2xl transition-all duration-300 hover:border-white/20"
                  >
                    <ListingThumb seed={listing.imageSeed} className="h-36 w-full" />
                    <div className="p-6">
                      <p className="mono-label">{listing.city}</p>
                      <h3 className="mt-2 font-display text-2xl italic text-white">{listing.title}</h3>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm text-white">{formatINR(listing.pricePerToken)}</p>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-silver-low">per chunk</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm text-white">
                            {listing.totalTokens - listing.soldCount}/{listing.totalTokens}
                          </p>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-silver-low">available</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </PageShell>
  )
}
