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
  verifyKyc: (token, pan) => request('/api/kyc/verify', { method: 'POST', token, body: { pan } }),
  getKycStatus: (token) => request('/api/kyc/status', { token }),
}
