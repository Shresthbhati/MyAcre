import NavBar from './NavBar'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import NoiseOverlay from '../ui/NoiseOverlay'

export default function PageShell({ children }) {
  return (
    <div className="relative min-h-screen bg-obsidian">
      <NoiseOverlay />
      <div className="relative z-20">
        <NavBar />
        <main>{children}</main>
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  )
}
