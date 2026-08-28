const admin = require('firebase-admin')

// Paste the full contents of the service account JSON (Firebase Console >
// Project settings > Service accounts > Generate new private key) as a single
// line into FIREBASE_SERVICE_ACCOUNT_JSON in backend/.env.local.
const isFirebaseAdminConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)

let app = null

if (isFirebaseAdminConfigured && !admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
} else if (admin.apps.length) {
  app = admin.apps[0]
}

module.exports = { admin, app, isFirebaseAdminConfigured }
