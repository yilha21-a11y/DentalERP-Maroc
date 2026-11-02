import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/api-helpers', () => ({
  getAuthenticatedHospital: vi.fn(),
}))

import { getAuthenticatedHospital } from '@/lib/api-helpers'
import { POST as createOrder } from '@/app/api/payments/create-order/route'
import { POST as createLink } from '@/app/api/payments/link/route'
import { POST as verifyPayment } from '@/app/api/payments/verify/route'

describe('online payments — Morocco fail-closed policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedHospital).mockResolvedValue({
      error: null,
      user: { id: 'u1', role: 'ADMIN' },
      hospitalId: 'h1',
    } as any)
  })

  for (const [name, handler] of [
    ['create-order', createOrder],
    ['payment-link', createLink],
    ['verify', verifyPayment],
  ] as const) {
    it(`${name} returns 410 while no Moroccan gateway is configured`, async () => {
      const response = await handler()
      const body = await response.json()
      expect(response.status).toBe(410)
      expect(body.code).toBe('ONLINE_PAYMENT_NOT_CONFIGURED_MA')
    })
  }

  it('keeps authenticated payment routes private', async () => {
    vi.mocked(getAuthenticatedHospital).mockResolvedValue({
      error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }),
      user: null,
      hospitalId: null,
    } as any)

    expect((await createOrder()).status).toBe(401)
    expect((await createLink()).status).toBe(401)
    expect((await verifyPayment()).status).toBe(401)
  })
})
