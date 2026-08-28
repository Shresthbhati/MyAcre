import PageShell from '../components/layout/PageShell'
import ComingSoon from '../components/ui/ComingSoon'

export default function Dashboard() {
  return (
    <PageShell>
      <ComingSoon
        eyebrow="Dashboard"
        title="Your Portfolio."
        description="Owned tokens, pending transactions, and sync status will live here once the backend and blockchain layers are wired up."
        phase="Roadmap Phase 2 & 6"
      />
    </PageShell>
  )
}
