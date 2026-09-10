const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

async function request(path, { method = 'GET', token, body, idempotencyKey } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  syncUser: (token) => request('/api/users/sync', { method: 'POST', token }),
  getMe: (token) => request('/api/users/me', { token }),
  getMyHoldings: (token) => request('/api/users/me/holdings', { token }),
  getMyTransactions: (token) => request('/api/users/me/transactions', { token }),
  verifyKyc: (token, pan) => request('/api/kyc/verify', { method: 'POST', token, body: { pan } }),
  getKycStatus: (token) => request('/api/kyc/status', { token }),

  getListings: () => request('/api/listings'),
  getListing: (id) => request(`/api/listings/${id}`),
  getValuation: (id) => request(`/api/listings/${id}/valuation`),
  getPassport: (id) => request(`/api/listings/${id}/passport`),
  createListing: (token, payload) => request('/api/listings', { method: 'POST', token, body: payload }),
  buyPlots: (token, listingId, { selections, paymentMethod, simulatePaymentFailure, idempotencyKey }) =>
    request(`/api/listings/${listingId}/buy`, {
      method: 'POST',
      token,
      idempotencyKey,
      body: { selections, paymentMethod, simulatePaymentFailure },
    }),
  freezeListing: (token, listingId, reason) =>
    request(`/api/listings/${listingId}/freeze`, { method: 'POST', token, body: { reason } }),
  unfreezeListing: (token, listingId) => request(`/api/listings/${listingId}/unfreeze`, { method: 'POST', token }),

  getDocuments: (token, listingId) => request(`/api/listings/${listingId}/documents`, { token }),
  uploadDocument: async (token, listingId, file) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE_URL}/api/listings/${listingId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
    return data
  },
}
