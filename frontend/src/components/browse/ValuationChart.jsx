import { useMemo, useState } from 'react'
import { formatINR } from '../../lib/format'

const WIDTH = 640
const HEIGHT = 220
const PAD = { top: 16, right: 16, bottom: 28, left: 16 }

export default function ValuationChart({ valuation }) {
  const [hoverIndex, setHoverIndex] = useState(null)

  const { history, listingPricePerSqFt, cagrPercent, projectedNextPrice, label, deviationPercent } = valuation

  const { points, minY, maxY, path } = useMemo(() => {
    if (!history.length) return { points: [], minY: 0, maxY: 1, path: '' }

    const values = history.map((h) => h.pricePerSqFt).concat([listingPricePerSqFt])
    const minY = Math.min(...values) * 0.95
    const maxY = Math.max(...values) * 1.05

    const innerW = WIDTH - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom

    const pts = history.map((h, i) => {
      const x = PAD.left + (i / (history.length - 1 || 1)) * innerW
      const y = PAD.top + innerH - ((h.pricePerSqFt - minY) / (maxY - minY || 1)) * innerH
      return { x, y, ...h }
    })

    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

    return { points: pts, minY, maxY, path }
  }, [history, listingPricePerSqFt])

  if (!history.length) return null

  const listingY =
    PAD.top + (HEIGHT - PAD.top - PAD.bottom) - ((listingPricePerSqFt - minY) / (maxY - minY || 1)) * (HEIGHT - PAD.top - PAD.bottom)

  const hovered = hoverIndex != null ? points[hoverIndex] : null

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH
    let nearest = 0
    let bestDist = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x)
      if (d < bestDist) {
        bestDist = d
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  const trendLabel = cagrPercent >= 0 ? `+${cagrPercent}% / yr` : `${cagrPercent}% / yr`

  const DEVIATION_COPY = {
    NEAR_MODEL: { text: 'Near model estimate', className: 'text-silver-low' },
    BELOW_MODEL: { text: 'Below model estimate', className: 'text-emerald-400' },
    ABOVE_MODEL: { text: 'Above model estimate', className: 'text-amber-400' },
    HIGH_ANOMALY: { text: 'Far above model estimate', className: 'text-red-400' },
  }
  const deviationBadge = DEVIATION_COPY[label]

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="mono-label">Price/sqft trend · {history[0].period}–{history[history.length - 1].period}</p>
        <p className="font-mono text-[11px] text-silver-low">
          Area trend {trendLabel} · next quarter ≈ {formatINR(projectedNextPrice)}
        </p>
      </div>

      {deviationBadge && (
        <p className={`mb-3 font-mono text-[11px] ${deviationBadge.className}`}>
          {deviationBadge.text}
          {deviationPercent != null && ` (${deviationPercent > 0 ? '+' : ''}${deviationPercent}%)`} — this listing's
          price/sqft vs. the area trend model, an indicative estimate, not a guaranteed valuation.
        </p>
      )}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* recessive gridlines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={PAD.top + f * (HEIGHT - PAD.top - PAD.bottom)}
            y2={PAD.top + f * (HEIGHT - PAD.top - PAD.bottom)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}

        {/* listing price reference line */}
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={listingY}
          y2={listingY}
          stroke="rgba(148,163,184,0.6)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text x={WIDTH - PAD.right} y={listingY - 6} textAnchor="end" className="fill-silver-low" fontSize="9" fontFamily="var(--font-mono)">
          this listing
        </text>

        <path d={path} fill="none" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {hovered && (
          <>
            <line x1={hovered.x} x2={hovered.x} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx={hovered.x} cy={hovered.y} r="4" fill="#f8fafc" />
          </>
        )}
      </svg>

      {hovered ? (
        <p className="mt-2 font-mono text-[11px] text-white">
          {hovered.period} · {formatINR(hovered.pricePerSqFt)}/sqft
        </p>
      ) : (
        <p className="mt-2 font-mono text-[11px] text-silver-low">Hover the chart to inspect a quarter.</p>
      )}
    </div>
  )
}
