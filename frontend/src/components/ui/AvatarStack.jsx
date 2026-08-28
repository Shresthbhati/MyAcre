const NAMES = ['AR', 'SK', 'PJ', 'MN', 'RV']
const HUES = [210, 260, 20, 160, 320]

export default function AvatarStack() {
  return (
    <div className="flex items-center justify-center -space-x-3">
      {NAMES.map((initials, i) => (
        <div
          key={initials}
          className="hairline flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[9px] text-white grayscale"
          style={{
            background: `hsl(${HUES[i]}, 12%, 22%)`,
            zIndex: NAMES.length - i,
          }}
        >
          {initials}
        </div>
      ))}
    </div>
  )
}
