// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import {
  createPatientToken,
  generateOTP,
  hashOTP,
  verifyOTPHash,
} from '@/lib/patient-auth'

afterEach(() => {
  delete process.env.PATIENT_JWT_SECRET
})

describe('patient portal security helpers', () => {
  it('generateOTP returns a cryptographically generated 6-digit string', () => {
    for (let i = 0; i < 50; i++) {
      const otp = generateOTP()
      expect(otp).toMatch(/^\d{6}$/)
      expect(Number(otp)).toBeGreaterThanOrEqual(100000)
      expect(Number(otp)).toBeLessThan(1000000)
    }
  })

  it('does not generate a constant OTP', () => {
    const otps = new Set(Array.from({ length: 20 }, () => generateOTP()))
    expect(otps.size).toBeGreaterThan(1)
  })

  it('stores OTPs as one-way hashes', async () => {
    const otp = '123456'
    const hash = await hashOTP(otp)

    expect(hash).not.toBe(otp)
    expect(hash.length).toBeGreaterThan(20)
    expect(await verifyOTPHash(otp, hash)).toBe(true)
    expect(await verifyOTPHash('654321', hash)).toBe(false)
  })

  it('fails safely for a legacy plaintext OTP value', async () => {
    expect(await verifyOTPHash('123456', '123456')).toBe(false)
  })

  it('refuses to create patient tokens without a dedicated secret', async () => {
    delete process.env.PATIENT_JWT_SECRET

    await expect(
      createPatientToken({
        patientId: 'patient-1',
        hospitalId: 'hospital-1',
        phone: '+212600000000',
        authVersion: 0,
      })
    ).rejects.toThrow(/PATIENT_JWT_SECRET/)
  })

  it('creates a patient token when a strong dedicated secret is configured', async () => {
    process.env.PATIENT_JWT_SECRET = 'test-patient-secret-that-is-longer-than-32-characters'

    const token = await createPatientToken({
      patientId: 'patient-1',
      hospitalId: 'hospital-1',
      phone: '+212600000000',
      authVersion: 0,
    })

    expect(token.split('.')).toHaveLength(3)
  })
})
