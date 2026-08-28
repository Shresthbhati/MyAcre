import Reveal from '../ui/Reveal'

const FEATURES = [
  {
    index: '01',
    tag: 'Fractional',
    title: 'Buy the Slice.',
    body: 'A ₹1 crore property splits into 10,000 tokens. Own exactly the share you can afford, starting at ₹1,000.',
  },
  {
    index: '02',
    tag: 'Verified',
    title: 'Title, Checked.',
    body: 'Every listing clears an on-chain oracle check against registry records before a single token is minted.',
  },
  {
    index: '03',
    tag: 'Atomic',
    title: 'No Double-Sales.',
    body: 'Smart contracts settle payment and ownership in a single atomic transaction — no brokers, no race conditions.',
  },
  {
    index: '04',
    tag: 'Immutable',
    title: 'Written, Forever.',
    body: 'Every transfer is recorded permanently on Polygon — public, tamper-proof, and instantly verifiable.',
  },
]

export default function BentoGrid() {
  return (
    <section id="how-it-works" className="py-24 md:py-32">
      <div className="container-fluid">
        <Reveal>
          <p className="mono-label mb-4 text-center">How It Works</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mb-16 text-center font-display text-4xl italic md:text-6xl">
            Ownership, <span className="text-gradient-silver">re-engineered.</span>
          </h2>
        </Reveal>

        <div className="hairline grid grid-cols-1 border-l border-t md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.index} delay={i * 100} className="hairline border-b border-r">
              <div className="bento-card h-full">
                <p className="mono-label">
                  {f.index} / {f.tag}
                </p>
                <h3 className="mt-6 font-display text-3xl italic text-white">{f.title}</h3>
                <p className="mt-4 font-sans text-sm font-light leading-relaxed text-silver-low">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
