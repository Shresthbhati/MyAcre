require('dotenv').config()

const express = require('express')
const cors = require('cors')

const healthRoutes = require('./routes/health')
const userRoutes = require('./routes/users')
const kycRoutes = require('./routes/kyc')
const listingRoutes = require('./routes/listings')

const app = express()

app.disable('x-powered-by')
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('X-Frame-Options', 'DENY')
  res.set('Referrer-Policy', 'no-referrer')
  next()
})

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

// ponytail: in-memory fixed-window limiter — per-process only, resets on
// restart, doesn't share state across instances. Swap for a shared store
// (Redis) if this ever runs behind multiple backend processes.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 120
const requestCounts = new Map()
app.use((req, res, next) => {
  const key = req.ip
  const now = Date.now()
  const entry = requestCounts.get(key)
  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return next()
  }
  entry.count += 1
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests — please slow down.' })
  }
  next()
})

app.use('/api/health', healthRoutes)
app.use('/api/users', userRoutes)
app.use('/api/kyc', kycRoutes)
app.use('/api/listings', listingRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Central error handler — never leak raw internal error messages/stacks.
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`MyAcre backend listening on http://localhost:${PORT}`)
})
