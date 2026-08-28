const { Router } = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { generateWallet } = require('../lib/blockchain')
const { encrypt } = require('../lib/walletCrypto')

const router = Router()

function publicUser(user) {
  const { walletPrivateKeyEncrypted, ...rest } = user
  return rest
}

// Called once after Firebase register/login so the user has an off-chain row
// (KYC status, wallet address, listings, holdings all hang off this). Also
// provisions a custodial on-chain wallet the first time, so every user has
// an address ready to receive tokens without needing their own MetaMask.
router.post('/sync', requireAuth, async (req, res) => {
  const { uid, email, name } = req.firebaseUser
  try {
    let user = await prisma.user.upsert({
      where: { firebaseUid: uid },
      update: { email },
      create: { firebaseUid: uid, email, name: name || null },
    })

    if (!user.walletAddress) {
      const wallet = await generateWallet()
      user = await prisma.user.update({
        where: { id: user.id },
        data: { walletAddress: wallet.address, walletPrivateKeyEncrypted: encrypt(wallet.privateKey) },
      })
    }

    res.json(publicUser(user))
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync user', detail: err.message })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid: req.firebaseUser.uid } })
  if (!user) return res.status(404).json({ error: 'User not synced yet — call POST /api/users/sync first' })
  res.json(publicUser(user))
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
