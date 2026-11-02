import { describe, expect, it } from 'vitest'
import { POST } from '@/app/api/webhooks/payment/[provider]/route'

describe('legacy payment webhooks', () => {
  it('rejects all legacy provider webhooks while Morocco integration is absent', async () => {
    const response = await POST()
    const body = await response.json()
    expect(response.status).toBe(410)
    expect(body.code).toBe('ONLINE_PAYMENT_NOT_CONFIGURED_MA')
  })
})
