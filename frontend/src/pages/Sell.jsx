import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

const EMPTY_FORM = {
  title: '',
  description: '',
  city: '',
  latitude: '',
  longitude: '',
  totalValue: '',
  areaSqFt: '',
  gridRows: 4,
  gridCols: 5,
  titleDeedNumber: '',
}

export default function Sell() {
  const { user, getToken } = useAuth()
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [excluded, setExcluded] = useState(new Set()) // "row-col" strings marked as road/common area
  const [status, setStatus] = useState('idle') // idle | submitting | verified | rejected | error
  const [message, setMessage] = useState('')

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

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const rows = Number(form.gridRows) || 0
  const cols = Number(form.gridCols) || 0
  const sellableCount = Math.max(0, rows * cols - excluded.size)
  const sqFtPerChunk = form.areaSqFt && sellableCount ? Number(form.areaSqFt) / sellableCount : 0
  const pricePerChunk = form.totalValue && sellableCount ? Number(form.totalValue) / sellableCount : 0

  const gridCells = useMemo(() => {
    const cells = []
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) cells.push({ r, c })
    }
    return cells
  }, [rows, cols])

  const toggleCell = (r, c) => {
    const key = `${r}-${c}`
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setMessage('')
    try {
      const token = await getToken()
      const excludedCells = Array.from(excluded).map((key) => {
        const [row, col] = key.split('-').map(Number)
        return { row, col }
      })
      const listing = await api.createListing(token, {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        totalValue: Number(form.totalValue),
        areaSqFt: Number(form.areaSqFt),
        gridRows: rows,
        gridCols: cols,
        excludedCells,
      })
      if (listing.titleStatus === 'VERIFIED') {
        setStatus('verified')
      } else {
        setStatus('rejected')
        setMessage(listing.titleRejectionReason)
      }
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  if (!user) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
          <p className="mono-label">Sell &amp; Tokenize</p>
          <h1 className="font-display text-3xl italic">Log in to list a property.</h1>
          <Link to="/login" className="btn-silver">
            Log In
          </Link>
        </div>
      </PageShell>
    )
  }

  if (user && me && me.kycStatus !== 'VERIFIED') {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
          <p className="mono-label">Sell &amp; Tokenize</p>
          <h1 className="font-display text-3xl italic">Verify your KYC before listing.</h1>
          <Link to="/kyc" className="btn-silver">
            Verify KYC
          </Link>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <section className="py-16 md:py-20">
        <div className="container-fluid flex justify-center">
          <div className="glass w-full max-w-4xl rounded-[2rem] p-8 md:p-12">
            <p className="mono-label mb-4 text-center">Sell &amp; Tokenize</p>
            <h1 className="mb-8 text-center font-display text-4xl italic">
              List a <span className="text-gradient-silver">Property.</span>
            </h1>

            {status === 'verified' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="font-mono text-sm uppercase tracking-widest text-white">✓ Title Verified</p>
                <p className="font-sans text-sm font-light text-silver-low">
                  Your property cleared the oracle title check and its chunks are now live on the map.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStatus('idle')
                      setForm(EMPTY_FORM)
                      setExcluded(new Set())
                    }}
                    className="btn-ghost"
                  >
                    List Another
                  </button>
                  <button onClick={() => navigate('/browse')} className="btn-silver">
                    View on Map
                  </button>
                </div>
              </div>
            )}

            {status === 'rejected' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="font-mono text-sm uppercase tracking-widest text-white">Listing Rejected</p>
                <p className="font-sans text-sm font-light text-silver-low">{message}</p>
                <button onClick={() => setStatus('idle')} className="btn-ghost">
                  Try Again
                </button>
              </div>
            )}

            {(status === 'idle' || status === 'submitting' || status === 'error') && (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
                <div className="flex flex-col gap-4">
                  <input
                    name="title"
                    required
                    placeholder="Property title"
                    value={form.title}
                    onChange={handleChange}
                    className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
                  />
                  <textarea
                    name="description"
                    required
                    rows={3}
                    placeholder="Description"
                    value={form.description}
                    onChange={handleChange}
                    className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <input
                      name="city"
                      required
                      placeholder="City"
                      value={form.city}
                      onChange={handleChange}
                      className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
                    />
                    <input
                      name="latitude"
                      required
                      type="number"
                      step="any"
                      placeholder="Latitude (e.g. 18.5362)"
                      value={form.latitude}
                      onChange={handleChange}
                      className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
                    />
                    <input
                      name="longitude"
                      required
                      type="number"
                      step="any"
                      placeholder="Longitude (e.g. 73.8940)"
                      value={form.longitude}
                      onChange={handleChange}
                      className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input
                      name="totalValue"
                      required
                      type="number"
                      min="1"
                      placeholder="Total value (₹)"
                      value={form.totalValue}
                      onChange={handleChange}
                      className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
                    />
                    <input
                      name="areaSqFt"
                      required
                      type="number"
                      min="1"
                      placeholder="Total area (sqft)"
                      value={form.areaSqFt}
                      onChange={handleChange}
                      className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input
                      name="gridRows"
                      required
                      type="number"
                      min="1"
                      max="12"
                      placeholder="Grid rows"
                      value={form.gridRows}
                      onChange={handleChange}
                      className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
                    />
                    <input
                      name="gridCols"
                      required
                      type="number"
                      min="1"
                      max="12"
                      placeholder="Grid columns"
                      value={form.gridCols}
                      onChange={handleChange}
                      className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
                    />
                  </div>
                  <input
                    name="titleDeedNumber"
                    required
                    placeholder="Title deed number"
                    value={form.titleDeedNumber}
                    onChange={handleChange}
                    className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm uppercase text-white placeholder:text-silver-low placeholder:normal-case focus:outline-none"
                  />
                  <p className="font-mono text-[10px] leading-relaxed text-silver-low">
                    Simulated oracle check against a sample registry — try{' '}
                    <span className="text-white">MH-PUN-10231</span> or{' '}
                    <span className="text-white">KA-BLR-20558</span> to see a verified listing, or anything else to
                    see a rejection.
                  </p>
                  {status === 'error' && <p className="font-mono text-[11px] text-silver-low">{message}</p>}
                  <button type="submit" disabled={status === 'submitting'} className="btn-silver mt-2 disabled:opacity-50">
                    {status === 'submitting' ? 'Verifying Title…' : 'Submit for Verification'}
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="mono-label">Mark Roads / Common Area</p>
                  <p className="font-mono text-[10px] leading-relaxed text-silver-low">
                    Click cells that overlap roads, setbacks, or shared area — those chunks won't be sellable.
                  </p>
                  {rows > 0 && cols > 0 ? (
                    <div
                      className="hairline grid gap-0.5 rounded-lg border p-1"
                      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                    >
                      {gridCells.map(({ r, c }) => {
                        const key = `${r}-${c}`
                        const isExcluded = excluded.has(key)
                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => toggleCell(r, c)}
                            className={`aspect-square rounded-sm transition-colors ${
                              isExcluded ? 'bg-black/60 border border-dashed border-white/20' : 'bg-white/10 hover:bg-white/20'
                            }`}
                            title={isExcluded ? 'Road / common area' : 'Sellable'}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <p className="font-mono text-[11px] text-silver-low">Set grid rows/columns to preview.</p>
                  )}

                  <div className="hairline mt-2 flex flex-col gap-2 rounded-lg border p-3 font-mono text-[11px] text-silver-low">
                    <span>{sellableCount} sellable chunks</span>
                    {sqFtPerChunk > 0 && <span className="text-white">≈ {sqFtPerChunk.toFixed(0)} sqft / chunk</span>}
                    {pricePerChunk > 0 && <span className="text-white">≈ ₹{pricePerChunk.toFixed(0)} / chunk</span>}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  )
}
