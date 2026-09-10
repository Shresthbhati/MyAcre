const { test } = require('node:test')
const assert = require('node:assert/strict')
const { classifySettlement } = require('../blockchain')

// This is the one thing the non-negotiable correctness rule depends on: the
// app must never show "purchase successful" when the blockchain leg silently
// failed. classifySettlement is the single place that decision gets made —
// everything else (the /buy route, the DB column, the UI badge) just reads
// its output, so this function being right is what makes that rule real.

test('blockchain not configured for this deployment is not an error', () => {
  assert.equal(classifySettlement({ isConfigured: false, txHash: null }), 'NOT_CONFIGURED')
})

test('configured and a tx hash came back: fully confirmed', () => {
  assert.equal(classifySettlement({ isConfigured: true, txHash: '0xabc' }), 'CONFIRMED')
})

test('configured but the chain call failed (no tx hash): must not look confirmed', () => {
  assert.equal(classifySettlement({ isConfigured: true, txHash: null }), 'RECONCILIATION_REQUIRED')
})
