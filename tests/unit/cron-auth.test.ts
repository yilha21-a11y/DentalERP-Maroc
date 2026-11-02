import { afterEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { requireCronAuth } from '@/lib/cron-auth'

afterEach(() => {
  delete process.env.CRON_SECRET
})

function request(authorization?: string) {
  const headers = new Headers()
  if (authorization) headers.set('authorization', authorization)
  return new NextRequest('http://localhost/api/cron/test', { headers })
}

describe('requireCronAuth', () => {
  it('fails closed when CRON_SECRET is missing', () => {
    delete process.env.CRON_SECRET
    const response = requireCronAuth(request('Bearer undefined'))
    expect(response?.status).toBe(503)
  })

  it('rejects a wrong bearer token', () => {
    process.env.CRON_SECRET = '0123456789abcdef0123456789abcdef'
    const response = requireCronAuth(request('Bearer wrong-secret'))
    expect(response?.status).toBe(401)
  })

  it('accepts the configured bearer token', () => {
    process.env.CRON_SECRET = '0123456789abcdef0123456789abcdef'
    const response = requireCronAuth(request(`Bearer ${process.env.CRON_SECRET}`))
    expect(response).toBeNull()
  })
})
