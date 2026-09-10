const crypto = require('crypto')
const path = require('path')

// Deliberately small: what a property deed/title document actually is.
// Nothing executable, nothing that needs a MIME sniffer to be safe.
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg'])
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg'])
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

// Never trust the client-supplied filename for anything but display — it's
// attacker-controlled text. Strips directory components (blocks path
// traversal via "../"), keeps only a safe character set, and caps length.
function sanitizeFilename(originalName) {
  const base = path.basename(String(originalName || 'document'))
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '')
  return (cleaned || 'document').slice(0, 120)
}

// Validates what was actually uploaded (extension + reported MIME + size)
// against the allowlist. Returns { ok: true } or { ok: false, error }.
function validateDocument({ originalName, mimeType, size }) {
  if (size > MAX_SIZE_BYTES) {
    return { ok: false, error: `File exceeds the ${MAX_SIZE_BYTES / (1024 * 1024)}MB limit.` }
  }
  const ext = path.extname(String(originalName || '')).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: `File extension "${ext || '(none)'}" is not allowed. Use PDF, PNG, or JPEG.` }
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: `File type "${mimeType}" is not allowed. Use PDF, PNG, or JPEG.` }
  }
  return { ok: true }
}

module.exports = { sha256, sanitizeFilename, validateDocument, MAX_SIZE_BYTES, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS }
