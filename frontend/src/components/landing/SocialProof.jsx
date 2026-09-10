import Reveal from '../ui/Reveal'
import AvatarStack from '../ui/AvatarStack'
import CountdownTimer from './CountdownTimer'

export default function SocialProof() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-fluid flex flex-col items-center gap-12">
        <Reveal>
          <CountdownTimer />
        </Reveal>
        <Reveal delay={150} className="flex flex-col items-center gap-3">
          <AvatarStack />
          <p className="mono-label">Beta cohort opening in select cities</p>
        </Reveal>
      </div>
    </section>
  )
}
