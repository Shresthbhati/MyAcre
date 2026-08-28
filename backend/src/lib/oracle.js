// Mock land-title oracle: a real government registry integration is out of
// scope for the hackathon demo. Instead we check the submitted deed number
// against a small hardcoded "registry" standing in for verified records —
// same idea as the KYC PAN check, just for property titles.
const SAMPLE_REGISTRY = [
  'MH-PUN-10231',
  'MH-PUN-10456',
  'MH-PUN-10789',
  'KA-BLR-20114',
  'KA-BLR-20558',
  'DL-NDL-30021',
  'TN-CHN-40092',
]

function verifyTitle(titleDeedNumber) {
  const normalized = (titleDeedNumber || '').trim().toUpperCase()
  const verified = SAMPLE_REGISTRY.includes(normalized)
  return {
    verified,
    reason: verified
      ? null
      : 'Deed number not found in registry records. Try one of the sample deed numbers from the demo dataset.',
  }
}

module.exports = { verifyTitle, SAMPLE_REGISTRY }
