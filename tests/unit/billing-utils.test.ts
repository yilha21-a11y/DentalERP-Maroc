import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  invoiceStatusConfig,
  paymentMethodConfig,
  discountTypeConfig,
  taxConfig,
  calculateTax,
  calculateDiscount,
  calculateInvoiceTotals,
  calculateBalance,
  formatCurrency,
  getDueDays,
  isInvoiceOverdue,
  numberToWords,
  getDateRangeFromPreset,
} from '@/lib/billing-utils'

describe('billing utils — Maroc', () => {
  it('uses French invoice labels', () => {
    expect(invoiceStatusConfig.PAID.label).toBe('Payée')
    expect(invoiceStatusConfig.PENDING.label).toBe('En attente')
  })

  it('uses Morocco-friendly payment labels', () => {
    expect(paymentMethodConfig.CASH.label).toBe('Espèces')
    expect(paymentMethodConfig.BANK_TRANSFER.label).toBe('Virement bancaire')
    expect(discountTypeConfig.FIXED.symbol).toBe('MAD')
  })

  it('calculates TVA with configurable rate', () => {
    expect(taxConfig.defaultRate).toBe(20)
    expect(calculateTax(100)).toEqual({ subtotal: 100, taxAmount: 20, grandTotal: 120 })
    expect(calculateTax(200, 10)).toEqual({ subtotal: 200, taxAmount: 20, grandTotal: 220 })
  })

  it('calculates fixed and percentage discounts', () => {
    expect(calculateDiscount(1000, 'PERCENTAGE', 10)).toEqual({
      discountAmount: 100,
      afterDiscount: 900,
    })
    expect(calculateDiscount(1000, 'FIXED', 150)).toEqual({
      discountAmount: 150,
      afterDiscount: 850,
    })
  })

  it('does not allow a discount above subtotal', () => {
    expect(calculateDiscount(100, 'FIXED', 500)).toEqual({
      discountAmount: 100,
      afterDiscount: 0,
    })
  })

  it('calculates invoice totals with TVA in the legacy tax columns', () => {
    const result = calculateInvoiceTotals(
      [{ quantity: 2, unitPrice: 100, taxable: true }],
      'FIXED',
      0,
      20
    )
    expect(result.subtotal).toBe(200)
    expect(result.cgstAmount).toBe(40)
    expect(result.sgstAmount).toBe(0)
    expect(result.totalTax).toBe(40)
    expect(result.totalAmount).toBe(240)
  })

  it('formats invoice amounts in MAD', () => {
    const value = formatCurrency(1234.56)
    expect(value).toContain('MAD')
    expect(value).toMatch(/1[.\s]234,56/)
  })

  it('calculates remaining balance', () => {
    expect(calculateBalance(1200, 450)).toBe(750)
  })

  it('spells amounts in French dirhams', () => {
    expect(numberToWords(0)).toBe('zéro dirham')
    expect(numberToWords(100)).toContain('cent dirhams')
    expect(numberToWords(100.5)).toContain('cinquante centimes')
    expect(numberToWords(1_000_000)).toContain('un million')
  })

  describe('due dates', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-15T10:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('detects overdue invoices', () => {
      expect(isInvoiceOverdue('2026-06-10', 'PENDING')).toBe(true)
      expect(isInvoiceOverdue('2026-06-10', 'PAID')).toBe(false)
    })

    it('returns French due labels', () => {
      expect(getDueDays('2026-06-15').label).toBe('Échéance aujourd’hui')
      expect(getDueDays('2026-06-17').label).toContain('Échéance dans 2 jours')
    })

    it('returns preset date ranges', () => {
      expect(getDateRangeFromPreset('today').startDate.getDate()).toBe(15)
      expect(getDateRangeFromPreset('this_month').startDate.getDate()).toBe(1)
    })
  })
})
