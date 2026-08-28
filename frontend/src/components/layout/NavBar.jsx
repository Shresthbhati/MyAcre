import { useState } from 'react'
import { Link } from 'react-router-dom'

const LINKS = [
  { label: 'Explore', to: '/browse' },
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'Sell', to: '/sell' },
  { label: 'Contact', to: '/#contact' },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="relative z-20 pt-8">
      <div className="container-fluid flex items-center justify-between">
        <Link to="/" className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-white">
          MyAcre
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.to}
              className="rounded-lg border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-silver transition-colors duration-300 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              {link.label}
            </a>
          ))}
          <Link to="/register" className="btn-silver ml-2">
            Join Beta
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="hairline flex h-10 w-10 items-center justify-center rounded-lg border md:hidden"
          style={{ background: 'rgba(255,255,255,0.05)' }}
          aria-label="Toggle menu"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-white">
            {open ? 'x' : '='}
          </span>
        </button>
      </div>

      {open && (
        <div className="container-fluid mt-4 flex flex-col gap-2 md:hidden">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.to}
              onClick={() => setOpen(false)}
              className="hairline rounded-lg border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-silver"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {link.label}
            </a>
          ))}
          <Link to="/register" onClick={() => setOpen(false)} className="btn-silver mt-2">
            Join Beta
          </Link>
        </div>
      )}
    </header>
  )
}
