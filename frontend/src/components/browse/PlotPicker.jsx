import { useState } from 'react'
import { formatINR } from '../../lib/format'

// Lets a buyer take less than a whole chunk — the big grid cells stay as
// they are on the map, but within one cell you can dial in exactly how
// much sqft you want instead of being forced to buy the entire chunk.
export default function PlotPicker({ plot, pricePerSqFt, existingInCart = 0, onConfirm, onCancel }) {
  const remaining = Math.max(0, plot.totalSqFt - plot.soldSqFt - existingInCart)
  const [sqFt, setSqFt] = useState(remaining)

  const price = sqFt * pricePerSqFt

  return (
    <div className="hairline rounded-xl border p-4">
      <p className="mono-label mb-1">
        Chunk R{plot.row + 1}C{plot.col + 1}
      </p>
      <p className="font-mono text-[11px] text-silver-low">{remaining.toFixed(0)} sqft available in this chunk</p>

      <input
        type="range"
        min={remaining > 0 ? Math.min(10, remaining) : 0}
        max={remaining}
        step={remaining > 50 ? 5 : 1}
        value={sqFt}
        onChange={(e) => setSqFt(Number(e.target.value))}
        className="mt-3 w-full accent-white"
      />

      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={remaining}
          value={Math.round(sqFt)}
          onChange={(e) => setSqFt(Math.min(remaining, Math.max(0, Number(e.target.value))))}
          className="hairline w-24 rounded-lg border bg-transparent px-2 py-1 font-mono text-xs text-white focus:outline-none"
        />
        <span className="font-mono text-[10px] uppercase tracking-widest text-silver-low">sqft</span>
        <button
          type="button"
          onClick={() => setSqFt(remaining)}
          className="ml-auto font-mono text-[10px] uppercase tracking-widest text-white underline underline-offset-4"
        >
          Full chunk
        </button>
      </div>

      <p className="mt-3 font-mono text-sm text-white">{formatINR(price)}</p>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">
          Cancel
        </button>
        <button
          type="button"
          disabled={sqFt <= 0}
          onClick={() => onConfirm(sqFt)}
          className="btn-silver flex-1 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}
