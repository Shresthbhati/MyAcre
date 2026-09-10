import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import PlotGridMap from '../components/browse/PlotGridMap'
import PlotPicker from '../components/browse/PlotPicker'
import ValuationChart from '../components/browse/ValuationChart'
import SqFtBar from '../components/browse/SqFtBar'
import PropertyPassport from '../components/browse/PropertyPassport'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatINR } from '../lib/format'
import { txUrl } from '../lib/chain'

export default function PropertyDetail() {
  const { id } = useParams()
  const { user, getToken } = useAuth()

  const [listing, setListing] = useState(null)
  const [valuation, setValuation] = useState(null)
  const [passport, setPassport] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error | notfound
  const [me, setMe] = useState(null)

  const [activePlot, setActivePlot] = useState(null)
  const [cart, setCart] = useState(new Map()) // plotId -> { row, col, sqFt }
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [buyStatus, setBuyStatus] = useState('idle') // idle | processing | success | error
  const [buyMessage, setBuyMessage] = useState('')
  const [buyTxHash, setBuyTxHash] = useState(null)
  // Stays the same across retries of the same cart (e.g. re-clicking Buy
  // after a network error means "did that actually go through?", not "buy
  // again") so the backend can dedupe them; a fresh key is drawn once the
  // cart itself changes or the purchase finishes.
  const idempotencyKeyRef = useRef(null)

  const [documents, setDocuments] = useState([])
  const [docUploadStatus, setDocUploadStatus] = useState('idle') // idle | uploading | error
  const [docUploadError, setDocUploadError] = useState('')

  const loadListing = () => {
    api
      .getListing(id)
      .then((data) => {
        setListing(data)
        setStatus('ready')
      })
      .catch(() => setStatus((s) => (s === 'loading' ? 'notfound' : 'error')))
    api.getValuation(id).then(setValuation).catch(() => {})
    api.getPassport(id).then(setPassport).catch(() => {})
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

  const canManageDocuments = listing && me && (me.id === listing.ownerId || me.role === 'ADMIN')

  useEffect(() => {
    if (!canManageDocuments) {
      setDocuments([])
      return
    }
    getToken()
      .then((token) => api.getDocuments(token, listing.id))
      .then(setDocuments)
      .catch(() => setDocuments([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageDocuments, listing?.id])

  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setDocUploadStatus('uploading')
    setDocUploadError('')
    try {
      const token = await getToken()
      const doc = await api.uploadDocument(token, listing.id, file)
      setDocuments((prev) => [doc, ...prev])
      setDocUploadStatus('idle')
    } catch (err) {
      setDocUploadStatus('error')
      setDocUploadError(err.message)
    }
  }

  const handleToggleFreeze = async () => {
    const token = await getToken()
    if (listing.frozen) {
      await api.unfreezeListing(token, listing.id)
    } else {
      const reason = window.prompt('Reason for freezing this property?')
      if (!reason) return
      await api.freezeListing(token, listing.id, reason)
    }
    loadListing()
  }

  const cartList = useMemo(() => Array.from(cart.entries()).map(([plotId, v]) => ({ plotId, ...v })), [cart])
  const totalSqFt = cartList.reduce((sum, c) => sum + c.sqFt, 0)
  const totalPrice = listing ? totalSqFt * Number(listing.pricePerSqFt) : 0

  const handlePick = (plot) => setActivePlot(plot)

  const handleConfirmPick = (sqFt) => {
    setCart((prev) => {
      const next = new Map(prev)
      const existing = next.get(activePlot.id)
      next.set(activePlot.id, { row: activePlot.row, col: activePlot.col, sqFt: (existing?.sqFt || 0) + sqFt })
      return next
    })
    setActivePlot(null)
    idempotencyKeyRef.current = null
  }

  const removeFromCart = (plotId) => {
    setCart((prev) => {
      const next = new Map(prev)
      next.delete(plotId)
      return next
    })
    idempotencyKeyRef.current = null
  }

  const handleBuy = async () => {
    if (cartList.length === 0) return
    setBuyStatus('processing')
    setBuyMessage('')
    setBuyTxHash(null)
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID()
    try {
      const token = await getToken()
      const result = await api.buyPlots(token, listing.id, {
        selections: cartList.map((c) => ({ plotId: c.plotId, sqFt: c.sqFt })),
        paymentMethod,
        simulatePaymentFailure: simulateFailure,
        idempotencyKey: idempotencyKeyRef.current,
      })
      idempotencyKeyRef.current = null
      setBuyStatus('success')
      const purchaseLine = `Purchased ${totalSqFt.toFixed(0)} sqft for ${formatINR(totalPrice)}.`
      setBuyMessage(
        result.blockchainStatus === 'RECONCILIATION_REQUIRED'
          ? `${purchaseLine} Ownership is recorded — blockchain settlement failed and needs reconciliation before it's on-chain.`
          : purchaseLine,
      )
      setBuyTxHash(result.txHash || null)
      setCart(new Map())
      loadListing()
    } catch (err) {
      setBuyStatus('error')
      setBuyMessage(err.message)
      loadListing() // refresh grid in case chunks were sold by someone else
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

  return (
    <PageShell>
      <section className="py-16 md:py-20">
        <div className="container-fluid">
          <p className="mono-label mb-4">
            {listing.city} · {listing.assetId}
          </p>
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
                <p className="font-mono text-lg text-white">{listing.areaSqFt.toLocaleString('en-IN')} sqft</p>
                <p className="mono-label mt-1">Total Area</p>
              </div>
            </div>
          </div>

          {listing.frozen && (
            <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 font-mono text-xs text-amber-200">
              This property is frozen — purchases are blocked. {listing.frozenReason}
            </div>
          )}

          {me?.role === 'ADMIN' && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-dashed border-silver-low/30 p-3 font-mono text-[11px]">
              <span className="text-silver-low">Admin controls</span>
              <button type="button" onClick={handleToggleFreeze} className="btn-ghost !px-3 !py-1 text-[11px]">
                {listing.frozen ? 'Unfreeze property' : 'Freeze property'}
              </button>
            </div>
          )}

          {canManageDocuments && (
            <div className="mb-6 rounded-xl border border-dashed border-silver-low/30 p-4 font-mono text-[11px]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-silver-low">
                  Evidence documents <span className="text-silver-low/60">(private — owner &amp; admin only)</span>
                </span>
                <label className="btn-ghost cursor-pointer !px-3 !py-1 text-[11px]">
                  {docUploadStatus === 'uploading' ? 'Uploading…' : 'Upload PDF/PNG/JPEG'}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleUploadDocument} />
                </label>
              </div>
              {docUploadStatus === 'error' && <p className="mb-2 text-red-400">{docUploadError}</p>}
              {documents.length === 0 ? (
                <p className="text-silver-low/60">No documents uploaded yet.</p>
              ) : (
                <ul className="space-y-1">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between text-silver-low">
                      <span>
                        {doc.filename} · {(doc.size / 1024).toFixed(0)}KB
                      </span>
                      <span className="text-silver-low/60" title={doc.sha256}>
                        sha256:{doc.sha256.slice(0, 10)}…
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="glass mb-10 rounded-2xl p-5">
            <SqFtBar soldSqFt={listing.soldSqFt} availableSqFt={listing.availableSqFt} excludedSqFt={listing.excludedSqFt} />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
            <div className="flex flex-col gap-6">
              <div className="map-shell h-[420px] md:h-[520px]">
                <PlotGridMap listing={listing} plots={listing.plots} cart={cart} onPickPlot={handlePick} />
              </div>

              {valuation && (
                <div className="glass rounded-2xl p-6">
                  <ValuationChart valuation={valuation} />
                </div>
              )}

              <PropertyPassport passport={passport} />
            </div>

            <div className="glass flex flex-col gap-6 rounded-2xl p-6 md:p-8">
              <div>
                <p className="mono-label mb-2">Price per sqft</p>
                <p className="font-display text-3xl italic text-white">{formatINR(listing.pricePerSqFt)}</p>
                <p className="mt-2 font-mono text-[11px] text-silver-low">
                  ≈ {listing.sqFtPerToken.toFixed(0)} sqft per full chunk · {formatINR(listing.pricePerToken)}/chunk
                </p>
              </div>

              <p className="hairline rounded-lg border p-3 font-mono text-[10px] leading-relaxed text-silver-low">
                Tokens represent an <span className="text-white">undivided proportional share</span> of this
                property's value — not a surveyed physical spot, the same structure REITs and co-ownership use. Pick
                a chunk on the map, then dial in exactly how much of it you want.
              </p>

              <div className="hairline flex items-center gap-4 border-t pt-4 text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border border-white/40 bg-white/10" /> Available
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border-2 border-white/70 bg-white/30" /> Partial
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-zinc-700" /> Sold
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border border-dashed border-white/20 bg-black/40" /> Road
                </span>
              </div>

              {activePlot && (
                <PlotPicker
                  plot={activePlot}
                  pricePerSqFt={Number(listing.pricePerSqFt)}
                  existingInCart={cart.get(activePlot.id)?.sqFt || 0}
                  onConfirm={handleConfirmPick}
                  onCancel={() => setActivePlot(null)}
                />
              )}

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
                  {cartList.length > 0 && (
                    <div className="hairline flex flex-col gap-2 rounded-xl border p-3">
                      {cartList.map((c) => (
                        <div key={c.plotId} className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-silver-low">
                            R{c.row + 1}C{c.col + 1} · {c.sqFt.toFixed(0)} sqft
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(c.plotId)}
                            className="text-silver-low underline underline-offset-2 hover:text-white"
                          >
                            remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="mono-label mb-2">Selected</p>
                    <p className="font-mono text-sm text-white">
                      {totalSqFt.toFixed(0)} sqft · {formatINR(totalPrice)}
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
                    <p className="font-mono text-[11px] text-silver-low">
                      {buyMessage}{' '}
                      {buyTxHash && (
                        <a
                          href={txUrl(buyTxHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white underline underline-offset-2"
                        >
                          View on PolygonScan ↗
                        </a>
                      )}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleBuy}
                    disabled={cartList.length === 0 || buyStatus === 'processing' || listing.frozen}
                    className="btn-silver disabled:opacity-50"
                  >
                    {listing.frozen
                      ? 'Property frozen'
                      : buyStatus === 'processing'
                        ? 'Processing…'
                        : `Buy ${totalSqFt > 0 ? totalSqFt.toFixed(0) + ' sqft' : ''}`}
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
