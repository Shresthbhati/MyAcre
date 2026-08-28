import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../firebase/config'
import { api } from '../lib/api'

const googleProvider = new GoogleAuthProvider()

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      if (firebaseUser) {
        // Best-effort: creates/updates the off-chain user row on the backend.
        // Silently ignored if the backend isn't running yet.
        try {
          const token = await firebaseUser.getIdToken()
          await api.syncUser(token)
        } catch {
          // backend not reachable — non-fatal, frontend still works
        }
      }
    })
    return unsubscribe
  }, [])

  const getToken = () => {
    if (!auth.currentUser) return Promise.reject(new Error('Not logged in'))
    return auth.currentUser.getIdToken()
  }

  const register = (email, password) => {
    if (!isFirebaseConfigured) {
      return Promise.reject(
        new Error('Firebase is not configured yet — add your API keys to frontend/.env.local'),
      )
    }
    return createUserWithEmailAndPassword(auth, email, password)
  }

  const login = (email, password) => {
    if (!isFirebaseConfigured) {
      return Promise.reject(
        new Error('Firebase is not configured yet — add your API keys to frontend/.env.local'),
      )
    }
    return signInWithEmailAndPassword(auth, email, password)
  }

  const loginWithGoogle = () => {
    if (!isFirebaseConfigured) {
      return Promise.reject(
        new Error('Firebase is not configured yet — add your API keys to frontend/.env.local'),
      )
    }
    return signInWithPopup(auth, googleProvider)
  }

  const logout = () => (isFirebaseConfigured ? signOut(auth) : Promise.resolve())

  return (
    <AuthContext.Provider
      value={{ user, loading, register, login, loginWithGoogle, logout, getToken, isFirebaseConfigured }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
