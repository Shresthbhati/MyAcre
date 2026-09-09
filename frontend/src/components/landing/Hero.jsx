export default function Hero() {
  return (
    <section className="relative pb-16 pt-12 md:pb-32 md:pt-20">
      <div className="container-fluid">
        <div className="glass animate-fade-in rounded-[2rem] px-6 py-16 text-center md:rounded-[4rem] md:px-12 md:py-28">
          <p className="mono-label animate-slide-up mb-6" style={{ animationDelay: '100ms' }}>
            Blockchain Real Estate · Verified Property Infrastructure
          </p>

          <h1
            className="animate-slide-up font-display italic leading-[0.85] tracking-tighter"
            style={{ fontSize: 'clamp(48px, 12vw, 160px)', animationDelay: '200ms' }}
          >
            <span className="block text-white">My</span>
            <span className="text-gradient-silver block">Acre.</span>
          </h1>

          <p
            className="animate-slide-up mx-auto mt-8 max-w-xl font-display text-xl italic text-silver-low md:text-2xl"
            style={{ animationDelay: '350ms' }}
          >
            Own a verifiable share of real property — starting at ₹1,000, not ₹1 crore.
          </p>

          <div
            className="animate-slide-up mt-10 flex flex-wrap items-center justify-center gap-4"
            style={{ animationDelay: '450ms' }}
          >
            <a href="/register" className="btn-silver">
              Join Beta
            </a>
            <a href="/browse" className="btn-ghost">
              Explore Properties
            </a>
          </div>

          <div
            className="animate-slide-up hairline mt-16 grid grid-cols-1 gap-6 border-t pt-8 text-left sm:grid-cols-3"
            style={{ animationDelay: '600ms' }}
          >
            <div>
              <p className="mono-label">Est. 2026</p>
              <p className="mt-1 font-mono text-xs text-silver">Beta Access</p>
            </div>
            <div className="sm:text-center">
              <p className="font-display italic text-silver">
                Fractional tokens, minted and transferred atomically on Polygon.
              </p>
            </div>
            <div className="sm:text-right">
              <p className="mono-label">Limited Cities</p>
              <p className="mt-1 font-mono text-xs text-silver">India / Testnet</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
