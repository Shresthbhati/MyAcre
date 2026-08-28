import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import GoogleButton from '../components/ui/GoogleButton'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, loginWithGoogle, isFirebaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setError('')
    try {
      await register(form.email, form.password)
      navigate('/kyc')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  const handleGoogle = async () => {
    setStatus('loading')
    setError('')
    try {
      await loginWithGoogle()
      navigate('/kyc')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  return (
    <PageShell>
      <section className="flex min-h-[70vh] items-center justify-center py-20">
        <div className="container-fluid flex justify-center">
          <div className="glass w-full max-w-md rounded-[2rem] p-8 md:p-12">
            <p className="mono-label mb-4 text-center">Beta Access</p>
            <h1 className="mb-8 text-center font-display text-4xl italic">
              Join <span className="text-gradient-silver">MyAcre.</span>
            </h1>

            {!isFirebaseConfigured && (
              <p className="mono-label mb-6 rounded-lg border px-4 py-3 text-center hairline">
                Firebase keys are not connected yet — registration will work once they are added.
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                name="name"
                required
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
                className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
              />
              <input
                type="email"
                name="email"
                required
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
              />
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
              />
              {error && <p className="font-mono text-[11px] text-silver-low">{error}</p>}
              <button type="submit" disabled={status === 'loading'} className="btn-silver mt-2 disabled:opacity-50">
                {status === 'loading' ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <span className="hairline h-px flex-1 border-t" />
              <span className="mono-label">Or</span>
              <span className="hairline h-px flex-1 border-t" />
            </div>

            <GoogleButton onClick={handleGoogle} disabled={status === 'loading'}>
              Continue with Google
            </GoogleButton>

            <p className="mono-label mt-8 text-center">
              Already registered?{' '}
              <Link to="/login" className="text-white underline underline-offset-4">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
