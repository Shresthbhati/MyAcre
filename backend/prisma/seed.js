const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function verticalRoad(col) {
  return (row, c) => c === col
}
function horizontalRoad(row) {
  return (r) => r === row
}

const LISTINGS = [
  {
    title: 'Riverside Heritage Plot',
    description: 'A tree-lined heritage plot facing the Mula-Mutha riverfront, walkable to Koregaon Park.',
    city: 'Pune',
    latitude: 18.5362,
    longitude: 73.894,
    totalValue: 9000000,
    areaSqFt: 5400,
    gridRows: 6,
    gridCols: 6,
    titleDeedNumber: 'MH-PUN-10231',
    soldChunks: 8,
  },
  {
    title: 'Baner Tech Corridor Plot',
    description: 'Commercial-zoned plot on the Baner tech corridor, five minutes from the IT parks. An internal access road runs through the middle of the plot and is excluded from sale.',
    city: 'Pune',
    latitude: 18.559,
    longitude: 73.7868,
    totalValue: 12000000,
    areaSqFt: 7200,
    gridRows: 6,
    gridCols: 8,
    titleDeedNumber: 'MH-PUN-10456',
    soldChunks: 0,
    isExcluded: verticalRoad(4),
  },
  {
    title: 'Hinjewadi IT Park Frontage',
    description: 'Frontage plot on the Hinjewadi IT Park approach road, high footfall zone.',
    city: 'Pune',
    latitude: 18.5908,
    longitude: 73.7362,
    totalValue: 7500000,
    areaSqFt: 4500,
    gridRows: 5,
    gridCols: 6,
    titleDeedNumber: 'MH-PUN-10789',
    soldChunks: 5,
  },
  {
    title: 'Indiranagar Boutique Plot',
    description: "Boutique retail plot on 100 Feet Road, Indiranagar — one of Bengaluru's densest retail strips.",
    city: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.6412,
    totalValue: 15000000,
    areaSqFt: 6000,
    gridRows: 6,
    gridCols: 10,
    titleDeedNumber: 'KA-BLR-20114',
    soldChunks: 12,
  },
  {
    title: 'Connaught Place Heritage Frontage',
    description: "Heritage-block frontage plot in the CP inner circle, Delhi's prime commercial address. A frontage setback road strip is excluded from sale.",
    city: 'New Delhi',
    latitude: 28.6315,
    longitude: 77.2167,
    totalValue: 20000000,
    areaSqFt: 6400,
    gridRows: 8,
    gridCols: 8,
    titleDeedNumber: 'DL-NDL-30021',
    soldChunks: 0,
    isExcluded: horizontalRoad(4),
  },
  {
    title: 'T Nagar Commercial Plot',
    description: "High-street commercial plot in T Nagar, Chennai's busiest shopping district.",
    city: 'Chennai',
    latitude: 13.0418,
    longitude: 80.2341,
    totalValue: 10000000,
    areaSqFt: 4800,
    gridRows: 6,
    gridCols: 8,
    titleDeedNumber: 'TN-CHN-40092',
    soldChunks: 3,
  },
]

// Synthetic quarterly price-per-sqft history per city (2021 Q1 -> 2026 Q2),
// standing in for real market/registry data — a gentle compound trend plus
// a small deterministic wobble so the line isn't a perfectly straight ramp.
const CITY_BASE = {
  Pune: { base: 9500, quarterlyGrowth: 0.019 },
  Bengaluru: { base: 13500, quarterlyGrowth: 0.023 },
  'New Delhi': { base: 17500, quarterlyGrowth: 0.014 },
  Chennai: { base: 8800, quarterlyGrowth: 0.017 },
}

function buildQuarters() {
  const quarters = []
  for (let year = 2021; year <= 2026; year += 1) {
    for (let q = 1; q <= 4; q += 1) {
      if (year === 2026 && q > 2) continue
      quarters.push(`${year}-Q${q}`)
    }
  }
  return quarters
}

async function seedPriceHistory() {
  const quarters = buildQuarters()
  for (const [city, { base, quarterlyGrowth }] of Object.entries(CITY_BASE)) {
    for (let i = 0; i < quarters.length; i += 1) {
      const wobble = 1 + 0.015 * Math.sin(i * 0.9)
      const price = base * Math.pow(1 + quarterlyGrowth, i) * wobble
      await prisma.areaPriceHistory.upsert({
        where: { city_period: { city, period: quarters[i] } },
        update: { pricePerSqFt: price, periodIndex: i },
        create: { city, period: quarters[i], periodIndex: i, pricePerSqFt: price },
      })
    }
    console.log(`Seeded ${quarters.length} price-history points for ${city}`)
  }
}

async function main() {
  await seedPriceHistory()

  const owner = await prisma.user.upsert({
    where: { firebaseUid: 'seed-demo-owner' },
    update: {},
    create: {
      firebaseUid: 'seed-demo-owner',
      email: 'demo-owner@myacre.dev',
      name: 'MyAcre Demo Listings',
      kycStatus: 'VERIFIED',
      kycPan: 'DEMOO1234O',
    },
  })

  const buyer = await prisma.user.upsert({
    where: { firebaseUid: 'seed-demo-buyer' },
    update: {},
    create: {
      firebaseUid: 'seed-demo-buyer',
      email: 'demo-buyer@myacre.dev',
      name: 'MyAcre Demo Investor',
      kycStatus: 'VERIFIED',
      kycPan: 'DEMOB5678B',
    },
  })

  for (const item of LISTINGS) {
    const existing = await prisma.listing.findFirst({ where: { titleDeedNumber: item.titleDeedNumber } })
    if (existing) {
      console.log(`Skipping "${item.title}" — already seeded`)
      continue
    }

    const isExcluded = item.isExcluded || (() => false)
    const totalCells = item.gridRows * item.gridCols
    let sellableCount = 0
    for (let row = 0; row < item.gridRows; row += 1) {
      for (let col = 0; col < item.gridCols; col += 1) {
        if (!isExcluded(row, col)) sellableCount += 1
      }
    }

    // Every grid cell represents an equal physical slice — excluding a cell
    // shrinks the sellable area rather than spreading it onto the rest.
    const cellSqFt = item.areaSqFt / totalCells
    const pricePerSqFt = item.totalValue / item.areaSqFt
    const sqFtPerToken = cellSqFt
    const pricePerToken = pricePerSqFt * cellSqFt

    const listing = await prisma.listing.create({
      data: {
        ownerId: owner.id,
        title: item.title,
        description: item.description,
        city: item.city,
        latitude: item.latitude,
        longitude: item.longitude,
        totalValue: item.totalValue,
        areaSqFt: item.areaSqFt,
        pricePerSqFt,
        totalTokens: sellableCount,
        pricePerToken,
        sqFtPerToken,
        gridRows: item.gridRows,
        gridCols: item.gridCols,
        imageSeed: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        titleDeedNumber: item.titleDeedNumber,
        titleStatus: 'VERIFIED',
      },
    })

    let sellableIndex = 0
    const plots = []
    for (let row = 0; row < item.gridRows; row += 1) {
      for (let col = 0; col < item.gridCols; col += 1) {
        if (isExcluded(row, col)) {
          plots.push({ listingId: listing.id, row, col, sellable: false, totalSqFt: 0, status: 'EXCLUDED' })
          continue
        }
        const sold = sellableIndex < item.soldChunks
        plots.push({
          listingId: listing.id,
          row,
          col,
          sellable: true,
          totalSqFt: sqFtPerToken,
          soldSqFt: sold ? sqFtPerToken : 0,
          status: sold ? 'SOLD' : 'AVAILABLE',
        })
        sellableIndex += 1
      }
    }
    await prisma.plot.createMany({ data: plots })
    const createdPlots = await prisma.plot.findMany({ where: { listingId: listing.id } })

    const soldPlots = createdPlots.filter((p) => p.status === 'SOLD')
    if (soldPlots.length > 0) {
      const sqFtOwned = soldPlots.length * sqFtPerToken
      await prisma.holding.create({
        data: { listingId: listing.id, ownerId: buyer.id, sqFtOwned, plotCount: soldPlots.length },
      })
      await prisma.plotHolding.createMany({
        data: soldPlots.map((p) => ({ plotId: p.id, ownerId: buyer.id, sqFt: sqFtPerToken })),
      })
      await prisma.transaction.create({
        data: {
          listingId: listing.id,
          buyerId: buyer.id,
          sqFt: sqFtOwned,
          plotIds: soldPlots.map((p) => p.id),
          amount: pricePerToken * soldPlots.length,
          status: 'COMPLETED',
          paymentMethod: 'upi',
        },
      })
    }

    console.log(
      `Seeded "${item.title}" — ${sellableCount} sellable chunks (${plots.length - sellableCount} excluded) @ ₹${pricePerToken.toFixed(0)} each, ${sqFtPerToken.toFixed(1)} sqft/chunk`,
    )
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
