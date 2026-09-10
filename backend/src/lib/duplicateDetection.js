// Checks a candidate listing against existing ones for likely duplicates
// before it's created. Two signals, kept separate because they carry
// different certainty:
//
// - EXACT: same normalized title deed number already listed. This is a
//   fact, not a guess — deed numbers are the identity anchor everything
//   else (verifyTitle, tokenization) is keyed on.
// - SIMILAR: different deed number, but the location + area line up closely
//   enough that it's very likely the same physical property submitted
//   again (typo'd deed number, or someone probing for a duplicate that
//   slips past the exact check). This is a similarity signal, not proof —
//   callers must say so, not claim certainty.

function normalizeDeed(titleDeedNumber) {
  return (titleDeedNumber || '').trim().toUpperCase()
}

// Equirectangular approximation — plenty accurate at the city scale this
// check operates at, and avoids pulling in a geo library for one distance
// calculation.
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const x = toRad(lon2 - lon1) * Math.cos(toRad((lat1 + lat2) / 2))
  const y = toRad(lat2 - lat1)
  return Math.sqrt(x * x + y * y) * R
}

const SIMILAR_DISTANCE_METERS = 75
const SIMILAR_AREA_TOLERANCE = 0.1 // ±10%

function findDuplicate(candidate, existingListings) {
  const candidateDeed = normalizeDeed(candidate.titleDeedNumber)

  for (const existing of existingListings) {
    if (normalizeDeed(existing.titleDeedNumber) === candidateDeed) {
      return {
        confidence: 'exact',
        matchedListingId: existing.id,
        reason: `Same title deed number ("${candidateDeed}") as an existing listing.`,
      }
    }
  }

  for (const existing of existingListings) {
    if (existing.city !== candidate.city) continue
    const dist = distanceMeters(candidate.latitude, candidate.longitude, existing.latitude, existing.longitude)
    if (dist > SIMILAR_DISTANCE_METERS) continue
    const areaDiff = Math.abs(Number(candidate.areaSqFt) - Number(existing.areaSqFt)) / Number(existing.areaSqFt)
    if (areaDiff > SIMILAR_AREA_TOLERANCE) continue
    return {
      confidence: 'similar',
      matchedListingId: existing.id,
      reason: `Within ${Math.round(dist)}m of an existing listing in ${candidate.city} with a similar area (${Math.round(
        areaDiff * 100,
      )}% difference) — this may be the same property listed under a different deed number.`,
    }
  }

  return null
}

module.exports = { findDuplicate, normalizeDeed, distanceMeters }
