import type { NextRequest } from 'next/server'
import { handlers } from '@/lib/auth'
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/security/rate-limit'

export const { GET } = handlers

// Limite de débit sur la connexion par identifiants (POST /api/auth/callback/credentials)
export async function POST(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith('/callback/credentials')) {
    const limit = rateLimit('web-login-ip:' + getClientIp(req), 20, 15 * 60 * 1000)
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds)
  }
  return handlers.POST(req)
}
