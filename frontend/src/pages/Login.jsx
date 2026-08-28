import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, isFirebaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setError('')
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
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
            <p className="mono-label mb-4 text-center">Welcome Back</p>
            <h1 className="mb-8 text-center font-display text-4xl italic">
              Log In to <span className="text-gradient-silver">MyAcre.</span>
            </h1>

            {!isFirebaseConfigured && (
              <p className="mono-label mb-6 rounded-lg border px-4 py-3 text-center hairline">
                Firebase keys are not connected yet — login will work once they are added.
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="hairline rounded-xl border bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
              />
              {error && <p className="font-mono text-[11px] text-silver-low">{error}</p>}
              <button type="submit" disabled={status === 'loading'} className="btn-silver mt-2 disabled:opacity-50">
                {status === 'loading' ? 'Logging in…' : 'Log In'}
              </button>
            </form>

            <p className="mono-label mt-8 text-center">
              No account?{' '}
              <Link to="/register" className="text-white underline underline-offset-4">
                Join the beta
              </Link>
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
