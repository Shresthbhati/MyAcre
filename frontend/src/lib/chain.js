const EXPLORER_BASE = 'https://amoy.polygonscan.com'

export const txUrl = (hash) => `${EXPLORER_BASE}/tx/${hash}`
export const addressUrl = (address) => `${EXPLORER_BASE}/address/${address}`
