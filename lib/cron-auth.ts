import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Shared authentication guard for cron endpoints.
 * Returns null when authorized, otherwise a response that must be returned.
 */
export function requireCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET

  // Never allow "Bearer undefined" or an empty secret.
  if (!secret || secret.length < 16) {
    console.error('CRON_SECRET is missing or too short')
    return NextResponse.json({ error: 'Cron service unavailable' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`

  if (!safeEqual(authHeader, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
