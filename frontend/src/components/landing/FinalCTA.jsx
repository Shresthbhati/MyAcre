import Reveal from '../ui/Reveal'
import CaptureForm from './CaptureForm'

export default function FinalCTA() {
  return (
    <section id="contact" className="py-24 md:py-32">
      <div className="container-fluid">
        <div className="glass rounded-[2rem] px-6 py-16 text-center md:rounded-[4rem] md:px-12 md:py-24">
          <Reveal>
            <h2 className="mb-6 font-display text-4xl italic md:text-6xl">
              Land ownership, <span className="text-gradient-silver">rebuilt for everyone.</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mx-auto mb-12 max-w-lg font-sans text-base font-light text-silver-low">
              Join the beta cohort and be first to invest when the next property drops.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <CaptureForm />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
