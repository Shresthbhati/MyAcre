import Reveal from '../ui/Reveal'

const QUOTES = [
  {
    quote:
      '"Finally, a way into property that does not start at a crore. I bought my first tokens for less than a phone."',
    name: 'Anjali Rao',
    role: 'Early Beta Investor',
  },
  {
    quote:
      '“The title check happening before minting is the part that got our legal team comfortable. No shortcuts on verification.”',
    name: 'Suresh Kamath',
    role: 'Property Owner, Listed Beta',
  },
]

export default function Testimonials() {
  return (
    <section className="border-y py-24 hairline md:py-32" style={{ background: 'rgba(255,255,255,0.01)' }}>
      <div className="container-fluid">
        <Reveal>
          <h2 className="mb-20 text-center font-display text-4xl italic md:text-6xl">
            Testimonials of <span className="text-gradient-silver">Trust.</span>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
          {QUOTES.map((q, i) => (
            <Reveal key={q.name} delay={i * 120} className="border-l pl-8 hairline md:pl-16">
              <p className="font-display text-2xl italic leading-snug text-white md:text-3xl">
                {q.quote}
              </p>
              <div className="mt-8">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-white">
                  {q.name}
                </p>
                <p className="mono-label mt-1">{q.role}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
