const { test } = require('node:test')
const assert = require('node:assert/strict')

// Stub out the Prisma singleton before requiring auth.js, so requireRole's
// `prisma.user.findUnique` call resolves without a real database — this test
// is purely about the authorization decision, not persistence.
const prismaPath = require.resolve('../../lib/prisma')
let stubUser = null
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: { user: { findUnique: async () => stubUser } },
}

const { requireRole } = require('../auth')

function fakeReqRes(firebaseUid) {
  const req = { firebaseUser: { uid: firebaseUid } }
  let statusCode = null
  let body = null
  const res = {
    status(code) {
      statusCode = code
      return this
    },
    json(payload) {
      body = payload
      return this
    },
  }
  return { req, res, getResult: () => ({ statusCode, body }) }
}

test('privilege escalation: a plain USER is rejected from an ADMIN route with 403, not allowed through', async () => {
  stubUser = { id: 'u1', role: 'USER' }
  const { req, res, getResult } = fakeReqRes('firebase-1')
  let nextCalled = false
  await requireRole('ADMIN')(req, res, () => {
    nextCalled = true
  })
  assert.equal(nextCalled, false)
  assert.equal(getResult().statusCode, 403)
})

test('an ADMIN passes through and req.dbUser is attached for the route to use', async () => {
  stubUser = { id: 'u2', role: 'ADMIN' }
  const { req, res } = fakeReqRes('firebase-2')
  let nextCalled = false
  await requireRole('ADMIN')(req, res, () => {
    nextCalled = true
  })
  assert.equal(nextCalled, true)
  assert.equal(req.dbUser.id, 'u2')
})

test('an unsynced user (no DB row yet) gets 404, never silently treated as authorized', async () => {
  stubUser = null
  const { req, res, getResult } = fakeReqRes('firebase-3')
  let nextCalled = false
  await requireRole('ADMIN')(req, res, () => {
    nextCalled = true
  })
  assert.equal(nextCalled, false)
  assert.equal(getResult().statusCode, 404)
})
