import PageShell from '../components/layout/PageShell'
import ComingSoon from '../components/ui/ComingSoon'

export default function NotFound() {
  return (
    <PageShell>
      <ComingSoon eyebrow="404" title="Off the Map." description="This page does not exist yet." />
    </PageShell>
  )
}
