export default function SqFtBar({ soldSqFt, availableSqFt, excludedSqFt = 0 }) {
  const total = soldSqFt + availableSqFt + excludedSqFt || 1
  const soldPct = (soldSqFt / total) * 100
  const availablePct = (availableSqFt / total) * 100
  const excludedPct = (excludedSqFt / total) * 100

  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {soldPct > 0 && <div style={{ width: `${soldPct}%` }} className="bg-zinc-600" />}
        {availablePct > 0 && <div style={{ width: `${availablePct}%` }} className="bg-white" />}
        {excludedPct > 0 && <div style={{ width: `${excludedPct}%` }} className="bg-zinc-800" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-silver-low">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white" /> Available · {availableSqFt.toFixed(0)} sqft
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-600" /> Sold · {soldSqFt.toFixed(0)} sqft
        </span>
        {excludedSqFt > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-800" /> Road/common · {excludedSqFt.toFixed(0)} sqft
          </span>
        )}
      </div>
    </div>
  )
}
