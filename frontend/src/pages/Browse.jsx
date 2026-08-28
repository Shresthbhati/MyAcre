import PageShell from '../components/layout/PageShell'
import ComingSoon from '../components/ui/ComingSoon'

export default function Browse() {
  return (
    <PageShell>
      <ComingSoon
        eyebrow="Browse & Buy"
        title="Map View."
        description="Property locations, available chunks, and mock checkout will land here — sample dataset first, live sync after."
        phase="Roadmap Phase 5"
      />
    </PageShell>
  )
}
