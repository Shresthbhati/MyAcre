// No real property photography for the demo dataset — a deterministic silver
// gradient (seeded from the listing title) stands in for a cover image.
function hashSeed(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360
  }
  return hash
}

export default function ListingThumb({ seed, className = '' }) {
  const hue = hashSeed(seed || 'myacre')
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 8%, 14%) 0%, hsl(${hue}, 4%, 6%) 60%, #080808 100%)`,
      }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-20" preserveAspectRatio="none">
        <defs>
          <pattern id={`grid-${hue}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${hue})`} />
      </svg>
    </div>
  )
}
