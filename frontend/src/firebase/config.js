import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Lets the app boot even before real keys are added — auth/firestore calls
// will fail gracefully at call time instead of crashing at import time.
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey)

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

// getAuth/getFirestore validate the config eagerly and throw on a missing/invalid
// API key, which would otherwise crash the whole app before real keys are added.
let auth = null
let db = null
if (isFirebaseConfigured) {
  auth = getAuth(app)
  db = getFirestore(app)
}

export { auth, db }
export default app
