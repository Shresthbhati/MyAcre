// Standalone self-check for findDuplicateAsset — run with:
//   node src/lib/assetIdentity.selfcheck.js
const assert = require('assert')
const { findDuplicateAsset } = require('./assetIdentity')

async function main() {
  const existing = [
    { id: 'a1', title: 'Existing Plot', titleDeedNumber: 'MH-PUN-10231', latitude: 18.5204, longitude: 73.8567 },
  ]
  const fakePrisma = { listing: { findMany: async () => existing } }

  const deedDup = await findDuplicateAsset(fakePrisma, {
    ownerId: 'u1',
    titleDeedNumber: 'mh-pun-10231',
    latitude: 20,
    longitude: 70,
  })
  assert(deedDup && deedDup.matchedOn.includes('title_deed_number'), 'expected deed-number duplicate to be flagged')

  const geoDup = await findDuplicateAsset(fakePrisma, {
    ownerId: 'u1',
    titleDeedNumber: 'SOME-OTHER-DEED',
    latitude: 18.52045,
    longitude: 73.85672,
  })
  assert(geoDup && geoDup.matchedOn.includes('geometry_fingerprint'), 'expected geo-proximity duplicate to be flagged')

  const noDup = await findDuplicateAsset(fakePrisma, {
    ownerId: 'u1',
    titleDeedNumber: 'DL-NDL-30021',
    latitude: 28.6,
    longitude: 77.2,
  })
  assert(noDup === null, 'expected distinct property to not be flagged')

  console.log('assetIdentity self-check passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
