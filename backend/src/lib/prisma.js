const { PrismaClient } = require('@prisma/client')

// Reused across hot-reloads in dev so we don't open a new SQLite connection
// on every file change.
const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

module.exports = prisma
