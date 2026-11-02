import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateOTP,
  hashOTP,
  safeEqualHex,
  createPatientToken,
  verifyPatientToken,
} from '@/lib/patient-auth'

const SECRET = 'a-test-secret-that-is-at-least-32-chars-long!'

describe('generateOTP()', () => {
  it('returns a 6-digit string', () => {
    expect(generateOTP()).toMatch(/^\d{6}$/)
  })

  it('generates varying OTPs (not constant)', () => {
    const otps = new Set(Array.from({ length: 20 }, () => generateOTP()))
    expect(otps.size).toBeGreaterThan(1)
  })
})

describe('PATIENT_PORTAL_JWT_SECRET (fail-closed)', () => {
  beforeEach(() => {
    process.env.PATIENT_PORTAL_JWT_SECRET = SECRET
  })

  it('throws when the secret is missing', async () => {
    delete process.env.PATIENT_PORTAL_JWT_SECRET
    await expect(
      createPatientToken({ patientId: 'p', hospitalId: 'h', phone: '+212612345678', sv: 0 })
    ).rejects.toThrow(/PATIENT_PORTAL_JWT_SECRET/)
  })

  it('throws when the secret is shorter than 32 characters', () => {
    process.env.PATIENT_PORTAL_JWT_SECRET = 'too-short'
    expect(() => hashOTP('h', '+212612345678', '123456')).toThrow(/PATIENT_PORTAL_JWT_SECRET/)
  })

  it('does not fall back to NEXTAUTH_SECRET', () => {
    delete process.env.PATIENT_PORTAL_JWT_SECRET
    process.env.NEXTAUTH_SECRET = 'x'.repeat(48)
    expect(() => hashOTP('h', '+212612345678', '123456')).toThrow()
  })
})

describe('patient token and OTP hash', () => {
  beforeEach(() => {
    process.env.PATIENT_PORTAL_JWT_SECRET = SECRET
  })

  it('round-trips a token with issuer/audience and session version', async () => {
    const token = await createPatientToken({
      patientId: 'p1',
      hospitalId: 'h1',
      phone: '+212612345678',
      sv: 3,
    })
    const payload = await verifyPatientToken(token)
    expect(payload?.patientId).toBe('p1')
    expect(payload?.sv).toBe(3)
  })

  it('rejects a token signed with another secret', async () => {
    const token = await createPatientToken({
      patientId: 'p1',
      hospitalId: 'h1',
      phone: '+212612345678',
      sv: 0,
    })
    process.env.PATIENT_PORTAL_JWT_SECRET = 'another-secret-that-is-also-32-chars-long'
    expect(await verifyPatientToken(token)).toBeNull()
  })

  it('hashes OTPs deterministically per clinic/phone and compares safely', () => {
    const a = hashOTP('h1', '+212612345678', '123456')
    expect(a).not.toContain('123456')
    expect(safeEqualHex(a, hashOTP('h1', '+212612345678', '123456'))).toBe(true)
    expect(safeEqualHex(a, hashOTP('h2', '+212612345678', '123456'))).toBe(false)
    expect(safeEqualHex(a, hashOTP('h1', '+212612345678', '654321'))).toBe(false)
  })
})
