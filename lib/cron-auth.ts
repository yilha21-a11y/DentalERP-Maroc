import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

/**
 * Vérifie le secret des routes cron (en-tête `Authorization: Bearer <CRON_SECRET>`).
 *
 * Fail-closed : refuse si CRON_SECRET est absent ou vide, ou si l'en-tête est
 * absent / mal formé. Aucune valeur par défaut. Comparaison en temps constant.
 */
export function isValidCronRequest(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected || expected.trim().length === 0) return false

  const header = req.headers.get('authorization')
  if (!header || !header.startsWith('Bearer ')) return false
  const provided = header.slice('Bearer '.length)
  if (provided.length === 0) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual exige des longueurs identiques.
  if (a.length !== b.length) {
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}

/**
 * Retourne une réponse 401 si la requête n'est pas autorisée, sinon null.
 */
export function requireCronAuth(req: Request): NextResponse | null {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
