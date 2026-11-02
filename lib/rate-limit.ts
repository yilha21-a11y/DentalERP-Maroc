import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const keyHash = hashKey(key)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + windowMs)

  const existing = await prisma.rateLimitBucket.findUnique({ where: { keyHash } })

  if (!existing || existing.expiresAt <= now) {
    await prisma.rateLimitBucket.upsert({
      where: { keyHash },
      create: { keyHash, count: 1, expiresAt },
      update: { count: 1, expiresAt },
    })
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 }
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000))
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  const updated = await prisma.rateLimitBucket.update({
    where: { keyHash },
    data: { count: { increment: 1 } },
    select: { count: true },
  })

  return {
    allowed: true,
    remaining: Math.max(0, limit - updated.count),
    retryAfterSeconds: 0,
  }
}
