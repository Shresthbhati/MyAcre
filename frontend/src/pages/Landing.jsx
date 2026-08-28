import PageShell from '../components/layout/PageShell'
import Hero from '../components/landing/Hero'
import SocialProof from '../components/landing/SocialProof'
import BentoGrid from '../components/landing/BentoGrid'
import Testimonials from '../components/landing/Testimonials'
import FinalCTA from '../components/landing/FinalCTA'

export default function Landing() {
  return (
    <PageShell>
      <Hero />
      <SocialProof />
      <BentoGrid />
      <Testimonials />
      <FinalCTA />
    </PageShell>
  )
}
