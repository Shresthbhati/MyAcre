const { auth, isFirebaseAdminConfigured } = require('../lib/firebaseAdmin')
const prisma = require('../lib/prisma')

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

// Must run after requireAuth. Enforces role server-side — the frontend only
// hiding a button is not authorization. A non-admin gets a plain 403 with no
// detail about what admin-only thing they tried to reach.
function requireRole(role) {
  return async (req, res, next) => {
    const dbUser = await prisma.user.findUnique({ where: { firebaseUid: req.firebaseUser.uid } })
    if (!dbUser) return res.status(404).json({ error: 'User not synced yet — call POST /api/users/sync first' })
    if (dbUser.role !== role) return res.status(403).json({ error: 'Forbidden' })
    req.dbUser = dbUser
    next()
  }
}

module.exports = { requireAuth, requireRole }
