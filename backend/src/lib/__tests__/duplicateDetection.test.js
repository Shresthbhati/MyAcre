const { test } = require('node:test')
const assert = require('node:assert/strict')
const { findDuplicate, distanceMeters } = require('../duplicateDetection')

const EXISTING = [
  { id: 'listing-1', titleDeedNumber: 'MH-PUN-10231', city: 'Pune', latitude: 18.5362, longitude: 73.894, areaSqFt: 5400 },
]

test('same deed number (different case/whitespace) is an exact duplicate', () => {
  const result = findDuplicate(
    { titleDeedNumber: ' mh-pun-10231 ', city: 'Pune', latitude: 20, longitude: 80, areaSqFt: 9999 },
    EXISTING,
  )
  assert.equal(result.confidence, 'exact')
  assert.equal(result.matchedListingId, 'listing-1')
})

test('different deed number, same city/near location/similar area is a similarity match, not exact', () => {
  const result = findDuplicate(
    { titleDeedNumber: 'MH-PUN-99999', city: 'Pune', latitude: 18.5363, longitude: 73.8941, areaSqFt: 5450 },
    EXISTING,
  )
  assert.equal(result.confidence, 'similar')
  assert.equal(result.matchedListingId, 'listing-1')
  // Must not overstate certainty for a heuristic match.
  assert.match(result.reason, /may be the same property/)
})

test('different deed number, different city: no duplicate', () => {
  const result = findDuplicate(
    { titleDeedNumber: 'KA-BLR-20114', city: 'Bengaluru', latitude: 12.9716, longitude: 77.6412, areaSqFt: 6000 },
    EXISTING,
  )
  assert.equal(result, null)
})

test('same city, nearby, but area is far off: not flagged (a different, smaller/larger plot nearby is plausible)', () => {
  const result = findDuplicate(
    { titleDeedNumber: 'MH-PUN-88888', city: 'Pune', latitude: 18.5362, longitude: 73.894, areaSqFt: 20000 },
    EXISTING,
  )
  assert.equal(result, null)
})

test('a rejected/excluded listing passed in by the caller still matches — filtering by status is the caller\'s job', () => {
  const result = findDuplicate({ titleDeedNumber: 'MH-PUN-10231', city: 'Pune', latitude: 1, longitude: 1, areaSqFt: 1 }, EXISTING)
  assert.equal(result.confidence, 'exact')
})

test('distanceMeters: same point is zero, a known ~111km-per-degree-latitude approximation holds', () => {
  assert.equal(distanceMeters(0, 0, 0, 0), 0)
  const oneDegreeLat = distanceMeters(0, 0, 1, 0)
  assert.ok(oneDegreeLat > 110000 && oneDegreeLat < 112000)
})
