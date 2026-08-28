import { useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../../firebase/config'

export default function CaptureForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return

    if (!isFirebaseConfigured) {
      setStatus('error')
      setMessage('Beta signups open once Firebase is connected — check back soon.')
      return
    }

    setStatus('loading')
    try {
      await addDoc(collection(db, 'waitlist'), { email, createdAt: new Date().toISOString() })
      setStatus('success')
      setMessage("You're on the list.")
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Something went wrong — try again.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl text-center">
      <form onSubmit={handleSubmit} className="glass flex flex-col gap-3 rounded-2xl p-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your work email"
          className="w-full flex-1 bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-silver-low focus:outline-none"
        />
        <button type="submit" disabled={status === 'loading'} className="btn-silver rounded-xl disabled:opacity-50">
          {status === 'loading' ? 'Joining…' : 'Join Beta'}
        </button>
      </form>

      {message && (
        <p className={`mt-3 font-mono text-[11px] ${status === 'error' ? 'text-silver-low' : 'text-white'}`}>
          {message}
        </p>
      )}

      <p className="mono-label mt-6">Free access · No credit card · Immediate value</p>
    </div>
  )
}
