const { test } = require('node:test')
const assert = require('node:assert/strict')
const { classifyValuation } = require('../valuation')

test('no historical model data: honestly says so instead of guessing a bucket', () => {
  assert.deepEqual(classifyValuation(5000, 0), { deviationPercent: null, label: 'NO_MODEL_DATA' })
  assert.deepEqual(classifyValuation(5000, null), { deviationPercent: null, label: 'NO_MODEL_DATA' })
})

test('within the near-threshold band either side of the model: NEAR_MODEL', () => {
  assert.equal(classifyValuation(1050, 1000).label, 'NEAR_MODEL') // +5%
  assert.equal(classifyValuation(950, 1000).label, 'NEAR_MODEL') // -5%
})

test('priced meaningfully below the model: BELOW_MODEL', () => {
  const r = classifyValuation(800, 1000) // -20%
  assert.equal(r.label, 'BELOW_MODEL')
  assert.equal(r.deviationPercent, -20)
})

test('priced meaningfully above the model but under the anomaly line: ABOVE_MODEL', () => {
  const r = classifyValuation(1200, 1000) // +20%
  assert.equal(r.label, 'ABOVE_MODEL')
  assert.equal(r.deviationPercent, 20)
})

test('far above the model: HIGH_ANOMALY', () => {
  const r = classifyValuation(1500, 1000) // +50%
  assert.equal(r.label, 'HIGH_ANOMALY')
})

test('exactly at the model: NEAR_MODEL, zero deviation', () => {
  assert.deepEqual(classifyValuation(1000, 1000), { deviationPercent: 0, label: 'NEAR_MODEL' })
})
