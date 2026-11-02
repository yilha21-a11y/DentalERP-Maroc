// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => import('../__mocks__/prisma'))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed') } }))
vi.mock('@/lib/api-helpers', () => ({
  generateUniqueSlug: vi.fn().mockResolvedValue('cabinet-test'),
  generateToken: vi.fn().mockReturnValue('a'.repeat(48)),
  PLAN_LIMITS: { FREE: { patientLimit: 100, staffLimit: 5, storageLimitMb: 500 } },
}))
vi.mock('@/lib/email-helpers', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/services/whatsapp.service', () => ({
  normalizeMoroccoPhone: vi.fn((phone: string) => phone.replace(/\D/g, '').replace(/^0/, '212')),
}))
vi.mock('@/lib/rate-limit', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 }),
}))
vi.mock('@prisma/client', () => ({
  Plan: { FREE: 'FREE' },
  Role: { ADMIN: 'ADMIN' },
}))

import { POST as signupPOST } from '@/app/api/public/signup/route'
import { POST as verifyPOST, GET as verifyGET } from '@/app/api/public/verify-email/route'
import { prisma } from '@/lib/prisma'

function req(path: string, body?: unknown, method = 'POST') {
  return new Request(`http://localhost${path}`, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
}

const signup = {
  hospitalName: 'Cabinet Dentaire Test',
  adminName: 'Sara Amrani',
  email: 'dentiste@cabinet.ma',
  phone: '0612345678',
  password: 'MotDePasse123!',
}

describe('public clinic signup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects invalid payloads', async () => {
    const res = await signupPOST(req('/api/public/signup', { hospitalName: 'A' }))
    expect(res.status).toBe(400)
  })

  it('does not reveal whether an email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as any)
    const res = await signupPOST(req('/api/public/signup', signup))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.error).toBeUndefined()
  })

  it('creates Morocco defaults and an admin in one transaction', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const tx = {
      hospital: { create: vi.fn().mockResolvedValue({ id: 'h1' }) },
      user: { create: vi.fn().mockResolvedValue({ id: 'u1' }) },
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx))

    const res = await signupPOST(req('/api/public/signup', signup))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(tx.hospital.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          locale: 'fr-MA',
          country: 'MA',
          currency: 'MAD',
          timezone: 'Africa/Casablanca',
          emailVerificationToken: 'a'.repeat(48),
        }),
      })
    )
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'dentiste@cabinet.ma',
          phone: '+212612345678',
          role: 'ADMIN',
          locale: 'fr-MA',
        }),
      })
    )
  })
})

describe('email verification', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects missing/short tokens', async () => {
    expect((await verifyPOST(req('/api/public/verify-email', { token: 'bad' }))).status).toBe(400)
  })

  it('consumes a valid token', async () => {
    vi.mocked(prisma.hospital.findFirst).mockResolvedValue({ id: 'h1', slug: 'cabinet-test' } as any)
    vi.mocked(prisma.hospital.update).mockResolvedValue({} as any)

    const res = await verifyPOST(req('/api/public/verify-email', { token: 'x'.repeat(48) }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.hospitalSlug).toBe('cabinet-test')
    expect(prisma.hospital.update).toHaveBeenCalledWith({
      where: { id: 'h1' },
      data: { emailVerificationToken: null, emailVerificationExpiry: null },
    })
  })

  it('GET validates a current token without exposing the clinic email', async () => {
    vi.mocked(prisma.hospital.findFirst).mockResolvedValue({ name: 'Cabinet Test' } as any)
    const res = await verifyGET(new Request(`http://localhost/api/public/verify-email?token=${'x'.repeat(48)}`))
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.hospitalName).toBe('Cabinet Test')
    expect(body.email).toBeUndefined()
  })
})
