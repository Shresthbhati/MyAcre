const { Router } = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { verifyTitle } = require('../lib/oracle')
const { buildValuation } = require('../lib/valuation')

const router = Router()

function serializeListing(listing) {
  const sellablePlots = listing.plots ? listing.plots.filter((p) => p.sellable) : null
  const soldSqFt = sellablePlots
    ? sellablePlots.reduce((sum, p) => sum + Number(p.soldSqFt), 0)
    : listing._soldSqFt ?? 0

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    city: listing.city,
    latitude: listing.latitude,
    longitude: listing.longitude,
    totalValue: listing.totalValue,
    areaSqFt: listing.areaSqFt,
    pricePerSqFt: listing.pricePerSqFt,
    totalTokens: listing.totalTokens,
    pricePerToken: listing.pricePerToken,
    sqFtPerToken: listing.sqFtPerToken,
    gridRows: listing.gridRows,
    gridCols: listing.gridCols,
    imageSeed: listing.imageSeed,
    titleStatus: listing.titleStatus,
    titleRejectionReason: listing.titleRejectionReason,
    ownerId: listing.ownerId,
    soldSqFt,
    availableSqFt: Number(listing.areaSqFt) - soldSqFt,
    createdAt: listing.createdAt,
  }
}

// Public: sample map dataset. Only verified listings are investable.
router.get('/', async (req, res) => {
  const listings = await prisma.listing.findMany({
    where: { titleStatus: 'VERIFIED' },
    include: { plots: { select: { sellable: true, soldSqFt: true } } },
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
        select: { id: true, row: true, col: true, sellable: true, totalSqFt: true, soldSqFt: true, status: true },
      },
    },
  })
  if (!listing) return res.status(404).json({ error: 'Listing not found' })
  res.json({ ...serializeListing(listing), plots: listing.plots })
})

// Historical price-per-sqft trend for the listing's city, plus a simple
// linear-regression projection — see src/lib/valuation.js.
router.get('/:id/valuation', async (req, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } })
  if (!listing) return res.status(404).json({ error: 'Listing not found' })

  const history = await prisma.areaPriceHistory.findMany({
    where: { city: listing.city },
    orderBy: { periodIndex: 'asc' },
  })

  const valuation = buildValuation(history)
  res.json({
    city: listing.city,
    listingPricePerSqFt: Number(listing.pricePerSqFt),
    ...valuation,
  })
})

// Sell & Tokenize: list a property, run it through the mock oracle, and — if
// verified — generate the grid of purchasable plots (one per chunk).
// `excludedCells` marks grid cells that overlap roads/common area — they're
// created as non-sellable and never count toward totalTokens or pricing.
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
    areaSqFt,
    gridRows = 4,
    gridCols = 5,
    titleDeedNumber,
    excludedCells = [],
  } = req.body || {}

  if (!title || !description || !city || latitude == null || longitude == null || !totalValue || !areaSqFt || !titleDeedNumber) {
    return res.status(400).json({ error: 'Missing required listing fields' })
  }

  const excludedSet = new Set(excludedCells.map(({ row, col }) => `${row}-${col}`))
  const totalCells = Number(gridRows) * Number(gridCols)
  const sellableCount = totalCells - excludedSet.size
  if (sellableCount <= 0) {
    return res.status(400).json({ error: 'At least one grid cell must be sellable' })
  }

  const pricePerSqFt = Number(totalValue) / Number(areaSqFt)
  const sqFtPerToken = Number(areaSqFt) / sellableCount
  const pricePerToken = Number(totalValue) / sellableCount
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
          areaSqFt: Number(areaSqFt),
          pricePerSqFt,
          totalTokens: sellableCount,
          pricePerToken,
          sqFtPerToken,
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
            const excluded = excludedSet.has(`${row}-${col}`)
            plots.push({
              listingId: created.id,
              row,
              col,
              sellable: !excluded,
              totalSqFt: excluded ? 0 : sqFtPerToken,
              status: excluded ? 'EXCLUDED' : 'AVAILABLE',
            })
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

// Browse & Buy: atomically claim sq-ft-precise selections within one or more
// plots. Each selection can be a whole chunk or a partial slice of one —
// "add a small chunk within a big chunk" — enforced with a guarded raw
// UPDATE so a concurrent buyer racing for the same sqft in the same plot
// can't oversell it (no partial mint if payment fails, either).
router.post('/:id/buy', requireAuth, async (req, res) => {
  const buyer = await prisma.user.findUnique({ where: { firebaseUid: req.firebaseUser.uid } })
  if (!buyer) return res.status(404).json({ error: 'User not synced yet — call POST /api/users/sync first' })
  if (buyer.kycStatus !== 'VERIFIED') {
    return res.status(403).json({ error: 'KYC must be verified before buying tokens' })
  }

  const { selections, paymentMethod = 'upi', simulatePaymentFailure = false } = req.body || {}
  if (!Array.isArray(selections) || selections.length === 0) {
    return res.status(400).json({ error: 'selections is required, e.g. [{ plotId, sqFt }]' })
  }
  for (const sel of selections) {
    if (!sel.plotId || !(Number(sel.sqFt) > 0)) {
      return res.status(400).json({ error: 'Each selection needs a plotId and a positive sqFt' })
    }
  }

  if (simulatePaymentFailure) {
    return res.status(402).json({ error: 'Payment failed — no tokens were minted.' })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let listingId = null
      let totalSqFt = 0
      const plotIds = []

      for (const sel of selections) {
        const sqFt = Number(sel.sqFt)
        // Atomic guarded update: only succeeds if enough sqft is still
        // available in this plot. Postgres locks the row for the
        // transaction's duration, so a concurrent buyer sees the updated
        // soldSqFt (or gets blocked) — no double-sale.
        const rows = await tx.$queryRaw`
          UPDATE plots
          SET "soldSqFt" = "soldSqFt" + ${sqFt},
              status = CASE WHEN "soldSqFt" + ${sqFt} >= "totalSqFt" THEN 'SOLD'::"PlotStatus" ELSE 'PARTIAL'::"PlotStatus" END,
              "updatedAt" = now()
          WHERE id = ${sel.plotId} AND sellable = true AND ("totalSqFt" - "soldSqFt") >= ${sqFt}
          RETURNING id, "listingId"
        `
        if (rows.length === 0) {
          throw new Error('DOUBLE_SALE_PREVENTED')
        }

        const plotListingId = rows[0].listingId
        if (listingId && plotListingId !== listingId) throw new Error('All selections must belong to the same listing')
        listingId = plotListingId
        totalSqFt += sqFt
        plotIds.push(sel.plotId)

        await tx.plotHolding.upsert({
          where: { plotId_ownerId: { plotId: sel.plotId, ownerId: buyer.id } },
          update: { sqFt: { increment: sqFt } },
          create: { plotId: sel.plotId, ownerId: buyer.id, sqFt },
        })
      }

      const listing = await tx.listing.findUnique({ where: { id: listingId } })
      const amount = Number(listing.pricePerSqFt) * totalSqFt

      const transaction = await tx.transaction.create({
        data: {
          listingId,
          buyerId: buyer.id,
          sqFt: totalSqFt,
          plotIds,
          amount,
          status: 'COMPLETED',
          paymentMethod,
        },
      })

      const existingHolding = await tx.holding.findUnique({
        where: { listingId_ownerId: { listingId, ownerId: buyer.id } },
      })
      await tx.holding.upsert({
        where: { listingId_ownerId: { listingId, ownerId: buyer.id } },
        update: { sqFtOwned: { increment: totalSqFt } },
        create: { listingId, ownerId: buyer.id, sqFtOwned: totalSqFt, plotCount: plotIds.length },
      })
      if (existingHolding) {
        const distinctPlots = await tx.plotHolding.count({ where: { ownerId: buyer.id, plot: { listingId } } })
        await tx.holding.update({
          where: { listingId_ownerId: { listingId, ownerId: buyer.id } },
          data: { plotCount: distinctPlots },
        })
      }

      return transaction
    })

    res.status(201).json(result)
  } catch (err) {
    if (err.message === 'DOUBLE_SALE_PREVENTED') {
      return res.status(409).json({ error: 'Not enough sqft left in one or more selected chunks — someone else just bought part of it. Refresh and try again.' })
    }
    res.status(500).json({ error: 'Purchase failed', detail: err.message })
  }
})

module.exports = router
