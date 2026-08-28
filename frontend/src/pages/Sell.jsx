import PageShell from '../components/layout/PageShell'
import ComingSoon from '../components/ui/ComingSoon'

export default function Sell() {
  return (
    <PageShell>
      <ComingSoon
        eyebrow="Sell & Tokenize"
        title="List a Property."
        description="Owners will submit property details here, run them through the oracle title check, and mint chunks on approval."
        phase="Roadmap Phase 4"
      />
    </PageShell>
  )
}
