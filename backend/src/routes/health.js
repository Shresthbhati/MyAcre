const { Router } = require('express')
const { isFirebaseAdminConfigured } = require('../lib/firebaseAdmin')
const { isBlockchainConfigured, contractAddress } = require('../lib/blockchain')

const router = Router()

router.get('/', (req, res) => {
  res.json({
    ok: true,
    firebaseAdminConfigured: isFirebaseAdminConfigured,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    blockchainConfigured: isBlockchainConfigured,
    contractAddress: isBlockchainConfigured ? contractAddress : null,
  })
})

module.exports = router
