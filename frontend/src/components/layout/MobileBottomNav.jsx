import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const ITEMS = [
  { label: 'Explore', to: '/browse', icon: '◈' },
  { label: 'Sell', to: '/sell', icon: '△' },
  { label: 'Join', to: '/register', icon: '⬤', primary: true },
  { label: 'Dashboard', to: '/dashboard', icon: '■' },
  { label: 'Login', to: '/login', icon: '●' },
]

export default function MobileBottomNav() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border px-2 py-2 transition-all duration-500 md:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-32 opacity-0'
      }`}
      style={{
        background: 'rgba(8,8,8,0.85)',
        backdropFilter: 'blur(24px)',
        borderColor: 'rgba(255,255,255,0.1)',
        transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {ITEMS.map((item) =>
        item.primary ? (
          <Link
            key={item.label}
            to={item.to}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black"
          >
            <span className="text-sm">{item.icon}</span>
          </Link>
        ) : (
          <Link
            key={item.label}
            to={item.to}
            className="flex flex-col items-center gap-1 rounded-full px-3 py-1.5 text-silver-low"
          >
            <span className="text-xs">{item.icon}</span>
            <span className="font-mono text-[8px] uppercase tracking-widest">{item.label}</span>
          </Link>
        ),
      )}
    </nav>
  )
}
