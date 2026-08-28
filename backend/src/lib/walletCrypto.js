const crypto = require('crypto')

// Encrypts custodial wallet private keys at rest (AES-256-GCM) so a DB leak
// alone doesn't expose them. WALLET_ENCRYPTION_KEY is a 32-byte hex string
// generated once for this deployment — it's an internal secret, not a
// third-party credential, so we generate a default if one isn't set rather
// than asking the user for it.
const KEY = crypto.createHash('sha256').update(process.env.WALLET_ENCRYPTION_KEY || 'myacre-dev-only-key').digest()

function encrypt(plainText) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

function decrypt(payload) {
  const raw = Buffer.from(payload, 'base64')
  const iv = raw.subarray(0, 12)
  const authTag = raw.subarray(12, 28)
  const encrypted = raw.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

module.exports = { encrypt, decrypt }
