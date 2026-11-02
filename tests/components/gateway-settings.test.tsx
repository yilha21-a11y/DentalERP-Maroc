import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}))

import { GatewaySettings } from '@/components/billing/gateway-settings'

describe('GatewaySettings — Maroc', () => {
  it('clearly shows that online payments are disabled', () => {
    render(<GatewaySettings />)
    expect(screen.getByText('Paiement en ligne')).toBeInTheDocument()
    expect(screen.getByText('Désactivé')).toBeInTheDocument()
    expect(screen.getByText(/anciennes passerelles.*désactivées/i)).toBeInTheDocument()
  })

  it('does not render legacy India provider names', () => {
    render(<GatewaySettings />)
    expect(screen.queryByText(/Razorpay/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/PhonePe/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Paytm/i)).not.toBeInTheDocument()
  })
})
