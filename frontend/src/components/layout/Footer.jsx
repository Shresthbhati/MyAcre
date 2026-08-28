import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="hairline border-t py-16">
      <div className="container-fluid flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-white">MyAcre</p>
          <p className="mt-3 max-w-xs font-sans text-sm font-light text-silver-low">
            Fractional real estate ownership, verified on-chain. Built for Smart India Hackathon 2026.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div>
            <p className="mono-label">Product</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link to="/browse" className="text-sm text-silver-low hover:text-white">Explore</Link>
              <Link to="/sell" className="text-sm text-silver-low hover:text-white">Sell &amp; tokenize</Link>
              <Link to="/dashboard" className="text-sm text-silver-low hover:text-white">Dashboard</Link>
            </div>
          </div>
          <div>
            <p className="mono-label">Account</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link to="/login" className="text-sm text-silver-low hover:text-white">Log in</Link>
              <Link to="/register" className="text-sm text-silver-low hover:text-white">Register</Link>
              <Link to="/kyc" className="text-sm text-silver-low hover:text-white">Verify KYC</Link>
            </div>
          </div>
          <div>
            <p className="mono-label">Info</p>
            <div className="mt-4 flex flex-col gap-2">
              <span className="text-sm text-silver-low">SIH26204 · CodeCrafters</span>
              <span className="text-sm text-silver-low">Built on Polygon</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid mt-12 flex flex-col-reverse items-start gap-4 border-t pt-6 hairline md:flex-row md:items-center md:justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-silver-low">
          © 2026 MyAcre. All rights reserved.
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-silver-low">
          Est. 2026 / Beta Access
        </span>
      </div>
    </footer>
  )
}
