/**
 * Entier aléatoire cryptographiquement sûr dans [0, max[ (Web Crypto,
 * utilisable côté serveur comme côté client), sans biais de modulo.
 */
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 0xffffffff) {
    throw new RangeError('max invalide')
  }
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  let value: number
  do {
    globalThis.crypto.getRandomValues(buf)
    value = buf[0]
  } while (value >= limit)
  return value % max
}
