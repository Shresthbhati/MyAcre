import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import PlotGridMap from '../components/browse/PlotGridMap'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatINR } from '../lib/format'

export default function PropertyDetail() {
  const { id } = useParams()
  const { user, getToken } = useAuth()

  const [listing, setListing] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error | notfound
  const [me, setMe] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [buyStatus, setBuyStatus] = useState('idle') // idle | processing | success | error
  const [buyMessage, setBuyMessage] = useState('')

  const loadListing = () => {
    api
      .getListing(id)
      .then((data) => {
        setListing(data)
        setStatus('ready')
      })
      .catch(() => setStatus(status === 'loading' ? 'notfound' : 'error'))
  }

  useEffect(() => {
    loadListing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!user) {
      setMe(null)
      return
    }
    getToken()
      .then((token) => api.getMe(token))
      .then(setMe)
      .catch(() => setMe(null))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedList = useMemo(() => Array.from(selectedIds), [selectedIds])
  const totalPrice = listing ? Number(listing.pricePerToken) * selectedList.length : 0

  const togglePlot = (plot) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(plot.id)) next.delete(plot.id)
      else next.add(plot.id)
      return next
    })
  }

  const handleBuy = async () => {
    if (selectedList.length === 0) return
    setBuyStatus('processing')
    setBuyMessage('')
    try {
      const token = await getToken()
      await api.buyPlots(token, listing.id, {
        plotIds: selectedList,
        paymentMethod,
        simulatePaymentFailure: simulateFailure,
      })
      setBuyStatus('success')
      setBuyMessage(`Purchased ${selectedList.length} chunk${selectedList.length > 1 ? 's' : ''} for ${formatINR(totalPrice)}.`)
      setSelectedIds(new Set())
      loadListing()
    } catch (err) {
      setBuyStatus('error')
      setBuyMessage(err.message)
      loadListing() // refresh grid in case plots were sold by someone else
    }
  }

  if (status === 'loading') {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="mono-label">Loading property…</p>
        </div>
      </PageShell>
    )
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
          <p className="mono-label">Not Found</p>
          <h1 className="font-display text-3xl italic">This listing does not exist.</h1>
          <Link to="/browse" className="btn-ghost">
            Back to Map
          </Link>
        </div>
      </PageShell>
    )
  }

  const kycVerified = me?.kycStatus === 'VERIFIED'
  const available = listing.totalTokens - listing.soldCount

  return (
    <PageShell>
      <section className="py-16 md:py-20">
        <div className="container-fluid">
          <p className="mono-label mb-4">{listing.city}</p>
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-4xl italic md:text-5xl">{listing.title}</h1>
              <p className="mt-3 max-w-xl font-sans text-sm font-light text-silver-low">{listing.description}</p>
            </div>
            <div className="flex gap-8 md:text-right">
              <div>
                <p className="font-mono text-lg text-white">{formatINR(listing.totalValue)}</p>
                <p className="mono-label mt-1">Total Value</p>
              </div>
              <div>
                <p className="font-mono text-lg text-white">
                  {available}/{listing.totalTokens}
                </p>
                <p className="mono-label mt-1">Chunks Available</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
            <div className="map-shell h-[420px] md:h-[560px]">
              <PlotGridMap listing={listing} plots={listing.plots} selectedIds={selectedIds} onToggle={togglePlot} />
            </div>

            <div className="glass flex flex-col gap-6 rounded-2xl p-6 md:p-8">
              <div>
                <p className="mono-label mb-2">Price per Chunk</p>
                <p className="font-display text-3xl italic text-white">{formatINR(listing.pricePerToken)}</p>
              </div>

              <div className="hairline flex items-center gap-4 border-t pt-4 text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border border-white/40 bg-white/10" /> Available
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-white" /> Selected
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-zinc-700" /> Sold
                </span>
              </div>

              {!user && (
                <div className="hairline rounded-xl border p-4 text-center">
                  <p className="font-mono text-[11px] text-silver-low">Log in to select and buy chunks.</p>
                  <Link to="/login" className="btn-silver mt-3 inline-flex">
                    Log In
                  </Link>
                </div>
              )}

              {user && !kycVerified && (
                <div className="hairline rounded-xl border p-4 text-center">
                  <p className="font-mono text-[11px] text-silver-low">
                    Your KYC isn't verified yet — required before buying tokens.
                  </p>
                  <Link to="/kyc" className="btn-silver mt-3 inline-flex">
                    Verify KYC
                  </Link>
                </div>
              )}

              {user && kycVerified && (
                <>
                  <div>
                    <p className="mono-label mb-2">Selected</p>
                    <p className="font-mono text-sm text-white">
                      {selectedList.length} chunk{selectedList.length === 1 ? '' : 's'} · {formatINR(totalPrice)}
                    </p>
                  </div>

                  <div>
                    <p className="mono-label mb-2">Payment Method</p>
                    <div className="flex gap-2">
                      {['upi', 'card'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`hairline rounded-lg border px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${
                            paymentMethod === method ? 'bg-white text-black' : 'text-silver-low'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 font-mono text-[10px] text-silver-low">
                    <input
                      type="checkbox"
                      checked={simulateFailure}
                      onChange={(e) => setSimulateFailure(e.target.checked)}
                    />
                    Simulate payment failure (demo)
                  </label>

                  {buyMessage && (
                    <p className="font-mono text-[11px] text-silver-low">{buyMessage}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleBuy}
                    disabled={selectedList.length === 0 || buyStatus === 'processing'}
                    className="btn-silver disabled:opacity-50"
                  >
                    {buyStatus === 'processing' ? 'Processing…' : `Buy ${selectedList.length || ''} Chunk${selectedList.length === 1 ? '' : 's'}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
