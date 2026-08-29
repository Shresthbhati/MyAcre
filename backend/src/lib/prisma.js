const { neonConfig } = require('@neondatabase/serverless')
const { PrismaNeon } = require('@prisma/adapter-neon')
const { PrismaClient } = require('@prisma/client')
const ws = require('ws')

// Some networks (this dev machine included) block outbound TCP on 5432,
// Postgres's usual port, while leaving normal HTTPS traffic (443) open.
// Neon's serverless driver tunnels the connection over a WebSocket on 443
// instead, sidestepping that entirely — this also makes the app resilient
// to the same restriction showing up at a demo venue.
neonConfig.webSocketConstructor = ws

// Reused across hot-reloads in dev so we don't exhaust Neon's connection pool.
const globalForPrisma = globalThis

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

module.exports = prisma
