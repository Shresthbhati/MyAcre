const { Router } = require('express')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const prisma = require('../lib/prisma')
const { requireAuth, requireRole } = require('../middleware/auth')
const { verifyTitle } = require('../lib/oracle')
const { findDuplicate, normalizeDeed } = require('../lib/duplicateDetection')
const { buildValuation, classifyValuation } = require('../lib/valuation')
const { sha256, sanitizeFilename, validateDocument, MAX_SIZE_BYTES } = require('../lib/documentValidation')
const blockchain = require('../lib/blockchain')
const { findDuplicateAsset } = require('../lib/assetIdentity')

const router = Router()

// Local disk for the demo — one directory per listing, filenames are
// server-generated (uuid + sanitized display name) so nothing about the
// upload path is attacker-controlled.
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE_BYTES } })

async function assertListingOwnerOrAdmin(req, res, listingId) {
  const dbUser = await prisma.user.findUnique({ where: { firebaseUid: req.firebaseUser.uid } })
  if (!dbUser) {
    res.status(404).json({ error: 'User not synced yet — call POST /api/users/sync first' })
    return null
  }
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, ownerId: true } })
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' })
    return null
  }
  if (listing.ownerId !== dbUser.id && dbUser.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }
  return dbUser
}

// Stable, human-readable asset code derived from existing fields — not a
// new identity system, just a display label. MYA-IN-<CITY3>-<idsuffix>.
function assetIdFor(listing) {
  const cityCode = (listing.city || 'XX').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X')
  const suffix = listing.id.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `MYA-IN-${cityCode}-${suffix}`
}

function serializeListing(listing) {
  const sellablePlots = listing.plots.filter((p) => p.sellable)
  const sellableSqFt = sellablePlots.reduce((sum, p) => sum + Number(p.totalSqFt), 0)
  const soldSqFt = sellablePlots.reduce((sum, p) => sum + Number(p.soldSqFt), 0)

  return {
    id: listing.id,
    assetId: assetIdFor(listing),
    title: listing.title,
    description: listing.description,
    city: listing.city,
    latitude: listing.latitude,
    longitude: listing.longitude,
    totalValue: listing.totalValue,
    areaSqFt: Number(listing.areaSqFt),
    pricePerSqFt: listing.pricePerSqFt,
    totalTokens: listing.totalTokens,
    pricePerToken: listing.pricePerToken,
    sqFtPerToken: Number(listing.sqFtPerToken),
    gridRows: listing.gridRows,
    gridCols: listing.gridCols,
    imageSeed: listing.imageSeed,
    titleStatus: listing.titleStatus,
    titleRejectionReason: listing.titleRejectionReason,
    ownerId: listing.ownerId,
    contractAddress: listing.contractAddress,
    onChainTxHash: listing.onChainTxHash,
    frozen: listing.frozen,
    frozenReason: listing.frozenReason,
    soldSqFt,
    availableSqFt: sellableSqFt - soldSqFt,
    excludedSqFt: Number(listing.areaSqFt) - sellableSqFt,
    createdAt: listing.createdAt,
  }
}

// Public: sample map dataset. Only verified listings are investable.
router.get('/', async (req, res) => {
  const listings = await prisma.listing.findMany({
    where: { titleStatus: 'VERIFIED' },
    include: { plots: { select: { sellable: true, totalSqFt: true, soldSqFt: true } } },
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
  const plots = listing.plots.map((p) => ({ ...p, totalSqFt: Number(p.totalSqFt), soldSqFt: Number(p.soldSqFt) }))
  res.json({ ...serializeListing(listing), plots })
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
  const listingPricePerSqFt = Number(listing.pricePerSqFt)
  res.json({
    city: listing.city,
    listingPricePerSqFt,
    ...valuation,
    ...classifyValuation(listingPricePerSqFt, valuation.currentAreaAvg),
  })
})

// Property Passport: aggregates verification, geometry, valuation, and
// blockchain proof into one trust dossier. Pulls from data that already
// exists on the listing — no new tables. Intentionally coarse checks
// (deed-registry match, plot-geometry consistency) since MyAcre has no real
// government registry integration; see docs/LEGAL_MODEL.md.
router.get('/:id/passport', async (req, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: {
      plots: { select: { sellable: true, totalSqFt: true, soldSqFt: true, status: true } },
      transactions: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, sqFt: true, amount: true, status: true, txHash: true, createdAt: true } },
    },
  })
  if (!listing) return res.status(404).json({ error: 'Listing not found' })

  const history = await prisma.areaPriceHistory.findMany({ where: { city: listing.city }, orderBy: { periodIndex: 'asc' } })
  const valuation = buildValuation(history)
  const listingPricePerSqFt = Number(listing.pricePerSqFt)
  const deviationPercent = valuation.currentAreaAvg > 0
    ? Number((((listingPricePerSqFt - valuation.currentAreaAvg) / valuation.currentAreaAvg) * 100).toFixed(1))
    : 0

  const { verified: titleVerified, reason: titleReason } = verifyTitle(listing.titleDeedNumber)
  const geometryOk = listing.plots.length === listing.gridRows * listing.gridCols

  // Trust score is computed only from verification checks (title, geometry,
  // valuation) — signals about whether the *asset* is what it claims to be.
  // Blockchain settlement is a separate ownership/status fact: an unsold,
  // fully-verified listing that simply hasn't been tokenized yet (or is
  // running with no blockchain configured) shouldn't read as "low trust".
  // It's still surfaced in `checks` for the UI, just excluded from the average.
  const verificationChecks = [
    {
      check: 'TITLE',
      status: listing.titleStatus,
      provider: 'MockRegistryProvider (DEMO)',
      confidence: titleVerified ? 100 : 0,
      evidenceRef: listing.titleDeedNumber,
      explanation: titleVerified ? 'Deed number matched the demo registry sample set.' : titleReason,
    },
    {
      check: 'GEOMETRY',
      status: geometryOk ? 'VERIFIED' : 'FLAGGED',
      provider: 'DemoTokenizationGrid',
      confidence: geometryOk ? 92 : 40,
      evidenceRef: `${listing.gridRows}x${listing.gridCols} grid`,
      explanation: geometryOk
        ? 'Grid cell count matches declared rows × cols; this is a tokenization grid, not a surveyed parcel boundary.'
        : 'Grid cell count does not match declared dimensions.',
    },
    {
      check: 'VALUATION',
      status: Math.abs(deviationPercent) <= 15 ? 'VERIFIED' : 'FLAGGED',
      provider: 'LinearRegressionTrendModel (DEMO)',
      confidence: Math.max(0, 100 - Math.abs(deviationPercent) * 2),
      evidenceRef: `${history.length} historical price points for ${listing.city}`,
      explanation: `Listing price is ${deviationPercent >= 0 ? '+' : ''}${deviationPercent}% vs. the model's current-area average of ${valuation.currentAreaAvg}/sqft.`,
    },
  ]

  const blockchainCheck = {
    check: 'BLOCKCHAIN_SETTLEMENT',
    status: listing.onChainTxHash ? 'VERIFIED' : 'PENDING',
    provider: 'PropertyToken.sol (Polygon Amoy)',
    confidence: listing.onChainTxHash ? 100 : 0,
    evidenceRef: listing.onChainTxHash || null,
    explanation: listing.onChainTxHash
      ? 'Property was tokenized on-chain; supply cap enforced by contract.'
      : 'Not yet tokenized on-chain (blockchain not configured or tokenization pending) — this does not affect the trust score, which reflects asset verification, not settlement progress.',
  }

  const checks = [...verificationChecks, blockchainCheck]
  const trustScore = Math.round(verificationChecks.reduce((sum, c) => sum + c.confidence, 0) / verificationChecks.length)

  res.json({
    assetId: assetIdFor(listing),
    summary: {
      title: listing.title,
      city: listing.city,
      latitude: listing.latitude,
      longitude: listing.longitude,
      totalValue: Number(listing.totalValue),
      areaSqFt: Number(listing.areaSqFt),
      titleStatus: listing.titleStatus,
      createdAt: listing.createdAt,
    },
    trustScore,
    checks,
    valuation: { ...valuation, listingPricePerSqFt, deviationPercent },
    geometry: {
      type: 'DEMO_TOKENIZATION_GRID',
      note: 'Equal-area grid over the listing coordinates for fractional sale — not a legally surveyed parcel boundary.',
      gridRows: listing.gridRows,
      gridCols: listing.gridCols,
      excludedCells: listing.plots.filter((p) => !p.sellable).length,
    },
    ownership: {
      contractAddress: listing.contractAddress,
      onChainTxHash: listing.onChainTxHash,
      tokenized: Boolean(listing.onChainTxHash),
    },
    recentTransactions: listing.transactions.map((t) => ({ ...t, sqFt: Number(t.sqFt), amount: Number(t.amount) })),
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

  // Two complementary checks, run in order from cheapest/most-certain to
  // broadest: first "did this same owner already list this exact asset"
  // (tight coordinate tolerance, no area check — a re-submission mistake),
  // then "does this match ANY existing listing, including other owners'"
  // (looser radius + area tolerance, catches someone re-listing a property
  // that isn't theirs). Either one firing blocks creation before any write.
  const ownerDuplicate = await findDuplicateAsset(prisma, {
    ownerId: owner.id,
    titleDeedNumber,
    latitude: Number(latitude),
    longitude: Number(longitude),
  })
  if (ownerDuplicate) {
    return res.status(409).json({
      error: `You already have a listing ("${ownerDuplicate.existingListingTitle}") matching this property on ${ownerDuplicate.matchedOn.join(' and ')}.`,
      code: 'DUPLICATE_ASSET_DETECTED',
      confidence: 'exact',
      matchedListingId: ownerDuplicate.existingListingId,
    })
  }

  const excludedSet = new Set(excludedCells.map(({ row, col }) => `${row}-${col}`))
  const totalCells = Number(gridRows) * Number(gridCols)
  const sellableCount = totalCells - excludedSet.size
  if (sellableCount <= 0) {
    return res.status(400).json({ error: 'At least one grid cell must be sellable' })
  }

  // Check against every non-rejected listing already in the system — a
  // rejected listing's deed number/geometry shouldn't block a fresh,
  // corrected resubmission. Runs before any writes: a detected duplicate
  // must never reach the database.
  const candidateForDuplicateCheck = { titleDeedNumber, city, latitude: Number(latitude), longitude: Number(longitude), areaSqFt: Number(areaSqFt) }
  const existingListings = await prisma.listing.findMany({
    where: { titleStatus: { not: 'REJECTED' } },
    select: { id: true, titleDeedNumber: true, city: true, latitude: true, longitude: true, areaSqFt: true },
  })
  const crossOwnerDuplicate = findDuplicate(candidateForDuplicateCheck, existingListings)
  if (crossOwnerDuplicate) {
    return res.status(409).json({
      error: `Duplicate property detected: ${crossOwnerDuplicate.reason}`,
      code: 'DUPLICATE_ASSET_DETECTED',
      confidence: crossOwnerDuplicate.confidence,
      matchedListingId: crossOwnerDuplicate.matchedListingId,
    })
  }

  const normalizedDeed = normalizeDeed(titleDeedNumber)

  // Every grid cell (sellable or not) represents an equal physical slice of
  // the property — excluding a cell shrinks the sellable area, it doesn't
  // spread that area onto the remaining chunks.
  const cellSqFt = Number(areaSqFt) / totalCells
  const pricePerSqFt = Number(totalValue) / Number(areaSqFt)
  const sqFtPerToken = cellSqFt
  const pricePerToken = pricePerSqFt * cellSqFt
  const { verified, reason } = verifyTitle(normalizedDeed)

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
          titleDeedNumber: normalizedDeed,
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
    }, { timeout: 15000, maxWait: 10000 })

    const sellableSqFt = sellableCount * sqFtPerToken

    // Register the property on-chain — best-effort. If the chain call fails
    // (RPC hiccup, no gas, contract not deployed yet) the listing still
    // exists and is fully usable off-chain; we just log it rather than
    // failing a request Postgres already committed.
    let onChainTxHash = null
    if (listing.titleStatus === 'VERIFIED' && blockchain.isBlockchainConfigured) {
      try {
        onChainTxHash = await blockchain.tokenizeProperty(listing.id, sellableSqFt)
        await prisma.listing.update({
          where: { id: listing.id },
          data: { contractAddress: blockchain.contractAddress, onChainTxHash },
        })
      } catch (err) {
        console.error('On-chain tokenizeProperty failed:', err.message)
      }
    }

    res.status(201).json({
      ...serializeListing({ ...listing, plots: [] }),
      soldSqFt: 0,
      availableSqFt: sellableSqFt,
      excludedSqFt: Number(areaSqFt) - sellableSqFt,
      contractAddress: onChainTxHash ? blockchain.contractAddress : null,
      onChainTxHash,
    })
  } catch (err) {
    console.error('Failed to create listing:', err)
    res.status(500).json({ error: 'Failed to create listing' })
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

  // Read the listing outside the transaction — its price doesn't change
  // concurrently, and every round-trip inside the transaction eats into
  // Prisma's timeout budget against a remote database.
  const priceListing = await prisma.listing.findUnique({ where: { id: req.params.id } })
  if (!priceListing) return res.status(404).json({ error: 'Listing not found' })
  if (priceListing.frozen) {
    return res.status(403).json({ error: `Property is frozen — purchases are blocked. ${priceListing.frozenReason || ''}`.trim() })
  }
  const pricePerSqFt = Number(priceListing.pricePerSqFt)

  // A client-supplied Idempotency-Key lets a retried request (network
  // hiccup, double-click, browser back-forward) reattach to the purchase
  // that already happened instead of buying a second time. A repeat of an
  // already-recorded key returns the original transaction unchanged.
  const idempotencyKey = req.headers['idempotency-key'] || null
  if (idempotencyKey) {
    const existing = await prisma.transaction.findUnique({
      where: { buyerId_idempotencyKey: { buyerId: buyer.id, idempotencyKey } },
    })
    if (existing) {
      return res.status(200).json({
        ...existing,
        sqFt: Number(existing.sqFt),
        amount: Number(existing.amount),
        replay: true,
      })
    }
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        let listingId = null
        let totalSqFt = 0
        const plotIds = []

        for (const sel of selections) {
          const sqFt = Number(sel.sqFt)
          // Atomic guarded update: only succeeds if enough sqft is still
          // available in this plot. Postgres locks the row for the
          // transaction's duration, so a concurrent buyer sees the updated
          // soldSqFt (or gets blocked) — no double-sale. (A plain
          // read-then-write here would NOT be safe on Postgres — two
          // concurrent transactions could both read stale soldSqFt before
          // either commits. This single guarded statement is what closes
          // that race.)
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

        const amount = pricePerSqFt * totalSqFt

        const transaction = await tx.transaction.create({
          data: {
            listingId,
            buyerId: buyer.id,
            sqFt: totalSqFt,
            plotIds,
            amount,
            status: 'COMPLETED',
            paymentMethod,
            idempotencyKey,
          },
        })

        // Approximate: plotCount counts this request's selections, not a
        // precise distinct-plot recount — good enough for a dashboard stat
        // without another round-trip against a remote database.
        await tx.holding.upsert({
          where: { listingId_ownerId: { listingId, ownerId: buyer.id } },
          update: { sqFtOwned: { increment: totalSqFt }, plotCount: { increment: plotIds.length } },
          create: { listingId, ownerId: buyer.id, sqFtOwned: totalSqFt, plotCount: plotIds.length },
        })

        return transaction
      },
      { timeout: 15000, maxWait: 10000 },
    )

    // Mint the buyer's sqft on-chain — best-effort: the off-chain purchase
    // already succeeded and is the source of truth for ownership, the chain
    // call adds a public, tamper-proof record on top of it. A missing wallet
    // means blockchain settlement was never attempted for this buyer, not
    // that it failed, so it's excluded from the "configured" check below.
    const chainAttempted = blockchain.isBlockchainConfigured && Boolean(buyer.walletAddress)
    let onChainTxHash = null
    if (chainAttempted) {
      try {
        onChainTxHash = await blockchain.buyChunk(priceListing.id, buyer.walletAddress, result.sqFt)
      } catch (err) {
        console.error('On-chain buyChunk failed:', err.message)
      }
    }

    // Never let a blockchain-layer failure look identical to a fully
    // confirmed purchase — the DB row and the API response both carry the
    // real settlement status so the UI can say so honestly.
    const blockchainStatus = blockchain.classifySettlement({ isConfigured: chainAttempted, txHash: onChainTxHash })
    await prisma.transaction.update({ where: { id: result.id }, data: { txHash: onChainTxHash, blockchainStatus } })

    res.status(201).json({
      ...result,
      sqFt: Number(result.sqFt),
      amount: Number(result.amount),
      txHash: onChainTxHash,
      blockchainStatus,
    })
  } catch (err) {
    if (err.message === 'DOUBLE_SALE_PREVENTED') {
      return res.status(409).json({ error: 'Not enough sqft left in one or more selected chunks — someone else just bought part of it. Refresh and try again.' })
    }
    // Two requests carrying the same Idempotency-Key raced past the
    // pre-check above and both tried to insert; the DB's unique constraint
    // let exactly one win. The loser reattaches to the winner's transaction
    // instead of surfacing an error — from the caller's perspective the
    // purchase they asked for still happened exactly once.
    if (idempotencyKey && err.code === 'P2002' && err.meta?.target?.includes('idempotencyKey')) {
      const existing = await prisma.transaction.findUnique({
        where: { buyerId_idempotencyKey: { buyerId: buyer.id, idempotencyKey } },
      })
      if (existing) {
        return res.status(200).json({
          ...existing,
          sqFt: Number(existing.sqFt),
          amount: Number(existing.amount),
          replay: true,
        })
      }
    }
    console.error('Purchase failed:', err)
    res.status(500).json({ error: 'Purchase failed' })
  }
})

// Admin-only kill switch. Enforced here, not just hidden in the UI — see
// requireRole in middleware/auth.js.
router.post('/:id/freeze', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { reason } = req.body || {}
  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({ error: 'reason is required' })
  }
  try {
    const listing = await prisma.listing.update({
      where: { id: req.params.id },
      data: { frozen: true, frozenReason: reason },
    })
    console.log(`[audit] PROPERTY_FROZEN listing=${listing.id} admin=${req.dbUser.id} reason=${JSON.stringify(reason)}`)
    res.json({ id: listing.id, frozen: true, frozenReason: listing.frozenReason })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Listing not found' })
    console.error('Freeze failed:', err)
    res.status(500).json({ error: 'Freeze failed' })
  }
})

router.post('/:id/unfreeze', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const listing = await prisma.listing.update({
      where: { id: req.params.id },
      data: { frozen: false, frozenReason: null },
    })
    console.log(`[audit] PROPERTY_UNFROZEN listing=${listing.id} admin=${req.dbUser.id}`)
    res.json({ id: listing.id, frozen: false, frozenReason: null })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Listing not found' })
    console.error('Unfreeze failed:', err)
    res.status(500).json({ error: 'Unfreeze failed' })
  }
})

// Evidence documents — deed scans, surveys, etc. Owner or admin only, in
// both directions: uploading and even seeing that a document exists.
router.post('/:id/documents', requireAuth, upload.single('file'), async (req, res) => {
  const dbUser = await assertListingOwnerOrAdmin(req, res, req.params.id)
  if (!dbUser) return
  if (!req.file) return res.status(400).json({ error: 'file is required' })

  const check = validateDocument({ originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size })
  if (!check.ok) return res.status(400).json({ error: check.error })

  const hash = sha256(req.file.buffer)
  const safeName = sanitizeFilename(req.file.originalname)
  const dir = path.join(UPLOAD_ROOT, req.params.id)
  const storedFilename = `${crypto.randomUUID()}-${safeName}`
  const storagePath = path.join(dir, storedFilename)

  try {
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(storagePath, req.file.buffer)

    const document = await prisma.document.create({
      data: {
        listingId: req.params.id,
        uploaderId: dbUser.id,
        filename: safeName,
        mimeType: req.file.mimetype,
        size: req.file.size,
        sha256: hash,
        storagePath,
      },
    })
    console.log(`[audit] DOCUMENT_UPLOADED listing=${req.params.id} document=${document.id} uploader=${dbUser.id} sha256=${hash}`)
    res.status(201).json({
      id: document.id,
      filename: document.filename,
      mimeType: document.mimeType,
      size: document.size,
      sha256: document.sha256,
      createdAt: document.createdAt,
    })
  } catch (err) {
    console.error('Document upload failed:', err)
    res.status(500).json({ error: 'Document upload failed' })
  }
})

router.get('/:id/documents', requireAuth, async (req, res) => {
  const dbUser = await assertListingOwnerOrAdmin(req, res, req.params.id)
  if (!dbUser) return
  const documents = await prisma.document.findMany({
    where: { listingId: req.params.id },
    select: { id: true, filename: true, mimeType: true, size: true, sha256: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(documents)
})

router.get('/:id/documents/:docId/download', requireAuth, async (req, res) => {
  const dbUser = await assertListingOwnerOrAdmin(req, res, req.params.id)
  if (!dbUser) return
  const document = await prisma.document.findUnique({ where: { id: req.params.docId } })
  if (!document || document.listingId !== req.params.id) {
    return res.status(404).json({ error: 'Document not found' })
  }
  res.setHeader('Content-Type', document.mimeType)
  res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`)
  fs.createReadStream(document.storagePath).pipe(res)
})

module.exports = router
