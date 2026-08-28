const { Router } = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = Router()

// Called once after Firebase register/login so the user has an off-chain row
// (KYC status, wallet address, listings, holdings all hang off this).
router.post('/sync', requireAuth, async (req, res) => {
  const { uid, email, name } = req.firebaseUser
  try {
    const user = await prisma.user.upsert({
      where: { firebaseUid: uid },
      update: { email },
      create: { firebaseUid: uid, email, name: name || null },
    })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync user', detail: err.message })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid: req.firebaseUser.uid } })
  if (!user) return res.status(404).json({ error: 'User not synced yet — call POST /api/users/sync first' })
  res.json(user)
})

router.get('/me/holdings', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid: req.firebaseUser.uid } })
  if (!user) return res.status(404).json({ error: 'User not synced yet' })

  const holdings = await prisma.holding.findMany({
    where: { ownerId: user.id, sqFtOwned: { gt: 0 } },
    include: { listing: true },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(holdings)
})

router.get('/me/transactions', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid: req.firebaseUser.uid } })
  if (!user) return res.status(404).json({ error: 'User not synced yet' })

  const transactions = await prisma.transaction.findMany({
    where: { buyerId: user.id },
    include: { listing: { select: { title: true, city: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(transactions)
})

module.exports = router
