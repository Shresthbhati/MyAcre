const { Router } = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { verifyTitle } = require('../lib/oracle')

const router = Router()

function serializeListing(listing) {
  const soldCount = listing.plots ? listing.plots.filter((p) => p.status === 'SOLD').length : listing._count?.plots
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    city: listing.city,
    latitude: listing.latitude,
    longitude: listing.longitude,
    totalValue: listing.totalValue,
    totalTokens: listing.totalTokens,
    pricePerToken: listing.pricePerToken,
    gridRows: listing.gridRows,
    gridCols: listing.gridCols,
    imageSeed: listing.imageSeed,
    titleStatus: listing.titleStatus,
    titleRejectionReason: listing.titleRejectionReason,
    ownerId: listing.ownerId,
    soldCount: soldCount ?? 0,
    createdAt: listing.createdAt,
  }
}

// Public: sample map dataset. Only verified listings are investable.
router.get('/', async (req, res) => {
  const listings = await prisma.listing.findMany({
    where: { titleStatus: 'VERIFIED' },
    include: { plots: { select: { status: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(listings.map(serializeListing))
})

router.get('/:id', async (req, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: {
      plots: {
        orderBy: [{ row: 'asc' }, { col: 'asc' }],
        select: { id: true, row: true, col: true, status: true, ownerId: true },
      },
    },
  })
  if (!listing) return res.status(404).json({ error: 'Listing not found' })
  res.json({ ...serializeListing(listing), plots: listing.plots })
})

// Sell & Tokenize: list a property, run it through the mock oracle, and — if
// verified — generate the grid of purchasable plots (one per token).
router.post('/', requireAuth, async (req, res) => {
  const owner = await prisma.user.findUnique({ where: { firebaseUid: req.firebaseUser.uid } })
  if (!owner) return res.status(404).json({ error: 'User not synced yet — call POST /api/users/sync first' })
  if (owner.kycStatus !== 'VERIFIED') {
    return res.status(403).json({ error: 'KYC must be verified before listing a property' })
  }

  const {
    title,
    description,
    city,
    latitude,
    longitude,
    totalValue,
    gridRows = 4,
    gridCols = 5,
    titleDeedNumber,
  } = req.body || {}

  if (!title || !description || !city || latitude == null || longitude == null || !totalValue || !titleDeedNumber) {
    return res.status(400).json({ error: 'Missing required listing fields' })
  }

  const totalTokens = Number(gridRows) * Number(gridCols)
  const pricePerToken = Number(totalValue) / totalTokens
  const { verified, reason } = verifyTitle(titleDeedNumber)

  try {
    const listing = await prisma.$transaction(async (tx) => {
      const created = await tx.listing.create({
        data: {
          ownerId: owner.id,
          title,
          description,
          city,
          latitude: Number(latitude),
          longitude: Number(longitude),
          totalValue,
          totalTokens,
          pricePerToken,
          gridRows: Number(gridRows),
          gridCols: Number(gridCols),
          imageSeed: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          titleDeedNumber,
          titleStatus: verified ? 'VERIFIED' : 'REJECTED',
          titleRejectionReason: verified ? null : reason,
        },
      })

      if (verified) {
        const plots = []
        for (let row = 0; row < gridRows; row += 1) {
          for (let col = 0; col < gridCols; col += 1) {
            plots.push({ listingId: created.id, row, col })
          }
        }
        await tx.plot.createMany({ data: plots })
      }

      return created
    })

    res.status(201).json(serializeListing(listing))
  } catch (err) {
    res.status(500).json({ error: 'Failed to create listing', detail: err.message })
  }
})

// Browse & Buy: atomically mark the requested plots SOLD, record the
// transaction, and update the buyer's holdings. Fails clean (no partial
// mint) if payment is simulated to fail, or if any plot was already sold —
// this is what stops two buyers claiming the same chunk.
router.post('/:id/buy', requireAuth, async (req, res) => {
  const buyer = await prisma.user.findUnique({ where: { firebaseUid: req.firebaseUser.uid } })
  if (!buyer) return res.status(404).json({ error: 'User not synced yet — call POST /api/users/sync first' })
  if (buyer.kycStatus !== 'VERIFIED') {
    return res.status(403).json({ error: 'KYC must be verified before buying tokens' })
  }

  const { plotIds, paymentMethod = 'upi', simulatePaymentFailure = false } = req.body || {}
  if (!Array.isArray(plotIds) || plotIds.length === 0) {
    return res.status(400).json({ error: 'plotIds is required' })
  }

  if (simulatePaymentFailure) {
    return res.status(402).json({ error: 'Payment failed — no tokens were minted.' })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const plots = await tx.plot.findMany({ where: { id: { in: plotIds } } })
      if (plots.length !== plotIds.length) throw new Error('One or more plots do not exist')

      const listingId = plots[0].listingId
      if (plots.some((p) => p.listingId !== listingId)) throw new Error('Plots must belong to the same listing')

      // Conditional update: only rows still AVAILABLE flip to SOLD. Postgres
      // locks each matched row for the transaction's duration, so a
      // concurrent buyer racing for the same plot sees updatedCount < requested
      // and the whole purchase rolls back — no double-sale.
      const updated = await tx.plot.updateMany({
        where: { id: { in: plotIds }, status: 'AVAILABLE' },
        data: { status: 'SOLD', ownerId: buyer.id },
      })

      if (updated.count !== plotIds.length) {
        throw new Error('DOUBLE_SALE_PREVENTED')
      }

      const listing = await tx.listing.findUnique({ where: { id: listingId } })
      const amount = Number(listing.pricePerToken) * plotIds.length

      const transaction = await tx.transaction.create({
        data: {
          listingId,
          buyerId: buyer.id,
          quantity: plotIds.length,
          plotIds,
          amount,
          status: 'COMPLETED',
          paymentMethod,
        },
      })

      await tx.holding.upsert({
        where: { listingId_ownerId: { listingId, ownerId: buyer.id } },
        update: { quantity: { increment: plotIds.length } },
        create: { listingId, ownerId: buyer.id, quantity: plotIds.length },
      })

      return transaction
    })

    res.status(201).json(result)
  } catch (err) {
    if (err.message === 'DOUBLE_SALE_PREVENTED') {
      return res.status(409).json({ error: 'One or more selected plots were just sold to someone else. Pick different plots.' })
    }
    res.status(500).json({ error: 'Purchase failed', detail: err.message })
  }
})

module.exports = router
