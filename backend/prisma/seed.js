const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const LISTINGS = [
  {
    title: 'Riverside Heritage Plot',
    description: 'A tree-lined heritage plot facing the Mula-Mutha riverfront, walkable to Koregaon Park.',
    city: 'Pune',
    latitude: 18.5362,
    longitude: 73.894,
    totalValue: 9000000,
    gridRows: 6,
    gridCols: 6,
    titleDeedNumber: 'MH-PUN-10231',
    soldChunks: 8,
  },
  {
    title: 'Baner Tech Corridor Plot',
    description: 'Commercial-zoned plot on the Baner tech corridor, five minutes from the IT parks.',
    city: 'Pune',
    latitude: 18.559,
    longitude: 73.7868,
    totalValue: 12000000,
    gridRows: 6,
    gridCols: 8,
    titleDeedNumber: 'MH-PUN-10456',
    soldChunks: 0,
  },
  {
    title: 'Hinjewadi IT Park Frontage',
    description: 'Frontage plot on the Hinjewadi IT Park approach road, high footfall zone.',
    city: 'Pune',
    latitude: 18.5908,
    longitude: 73.7362,
    totalValue: 7500000,
    gridRows: 5,
    gridCols: 6,
    titleDeedNumber: 'MH-PUN-10789',
    soldChunks: 5,
  },
  {
    title: 'Indiranagar Boutique Plot',
    description: 'Boutique retail plot on 100 Feet Road, Indiranagar — one of Bengaluru\'s densest retail strips.',
    city: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.6412,
    totalValue: 15000000,
    gridRows: 6,
    gridCols: 10,
    titleDeedNumber: 'KA-BLR-20114',
    soldChunks: 12,
  },
  {
    title: 'Connaught Place Heritage Frontage',
    description: 'Heritage-block frontage plot in the CP inner circle, Delhi\'s prime commercial address.',
    city: 'New Delhi',
    latitude: 28.6315,
    longitude: 77.2167,
    totalValue: 20000000,
    gridRows: 8,
    gridCols: 8,
    titleDeedNumber: 'DL-NDL-30021',
    soldChunks: 0,
  },
  {
    title: 'T Nagar Commercial Plot',
    description: 'High-street commercial plot in T Nagar, Chennai\'s busiest shopping district.',
    city: 'Chennai',
    latitude: 13.0418,
    longitude: 80.2341,
    totalValue: 10000000,
    gridRows: 6,
    gridCols: 8,
    titleDeedNumber: 'TN-CHN-40092',
    soldChunks: 3,
  },
]

async function main() {
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

    const totalTokens = item.gridRows * item.gridCols
    const pricePerToken = item.totalValue / totalTokens

    const listing = await prisma.listing.create({
      data: {
        ownerId: owner.id,
        title: item.title,
        description: item.description,
        city: item.city,
        latitude: item.latitude,
        longitude: item.longitude,
        totalValue: item.totalValue,
        totalTokens,
        pricePerToken,
        gridRows: item.gridRows,
        gridCols: item.gridCols,
        imageSeed: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        titleDeedNumber: item.titleDeedNumber,
        titleStatus: 'VERIFIED',
      },
    })

    let chunkIndex = 0
    const plots = []
    for (let row = 0; row < item.gridRows; row += 1) {
      for (let col = 0; col < item.gridCols; col += 1) {
        const sold = chunkIndex < item.soldChunks
        plots.push({
          listingId: listing.id,
          row,
          col,
          status: sold ? 'SOLD' : 'AVAILABLE',
          ownerId: sold ? buyer.id : null,
        })
        chunkIndex += 1
      }
    }
    await prisma.plot.createMany({ data: plots })

    if (item.soldChunks > 0) {
      await prisma.holding.create({
        data: { listingId: listing.id, ownerId: buyer.id, quantity: item.soldChunks },
      })
      await prisma.transaction.create({
        data: {
          listingId: listing.id,
          buyerId: buyer.id,
          quantity: item.soldChunks,
          plotIds: plots.filter((p) => p.status === 'SOLD').map((_, i) => `seed-${i}`),
          amount: pricePerToken * item.soldChunks,
          status: 'COMPLETED',
          paymentMethod: 'upi',
        },
      })
    }

    console.log(`Seeded "${item.title}" — ${totalTokens} chunks @ ₹${pricePerToken.toFixed(0)} each`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
