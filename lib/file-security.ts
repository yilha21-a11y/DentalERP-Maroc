const IMAGE_SIGNATURES: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.length >= 8 &&
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/gif': (b) => {
    const head = b.subarray(0, 6).toString('ascii')
    return head === 'GIF87a' || head === 'GIF89a'
  },
  'image/webp': (b) =>
    b.length >= 12 &&
    b.subarray(0, 4).toString('ascii') === 'RIFF' &&
    b.subarray(8, 12).toString('ascii') === 'WEBP',
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
}

function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-'
}

function isZip(buffer: Buffer): boolean {
  if (buffer.length < 4) return false
  const sig = buffer.subarray(0, 4)
  return (
    sig.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
    sig.equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) ||
    sig.equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]))
  )
}

function isOle(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
  )
}

export function validateImageSignature(buffer: Buffer, mime: string): boolean {
  const validator = IMAGE_SIGNATURES[mime]
  return Boolean(validator?.(buffer))
}

export function validateDocumentSignature(buffer: Buffer, mime: string): boolean {
  if (IMAGE_SIGNATURES[mime]) return validateImageSignature(buffer, mime)
  if (mime === 'application/pdf') return isPdf(buffer)
  if (mime === 'application/msword') return isOle(buffer)
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return isZip(buffer)
  }
  return false
}

export function validateImportSignature(buffer: Buffer, extension: string): boolean {
  switch (extension) {
    case 'pdf':
      return isPdf(buffer)
    case 'xlsx':
      return isZip(buffer)
    case 'xls':
      return isOle(buffer)
    case 'csv':
      // Reject binary data masquerading as CSV. Parsers still validate the structure.
      return buffer.length > 0 && !buffer.subarray(0, Math.min(buffer.length, 4096)).includes(0)
    default:
      return false
  }
}

export function extensionForMime(mime: string): string | null {
  return MIME_EXTENSIONS[mime] || null
}

export function safeDownloadName(name: string): string {
  const cleaned = name
    .replace(/[\r\n\0]/g, '')
    .replace(/[\\/]/g, '_')
    .replace(/[";]/g, '_')
    .trim()
  return (cleaned || 'document').slice(0, 180)
}
