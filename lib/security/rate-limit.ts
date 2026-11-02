/**
 * Limiteur de débit en mémoire (fenêtre fixe).
 *
 * Limite connue : l'état est propre à chaque processus. Sur un déploiement
 * multi-instances, la limite effective est multipliée par le nombre
 * d'instances ; brancher Redis (REDIS_URL) pour une limite globale.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let lastSweep = 0

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }
  bucket.count += 1
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

/**
 * Adresse IP du client. X-Forwarded-For n'est fiable que derrière un proxy
 * de confiance (Caddy dans docker-compose.caddy.yml).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  return (req.headers.get('x-real-ip') || 'unknown').slice(0, 64)
}

export function tooManyRequests(
  retryAfterSeconds: number,
  message = 'Trop de requêtes. Réessayez plus tard.'
) {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.max(1, retryAfterSeconds)),
    },
  })
}
