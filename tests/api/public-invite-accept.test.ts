// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '@/tests/__mocks__/prisma'

vi.mock('@/lib/prisma', () => ({ prisma, default: prisma }))
vi.mock('@prisma/client', () => ({
  StaffInviteStatus: { PENDING: 'PENDING', ACCEPTED: 'ACCEPTED', EXPIRED: 'EXPIRED' },
}))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed') } }))
vi.mock('@/lib/services/whatsapp.service', () => ({
  normalizeMoroccoPhone: vi.fn((phone: string) => phone.replace(/\D/g, '').replace(/^0/, '212')),
}))
vi.mock('@/lib/rate-limit', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, retryAfterSeconds: 0 }),
}))

const { POST, GET } = await import('@/app/api/public/invite/accept/route')

const validInvite = {
  id: 'invite-1',
  email: 'dentiste@cabinet.ma',
  name: 'Sara Amrani',
  role: 'DOCTOR',
  token: 'x'.repeat(48),
  status: 'PENDING',
  hospitalId: 'h1',
  expiresAt: new Date(Date.now() + 86400000),
  hospital: { id: 'h1', name: 'Cabinet Test', isActive: true },
}

function post(body: unknown) {
  return new Request('http://localhost/api/public/invite/accept', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}
function get(token?: string) {
  const url = new URL('http://localhost/api/public/invite/accept')
  if (token) url.searchParams.set('token', token)
  return new Request(url)
}

describe('staff invite acceptance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('accepts a valid invite using Morocco phone normalization', async () => {
    ;(prisma.staffInvite.findUnique as any).mockResolvedValue(validInvite)
    ;(prisma.user.findUnique as any).mockResolvedValue(null)
    ;(prisma.$transaction as any).mockImplementation(async (fn: any) =>
      fn({ user: prisma.user, staffInvite: prisma.staffInvite })
    )
    ;(prisma.user.create as any).mockResolvedValue({ id: 'u1' })
    ;(prisma.staffInvite.update as any).mockResolvedValue({})

    const res = await POST(post({
      token: 'x'.repeat(48),
      password: 'MotDePasse123!',
      phone: '0612345678',
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.hospitalName).toBe('Cabinet Test')
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: '+212612345678', locale: 'fr-MA' }),
      })
    )
  })

  it('rejects invalid or expired invites with a neutral error', async () => {
    ;(prisma.staffInvite.findUnique as any).mockResolvedValue(null)
    const res = await POST(post({
      token: 'x'.repeat(48),
      password: 'MotDePasse123!',
      phone: '0612345678',
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalide|expirée/i)
  })

  it('returns invite details for a valid capability token', async () => {
    ;(prisma.staffInvite.findUnique as any).mockResolvedValue(validInvite)
    const res = await GET(get('x'.repeat(48)))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.valid).toBe(true)
    expect(body.invite.hospitalName).toBe('Cabinet Test')
  })
})
