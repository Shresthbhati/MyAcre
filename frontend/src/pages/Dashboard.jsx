import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import ListingThumb from '../components/ui/ListingThumb'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatINR } from '../lib/format'
import { txUrl } from '../lib/chain'

export default function Dashboard() {
  const { user, getToken } = useAuth()
  const [holdings, setHoldings] = useState([])
  const [transactions, setTransactions] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    if (!user) {
      setStatus('ready')
      return
    }
    getToken()
      .then((token) => Promise.all([api.getMyHoldings(token), api.getMyTransactions(token)]))
      .then(([h, t]) => {
        setHoldings(h)
        setTransactions(t)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
          <p className="mono-label">Dashboard</p>
          <h1 className="font-display text-3xl italic">Log in to see your portfolio.</h1>
          <Link to="/login" className="btn-silver">
            Log In
          </Link>
        </div>
      </PageShell>
    )
  }

  const portfolioValue = holdings.reduce(
    (sum, h) => sum + Number(h.listing.pricePerSqFt) * h.sqFtOwned,
    0,
  )

  return (
    <PageShell>
      <section className="py-16 md:py-20">
        <div className="container-fluid">
          <p className="mono-label mb-4 text-center">Dashboard</p>
          <h1 className="mb-4 text-center font-display text-4xl italic md:text-6xl">
            Your <span className="text-gradient-silver">Portfolio.</span>
          </h1>
          <p className="mono-label mb-12 text-center">Portfolio value: {formatINR(portfolioValue)}</p>

          {status === 'loading' && <p className="mono-label text-center">Loading…</p>}
          {status === 'error' && <p className="mono-label text-center">Could not reach the backend.</p>}

          {status === 'ready' && holdings.length === 0 && (
            <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
              <p className="font-sans text-sm font-light text-silver-low">
                You don't own any tokens yet.
              </p>
              <Link to="/browse" className="btn-silver mt-4 inline-flex">
                Browse Properties
              </Link>
            </div>
          )}

          {status === 'ready' && holdings.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {holdings.map((h) => (
                  <Link
                    key={h.id}
                    to={`/browse/${h.listing.id}`}
                    className="glass overflow-hidden rounded-2xl transition-all duration-300 hover:border-white/20"
                  >
                    <ListingThumb seed={h.listing.imageSeed} className="h-32 w-full" />
                    <div className="p-6">
                      <p className="mono-label">{h.listing.city}</p>
                      <h3 className="mt-2 font-display text-xl italic text-white">{h.listing.title}</h3>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm text-white">{h.sqFtOwned.toFixed(0)} sqft</p>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-silver-low">
                            {h.plotCount} chunk{h.plotCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <p className="font-mono text-sm text-white">
                          {formatINR(Number(h.listing.pricePerSqFt) * h.sqFtOwned)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-16">
                <p className="mono-label mb-4">Transaction History</p>
                <div className="hairline overflow-hidden rounded-2xl border">
                  {transactions.map((t) => (
                    <div
                      key={t.id}
                      className="hairline flex items-center justify-between border-b p-4 font-mono text-xs last:border-b-0"
                    >
                      <span className="text-white">{t.listing.title}</span>
                      <span className="text-silver-low">{t.sqFt.toFixed(0)} sqft</span>
                      <span className="text-silver-low uppercase">{t.paymentMethod}</span>
                      <span className="text-white">{formatINR(t.amount)}</span>
                      {t.txHash ? (
                        <a
                          href={txUrl(t.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-silver-low underline underline-offset-2 hover:text-white"
                        >
                          on-chain ↗
                        </a>
                      ) : (
                        <span className="text-silver-low/40">off-chain</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </PageShell>
  )
}
