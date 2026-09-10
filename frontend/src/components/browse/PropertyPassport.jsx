import { formatINR } from '../../lib/format'
import { txUrl } from '../../lib/chain'

const STATUS_COLOR = {
  VERIFIED: 'text-emerald-400',
  PENDING: 'text-amber-400',
  FLAGGED: 'text-red-400',
  PARTIALLY_VERIFIED: 'text-amber-400',
  REJECTED: 'text-red-400',
  EXPIRED: 'text-red-400',
}

export default function PropertyPassport({ passport }) {
  if (!passport) return null

  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mono-label mb-1">Property Passport</p>
          <p className="font-mono text-xs text-silver-low">{passport.assetId}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl italic text-white">{passport.trustScore}</p>
          <p className="mono-label">Trust Score / 100</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {passport.checks.map((c) => (
          <div key={c.check} className="hairline rounded-xl border p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="mono-label">{c.check.replace(/_/g, ' ')}</p>
              <p className={`font-mono text-[10px] uppercase tracking-widest ${STATUS_COLOR[c.status] || 'text-silver-low'}`}>
                {c.status}
              </p>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-silver-low">{c.explanation}</p>
            <p className="mt-2 font-mono text-[10px] text-silver-low/60">via {c.provider}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="hairline rounded-xl border p-4">
          <p className="mono-label mb-2">Geometry</p>
          <p className="font-mono text-[11px] leading-relaxed text-silver-low">{passport.geometry.note}</p>
          <p className="mt-2 font-mono text-[10px] text-silver-low/60">
            {passport.geometry.gridRows}×{passport.geometry.gridCols} grid · {passport.geometry.excludedCells} excluded cells
          </p>
        </div>
        <div className="hairline rounded-xl border p-4">
          <p className="mono-label mb-2">Blockchain</p>
          {passport.ownership.tokenized ? (
            <>
              <p className="font-mono text-[11px] text-emerald-400">Tokenized on-chain</p>
              <a
                href={txUrl(passport.ownership.onChainTxHash)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate font-mono text-[10px] text-silver-low underline underline-offset-2 hover:text-white"
              >
                {passport.ownership.onChainTxHash}
              </a>
            </>
          ) : (
            <p className="font-mono text-[11px] text-amber-400">Not yet tokenized on-chain</p>
          )}
        </div>
      </div>

      {passport.recentTransactions.length > 0 && (
        <div>
          <p className="mono-label mb-3">Transaction History</p>
          <div className="flex flex-col gap-2">
            {passport.recentTransactions.map((t) => (
              <div key={t.id} className="hairline flex items-center justify-between border-b pb-2 font-mono text-[11px] last:border-0">
                <span className="text-silver-low">
                  {Number(t.sqFt).toFixed(0)} sqft · {formatINR(t.amount)}
                </span>
                <span className="text-silver-low/60">{new Date(t.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="hairline mt-6 rounded-lg border p-3 font-mono text-[10px] leading-relaxed text-silver-low">
        This passport reflects MyAcre's <span className="text-white">demo verification checks</span> — a simulated
        registry match, geometry consistency, and a trend-based valuation model — not a real government land-registry
        or KYC integration. A blockchain token here is a <span className="text-white">fractional digital representation</span>{' '}
        of economic interest, not legal title. See docs/LEGAL_MODEL.md.
      </p>
    </div>
  )
}
