// Asset-identity fingerprint: a deterministic check that stops the same
// physical asset from being listed twice under a different title. Uses
// signals already on the Listing row — no new schema needed.
//
// Two listings are treated as the same underlying asset if they share a
// normalized title-deed number, OR sit within ~15m of each other (roughly
// one grid chunk) under the same owner. Either signal alone is enough to
// flag — a coordinate match with the same owner is as suspicious as a
// reused deed number.
const COORD_TOLERANCE_DEGREES = 0.00015 // ~15m at typical Indian latitudes

function normalizeDeed(deed) {
  return (deed || '').trim().toUpperCase()
}

async function findDuplicateAsset(prisma, { ownerId, titleDeedNumber, latitude, longitude }) {
  const normalizedDeed = normalizeDeed(titleDeedNumber)

  const candidates = await prisma.listing.findMany({
    where: { ownerId },
    select: { id: true, title: true, titleDeedNumber: true, latitude: true, longitude: true },
  })

  for (const existing of candidates) {
    const deedMatch = normalizeDeed(existing.titleDeedNumber) === normalizedDeed
    const geoMatch =
      Math.abs(existing.latitude - latitude) < COORD_TOLERANCE_DEGREES &&
      Math.abs(existing.longitude - longitude) < COORD_TOLERANCE_DEGREES

    if (deedMatch || geoMatch) {
      return {
        existingListingId: existing.id,
        existingListingTitle: existing.title,
        matchedOn: [deedMatch && 'title_deed_number', geoMatch && 'geometry_fingerprint'].filter(Boolean),
      }
    }
  }

  return null
}

module.exports = { findDuplicateAsset }
