const { PrismaClient } = require('@prisma/client')

// Reused across hot-reloads in dev so we don't exhaust Neon's connection pool.
const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

module.exports = prisma
