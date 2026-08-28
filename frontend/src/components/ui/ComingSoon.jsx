import { Link } from 'react-router-dom'

export default function ComingSoon({ eyebrow, title, description, phase }) {
  return (
    <section className="flex min-h-[70vh] items-center justify-center py-20">
      <div className="container-fluid flex justify-center">
        <div className="glass w-full max-w-lg rounded-[2rem] p-10 text-center md:p-14">
          <p className="mono-label mb-4">{eyebrow}</p>
          <h1 className="mb-6 font-display text-4xl italic md:text-5xl">
            <span className="text-gradient-silver">{title}</span>
          </h1>
          <p className="font-sans text-sm font-light leading-relaxed text-silver-low">{description}</p>
          {phase && <p className="mono-label mt-8">{phase}</p>}
          <Link to="/" className="btn-ghost mt-10 inline-flex">
            Back to Home
          </Link>
        </div>
      </div>
    </section>
  )
}
