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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

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
      value={{ user, loading, register, login, loginWithGoogle, logout, isFirebaseConfigured }}
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
