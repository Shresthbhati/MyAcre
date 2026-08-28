require('dotenv').config({ path: '.env.local' })

const express = require('express')
const cors = require('cors')

const healthRoutes = require('./routes/health')
const userRoutes = require('./routes/users')
const kycRoutes = require('./routes/kyc')

const app = express()

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/health', healthRoutes)
app.use('/api/users', userRoutes)
app.use('/api/kyc', kycRoutes)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`MyAcre backend listening on http://localhost:${PORT}`)
})
