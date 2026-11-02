import { describe, expect, it } from 'vitest'
import { POST as publicOrder } from '@/app/api/payments/public-order/route'
import { POST as publicVerify } from '@/app/api/payments/public-verify/route'

describe('public payment endpoints', () => {
  it('never accepts a browser-provided amount/order while online payments are disabled', async () => {
    const response = await publicOrder()
    const body = await response.json()
    expect(response.status).toBe(410)
    expect(body.code).toBe('ONLINE_PAYMENT_NOT_CONFIGURED_MA')
  })

  it('never accepts a browser-provided payment verification while disabled', async () => {
    const response = await publicVerify()
    const body = await response.json()
    expect(response.status).toBe(410)
    expect(body.code).toBe('ONLINE_PAYMENT_NOT_CONFIGURED_MA')
  })
})
