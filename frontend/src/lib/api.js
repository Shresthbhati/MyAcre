const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  buyPlots: (token, listingId, { selections, paymentMethod, simulatePaymentFailure }) =>
    request(`/api/listings/${listingId}/buy`, {
      method: 'POST',
      token,
      body: { selections, paymentMethod, simulatePaymentFailure },
    }),
}
