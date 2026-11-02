// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => import('../__mocks__/prisma'))

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { GET as publicSlotsGET } from '@/app/api/public/[slug]/slots/route'
import { POST as publicOrderPOST } from '@/app/api/payments/public-order/route'
import { POST as publicVerifyPOST } from '@/app/api/payments/public-verify/route'
import { prisma } from '@/lib/prisma'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(path: string, method = 'GET', body?: any): NextRequest {
  const url = `http://localhost${path}`
  const init: any = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(url, init)
}

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) }
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET /api/public/[slug]/slots
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/public/[slug]/slots', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when doctorId or date missing', async () => {
    const res = await publicSlotsGET(makeReq('/api/public/test/slots'), makeParams('test'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when clinic not found', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue(null)

    const res = await publicSlotsGET(
      makeReq('/api/public/test/slots?doctorId=d1&date=2026-03-15'),
      makeParams('test')
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when portal not enabled', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({
      id: 'h1',
      workingHours: null,
      patientPortalEnabled: false,
    } as any)

    const res = await publicSlotsGET(
      makeReq('/api/public/test/slots?doctorId=d1&date=2026-03-15'),
      makeParams('test')
    )
    expect(res.status).toBe(403)
  })

  it('returns no slots on a holiday', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({
      id: 'h1',
      workingHours: null,
      patientPortalEnabled: true,
    } as any)
    vi.mocked(prisma.holiday.findFirst).mockResolvedValue({
      name: 'Republic Day',
    } as any)

    const res = await publicSlotsGET(
      makeReq('/api/public/test/slots?doctorId=d1&date=2026-01-26'),
      makeParams('test')
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.available).toBe(false)
    expect(body.reason).toContain('Republic Day')
    expect(body.slots).toHaveLength(0)
  })

  it('returns 404 when doctor not found', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({
      id: 'h1',
      workingHours: null,
      patientPortalEnabled: true,
    } as any)
    vi.mocked(prisma.holiday.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.staff.findFirst).mockResolvedValue(null)

    const res = await publicSlotsGET(
      makeReq('/api/public/test/slots?doctorId=d-none&date=2026-03-15'),
      makeParams('test')
    )
    expect(res.status).toBe(404)
  })

  it('returns available slots with booked ones marked unavailable', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({
      id: 'h1',
      workingHours: JSON.stringify({
        start: '09:00',
        end: '12:00',
        lunchStart: '13:00',
        lunchEnd: '14:00',
      }),
      patientPortalEnabled: true,
    } as any)
    vi.mocked(prisma.holiday.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.staff.findFirst).mockResolvedValue({ id: 'd1' } as any)
    vi.mocked(prisma.staffShift.findUnique).mockResolvedValue(null) // no shift, uses working hours
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      { scheduledTime: '10:00', duration: 30 },
    ] as any)

    const res = await publicSlotsGET(
      makeReq('/api/public/test/slots?doctorId=d1&date=2026-03-15'),
      makeParams('test')
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.available).toBe(true)
    expect(body.slots.length).toBeGreaterThan(0)

    // 10:00 should be booked
    const bookedSlot = body.slots.find((s: any) => s.time === '10:00')
    expect(bookedSlot.available).toBe(false)

    // 09:00 should be available
    const freeSlot = body.slots.find((s: any) => s.time === '09:00')
    expect(freeSlot.available).toBe(true)
  })

  it('uses doctor shift hours when available', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({
      id: 'h1',
      workingHours: null,
      patientPortalEnabled: true,
    } as any)
    vi.mocked(prisma.holiday.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.staff.findFirst).mockResolvedValue({ id: 'd1' } as any)
    vi.mocked(prisma.staffShift.findUnique).mockResolvedValue({
      startTime: '10:00',
      endTime: '11:00',
    } as any)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([])

    const res = await publicSlotsGET(
      makeReq('/api/public/test/slots?doctorId=d1&date=2026-03-15'),
      makeParams('test')
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    // With 10:00-11:00 shift, should only have 10:00 and 10:30 slots
    expect(body.slots).toHaveLength(2)
    expect(body.slots[0].time).toBe('10:00')
    expect(body.slots[1].time).toBe('10:30')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 2–3. Public online payments are disabled until a Morocco gateway is integrated
// ═════════════════════════════════════════════════════════════════════════════

describe('public payment endpoints', () => {
  it('public-order fails closed', async () => {
    const res = await publicOrderPOST()
    const body = await res.json()
    expect(res.status).toBe(410)
    expect(body.code).toBe('ONLINE_PAYMENT_NOT_CONFIGURED_MA')
  })

  it('public-verify fails closed', async () => {
    const res = await publicVerifyPOST()
    const body = await res.json()
    expect(res.status).toBe(410)
    expect(body.code).toBe('ONLINE_PAYMENT_NOT_CONFIGURED_MA')
  })
})
