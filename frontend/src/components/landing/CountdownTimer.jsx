import { useEffect, useState } from 'react'

const TARGET = Date.now() + 12 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 58 * 60 * 1000

function getRemaining() {
  const diff = Math.max(0, TARGET - Date.now())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  return { days, hours, minutes }
}

function Unit({ value }) {
  return (
    <div className="font-display text-6xl text-white/90 md:text-[100px]">
      {String(value).padStart(2, '0')}
    </div>
  )
}

export default function CountdownTimer() {
  const [remaining, setRemaining] = useState(getRemaining)

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="text-center">
      <p className="mono-label mb-6">Next property drop dispatching in</p>
      <div className="flex items-center justify-center gap-4 md:gap-8">
        <Unit value={remaining.days} />
        <span className="font-display text-4xl text-white/10 md:text-6xl">/</span>
        <Unit value={remaining.hours} />
        <span className="font-display text-4xl text-white/10 md:text-6xl">/</span>
        <Unit value={remaining.minutes} />
      </div>
    </div>
  )
}
