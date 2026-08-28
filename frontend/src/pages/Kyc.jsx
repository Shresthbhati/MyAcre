import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'

// Simulated KYC: a real Aadhaar/PAN check is out of scope for the hackathon demo.
// PAN format (5 letters, 4 digits, 1 letter) is used as a rule-based stand-in —
// anything else is treated as a failed verification, matching the KYC decision
// branch in the product's user flow.
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/

export default function Kyc() {
  const navigate = useNavigate()
  const [pan, setPan] = useState('')
  const [status, setStatus] = useState('idle') // idle | checking | verified | rejected

  const handleSubmit = (e) => {
    e.preventDefault()
    setStatus('checking')
    setTimeout(() => {
      setStatus(PAN_PATTERN.test(pan.trim().toUpperCase()) ? 'verified' : 'rejected')
    }, 1200)
  }

  return (
    <PageShell>
      <section className="flex min-h-[70vh] items-center justify-center py-20">
        <div className="container-fluid flex justify-center">
          <div className="glass w-full max-w-md rounded-[2rem] p-8 text-center md:p-12">
            <p className="mono-label mb-4">Identity Verification</p>
            <h1 className="mb-8 font-display text-4xl italic">
              Verify Your <span className="text-gradient-silver">KYC.</span>
            </h1>

            {status !== 'verified' && status !== 'rejected' && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
                <label className="mono-label" htmlFor="pan">
                  PAN Number
                </label>
                <input
                  id="pan"
                  required
                  placeholder="ABCDE1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-widest text-white placeholder:text-silver-low placeholder:tracking-normal focus:outline-none"
                />
                <p className="font-mono text-[10px] leading-relaxed text-silver-low">
                  Simulated check for the demo — real verification is not connected to UIDAI.
                </p>
                <button type="submit" disabled={status === 'checking'} className="btn-silver mt-2 disabled:opacity-50">
                  {status === 'checking' ? 'Verifying…' : 'Submit for Verification'}
                </button>
              </form>
            )}

            {status === 'verified' && (
              <div className="flex flex-col items-center gap-4">
                <p className="font-mono text-sm uppercase tracking-widest text-white">✓ Verified</p>
                <p className="font-sans text-sm font-light text-silver-low">
                  Your identity has been verified. You can now browse, buy, and sell property tokens.
                </p>
                <button onClick={() => navigate('/dashboard')} className="btn-silver mt-2">
                  Go to Dashboard
                </button>
              </div>
            )}

            {status === 'rejected' && (
              <div className="flex flex-col items-center gap-4">
                <p className="font-mono text-sm uppercase tracking-widest text-white">Pending / Rejected</p>
                <p className="font-sans text-sm font-light text-silver-low">
                  We could not verify that PAN format. Double-check the number and try again.
                </p>
                <button onClick={() => setStatus('idle')} className="btn-ghost mt-2">
                  Try Again
                </button>
              </div>
            )}

            <p className="mono-label mt-10">
              <Link to="/dashboard" className="text-white underline underline-offset-4">
                Skip for now
              </Link>
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
