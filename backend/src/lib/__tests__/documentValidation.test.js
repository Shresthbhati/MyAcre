const { test } = require('node:test')
const assert = require('node:assert/strict')
const { sha256, sanitizeFilename, validateDocument, MAX_SIZE_BYTES } = require('../documentValidation')

test('sha256 is deterministic and content-sensitive', () => {
  const a = sha256(Buffer.from('hello'))
  const b = sha256(Buffer.from('hello'))
  const c = sha256(Buffer.from('hello!'))
  assert.equal(a, b)
  assert.notEqual(a, c)
  assert.equal(a.length, 64) // hex-encoded 32-byte digest
})

test('sanitizeFilename strips path traversal attempts down to a bare filename', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), 'passwd')
  assert.equal(sanitizeFilename('..\\..\\windows\\system32\\evil.exe'), 'evil.exe')
})

test('sanitizeFilename replaces unsafe characters and caps length', () => {
  assert.equal(sanitizeFilename('deed copy (final)!.pdf'), 'deed_copy__final__.pdf')
  const long = 'a'.repeat(300) + '.pdf'
  assert.ok(sanitizeFilename(long).length <= 120)
})

test('sanitizeFilename never returns empty', () => {
  assert.equal(sanitizeFilename(''), 'document')
  assert.equal(sanitizeFilename(null), 'document')
})

test('validateDocument accepts an allowed PDF under the size limit', () => {
  const result = validateDocument({ originalName: 'deed.pdf', mimeType: 'application/pdf', size: 1024 })
  assert.deepEqual(result, { ok: true })
})

test('validateDocument rejects a disallowed extension even with an allowed MIME type', () => {
  const result = validateDocument({ originalName: 'script.exe', mimeType: 'application/pdf', size: 1024 })
  assert.equal(result.ok, false)
  assert.match(result.error, /extension/)
})

test('validateDocument rejects a disallowed MIME type even with an allowed extension', () => {
  // extension spoofed to look like a PDF, but the reported content type is not
  const result = validateDocument({ originalName: 'deed.pdf', mimeType: 'application/x-msdownload', size: 1024 })
  assert.equal(result.ok, false)
  assert.match(result.error, /type/)
})

test('validateDocument rejects an oversized file', () => {
  const result = validateDocument({ originalName: 'deed.pdf', mimeType: 'application/pdf', size: MAX_SIZE_BYTES + 1 })
  assert.equal(result.ok, false)
  assert.match(result.error, /limit/)
})
