// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => import('../__mocks__/prisma'))

vi.mock('@/lib/patient-auth', () => ({
  generateOTP: vi.fn(() => '123456'),
  hashOTP: vi.fn((_h, _p, otp) => 'hash-' + otp),
  safeEqualHex: vi.fn((a, b) => a === b),
  createPatientToken: vi.fn(() => Promise.resolve('mock-jwt-token')),
  verifyPatientToken: vi.fn(() => Promise.resolve(null)),
  revokePatientSessions: vi.fn(),
  setPatientCookie: vi.fn((response) => response),
  clearPatientCookie: vi.fn((response) => response),
  requirePatientAuth: vi.fn(),
  COOKIE_NAME: 'patient-portal-token',
}))

const sendMock = vi.fn()
let senderConfigured = true
vi.mock('@/lib/services/otp-sender', () => ({
  getOtpSender: () => ({
    name: 'test',
    isConfigured: () => senderConfigured,
    send: sendMock,
  }),
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { POST as sendOtpPOST } from '@/app/api/patient-portal/auth/send-otp/route'
import { POST as verifyOtpPOST } from '@/app/api/patient-portal/auth/verify-otp/route'
import { POST as logoutPOST } from '@/app/api/patient-portal/auth/logout/route'
import { GET as dashboardGET } from '@/app/api/patient-portal/dashboard/route'
import { requirePatientAuth } from '@/lib/patient-auth'
import { prisma } from '@/lib/prisma'

// ── Helpers ──────────────────────────────────────────────────────────────────

let ipCounter = 0
function makeReq(path: string, method = 'POST', body?: any): NextRequest {
  const url = `http://localhost${path}`
  // IP distincte par requête pour ne pas déclencher la limite mémoire
  const init: any = { method, headers: { 'x-forwarded-for': `10.0.0.${++ipCounter}` } }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers['Content-Type'] = 'application/json'
  }
  return new NextRequest(url, init)
}

const PHONE = '0612345678'
const E164 = '+212612345678'

// ═════════════════════════════════════════════════════════════════════════════
// 1. POST /api/patient-portal/auth/send-otp
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/patient-portal/auth/send-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    senderConfigured = true
    vi.mocked(prisma.patientOTP.count).mockResolvedValue(0)
  })

  it('returns 400 when phone or hospitalSlug missing', async () => {
    const res = await sendOtpPOST(makeReq('/api/patient-portal/auth/send-otp', 'POST', { phone: PHONE }))
    expect(res.status).toBe(400)
  })

  it('returns 503 when no OTP provider is configured (fail cleanly)', async () => {
    senderConfigured = false
    const res = await sendOtpPOST(
      makeReq('/api/patient-portal/auth/send-otp', 'POST', { phone: PHONE, hospitalSlug: 'c' })
    )
    expect(res.status).toBe(503)
    expect(prisma.patientOTP.create).not.toHaveBeenCalled()
  })

  it('returns a neutral response when the clinic does not exist', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue(null)
    const res = await sendOtpPOST(
      makeReq('/api/patient-portal/auth/send-otp', 'POST', { phone: PHONE, hospitalSlug: 'nope' })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('returns a neutral response when the patient does not exist', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({
      id: 'h1',
      patientPortalEnabled: true,
      isActive: true,
    } as any)
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null)
    const res = await sendOtpPOST(
      makeReq('/api/patient-portal/auth/send-otp', 'POST', { phone: PHONE, hospitalSlug: 'c' })
    )
    expect(res.status).toBe(200)
    expect(sendMock).not.toHaveBeenCalled()
    expect(prisma.patientOTP.create).not.toHaveBeenCalled()
  })

  it('does not send when the per-phone limit is reached, response stays neutral', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({
      id: 'h1',
      patientPortalEnabled: true,
      isActive: true,
    } as any)
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({ id: 'p1' } as any)
    vi.mocked(prisma.patientOTP.count)
      .mockResolvedValueOnce(0) // limite IP
      .mockResolvedValueOnce(5) // limite numéro
    const res = await sendOtpPOST(
      makeReq('/api/patient-portal/auth/send-otp', 'POST', { phone: PHONE, hospitalSlug: 'c' })
    )
    expect(res.status).toBe(200)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('stores only a hash, normalises to +212, never returns the OTP', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({
      id: 'h1',
      patientPortalEnabled: true,
      isActive: true,
    } as any)
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({ id: 'p1' } as any)
    vi.mocked(prisma.patientOTP.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.patientOTP.create).mockResolvedValue({ id: 'otp1' } as any)

    const res = await sendOtpPOST(
      makeReq('/api/patient-portal/auth/send-otp', 'POST', { phone: PHONE, hospitalSlug: 'c' })
    )
    const text = JSON.stringify(await res.json())

    expect(res.status).toBe(200)
    expect(text).not.toContain('123456')
    expect(prisma.patientOTP.updateMany).toHaveBeenCalled() // anciens OTP invalidés
    const createArg = vi.mocked(prisma.patientOTP.create).mock.calls[0][0]
    expect(createArg.data.phone).toBe(E164)
    expect(createArg.data.otpHash).toBe('hash-123456')
    expect(createArg.data).not.toHaveProperty('otp')
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: E164, code: '123456' }))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 2. POST /api/patient-portal/auth/verify-otp
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/patient-portal/auth/verify-otp', () => {
  beforeEach(() => vi.clearAllMocks())

  const body = (otp = '123456') => ({ phone: PHONE, otp, hospitalSlug: 'c' })

  it('returns 400 when fields missing', async () => {
    const res = await verifyOtpPOST(
      makeReq('/api/patient-portal/auth/verify-otp', 'POST', { phone: PHONE })
    )
    expect(res.status).toBe(400)
  })

  it('returns the same generic error when the clinic does not exist', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue(null)
    const res = await verifyOtpPOST(makeReq('/api/patient-portal/auth/verify-otp', 'POST', body()))
    expect(res.status).toBe(400)
  })

  it('returns 400 when OTP expired or not found', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({ id: 'h1' } as any)
    vi.mocked(prisma.patientOTP.findFirst).mockResolvedValue(null)
    const res = await verifyOtpPOST(makeReq('/api/patient-portal/auth/verify-otp', 'POST', body()))
    expect(res.status).toBe(400)
  })

  it('rejects when max attempts exceeded', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({ id: 'h1' } as any)
    vi.mocked(prisma.patientOTP.findFirst).mockResolvedValue({
      id: 'otp1',
      otpHash: 'hash-123456',
      attempts: 3,
    } as any)
    const res = await verifyOtpPOST(makeReq('/api/patient-portal/auth/verify-otp', 'POST', body()))
    expect(res.status).toBe(400)
    expect(prisma.patientOTP.updateMany).not.toHaveBeenCalled()
  })

  it('increments attempts on wrong OTP', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({ id: 'h1' } as any)
    vi.mocked(prisma.patientOTP.findFirst).mockResolvedValue({
      id: 'otp1',
      otpHash: 'hash-123456',
      attempts: 1,
    } as any)
    vi.mocked(prisma.patientOTP.update).mockResolvedValue({} as any)
    const res = await verifyOtpPOST(
      makeReq('/api/patient-portal/auth/verify-otp', 'POST', body('999999'))
    )
    expect(res.status).toBe(400)
    expect(prisma.patientOTP.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } })
    )
  })

  it('rejects when the atomic consumption loses the race', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({ id: 'h1' } as any)
    vi.mocked(prisma.patientOTP.findFirst).mockResolvedValue({
      id: 'otp1',
      otpHash: 'hash-123456',
      attempts: 0,
    } as any)
    vi.mocked(prisma.patientOTP.updateMany).mockResolvedValue({ count: 0 } as any)
    const res = await verifyOtpPOST(makeReq('/api/patient-portal/auth/verify-otp', 'POST', body()))
    expect(res.status).toBe(400)
  })

  it('verifies OTP and returns patient data', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({ id: 'h1' } as any)
    vi.mocked(prisma.patientOTP.findFirst).mockResolvedValue({
      id: 'otp1',
      otpHash: 'hash-123456',
      attempts: 0,
    } as any)
    vi.mocked(prisma.patientOTP.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({
      id: 'p1',
      hospitalId: 'h1',
      patientId: 'PT001',
      firstName: 'John',
      lastName: 'Doe',
      phone: PHONE,
      email: 'john@example.com',
      portalSessionVersion: 2,
    } as any)

    const res = await verifyOtpPOST(makeReq('/api/patient-portal/auth/verify-otp', 'POST', body()))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.patient.name).toBe('John Doe')
    expect(json.patient.patientId).toBe('PT001')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 3. POST /api/patient-portal/auth/logout
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/patient-portal/auth/logout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('clears patient cookie', async () => {
    const res = await logoutPOST(makeReq('/api/patient-portal/auth/logout', 'POST'))
    expect(res.status).toBe(200)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 4. GET /api/patient-portal/dashboard
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/patient-portal/dashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requirePatientAuth).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      patient: null,
    } as any)

    const res = await dashboardGET(makeReq('/api/patient-portal/dashboard', 'GET'))
    expect(res.status).toBe(401)
  })

  it('returns dashboard data with stats', async () => {
    vi.mocked(requirePatientAuth).mockResolvedValue({
      error: null,
      patient: { id: 'p1', hospitalId: 'h1' },
    } as any)

    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: 'a1',
        scheduledDate: new Date('2026-03-01'),
        status: 'SCHEDULED',
        doctor: { firstName: 'Dr', lastName: 'Smith', specialization: 'General' },
      },
    ] as any)
    vi.mocked(prisma.treatment.findMany).mockResolvedValue([
      {
        id: 't1',
        procedure: { name: 'Cleaning', code: 'CLN' },
        doctor: { firstName: 'Dr', lastName: 'Smith' },
      },
    ] as any)
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      {
        id: 'inv1',
        invoiceNo: 'INV001',
        totalAmount: 5000,
        paidAmount: 2000,
        balanceAmount: 3000,
        status: 'PARTIALLY_PAID',
        dueDate: new Date(),
      },
    ] as any)
    vi.mocked(prisma.appointment.count).mockResolvedValue(10) // total visits

    const res = await dashboardGET(makeReq('/api/patient-portal/dashboard', 'GET'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.upcomingAppointments).toHaveLength(1)
    expect(body.recentTreatments).toHaveLength(1)
    expect(body.outstandingInvoices).toHaveLength(1)
    expect(body.stats.totalVisits).toBe(10)
    expect(body.stats.upcomingCount).toBe(1)
    expect(body.stats.totalOutstanding).toBe(3000)
  })

  it('handles empty dashboard data', async () => {
    vi.mocked(requirePatientAuth).mockResolvedValue({
      error: null,
      patient: { id: 'p1', hospitalId: 'h1' },
    } as any)

    vi.mocked(prisma.appointment.findMany).mockResolvedValue([])
    vi.mocked(prisma.treatment.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.appointment.count).mockResolvedValue(0)

    const res = await dashboardGET(makeReq('/api/patient-portal/dashboard', 'GET'))
    const body = await res.json()

    expect(body.stats.totalVisits).toBe(0)
    expect(body.stats.totalOutstanding).toBe(0)
    expect(body.upcomingAppointments).toHaveLength(0)
  })
})
