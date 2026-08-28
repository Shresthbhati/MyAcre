const { auth, isFirebaseAdminConfigured } = require('../lib/firebaseAdmin')

// Verifies the Firebase ID token sent as "Authorization: Bearer <token>" and
// attaches the decoded token (uid, email, ...) to req.firebaseUser.
async function requireAuth(req, res, next) {
  if (!isFirebaseAdminConfigured) {
    return res.status(503).json({
      error: 'Auth is not configured yet — add FIREBASE_SERVICE_ACCOUNT_JSON to backend/.env.local',
    })
  }

  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' })
  }

  try {
    req.firebaseUser = await auth.verifyIdToken(token)
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = { requireAuth }
