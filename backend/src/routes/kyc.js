const { Router } = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = Router()

// Standard PAN format (5 letters, 4 digits, 1 letter) used as a rule-based
// stand-in for a real Aadhaar/PAN check — no UIDAI integration for the demo.
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/

router.post('/verify', requireAuth, async (req, res) => {
  const { pan } = req.body || {}
  if (!pan || typeof pan !== 'string') {
    return res.status(400).json({ error: 'pan is required' })
  }

  const normalizedPan = pan.trim().toUpperCase()
  const verified = PAN_PATTERN.test(normalizedPan)

  try {
    const user = await prisma.user.update({
      where: { firebaseUid: req.firebaseUser.uid },
      data: {
        kycPan: normalizedPan,
        kycStatus: verified ? 'VERIFIED' : 'REJECTED',
      },
    })
    res.json({ kycStatus: user.kycStatus })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not synced yet — call POST /api/users/sync first' })
    }
    res.status(500).json({ error: 'KYC check failed', detail: err.message })
  }
})

router.get('/status', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { firebaseUid: req.firebaseUser.uid },
    select: { kycStatus: true },
  })
  if (!user) return res.status(404).json({ error: 'User not synced yet' })
  res.json(user)
})

module.exports = router
