const { initializeApp, getApps, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')

// Paste the full contents of the service account JSON (Firebase Console >
// Project settings > Service accounts > Generate new private key) as a single
// line into FIREBASE_SERVICE_ACCOUNT_JSON in backend/.env.
const isFirebaseAdminConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)

let app = null
let auth = null

if (isFirebaseAdminConfigured) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) })
  auth = getAuth(app)
}

module.exports = { app, auth, isFirebaseAdminConfigured }
