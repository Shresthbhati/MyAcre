const { Router } = require('express')
const { isFirebaseAdminConfigured } = require('../lib/firebaseAdmin')

const router = Router()

router.get('/', (req, res) => {
  res.json({
    ok: true,
    firebaseAdminConfigured: isFirebaseAdminConfigured,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  })
})

module.exports = router
