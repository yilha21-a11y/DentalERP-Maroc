import { describe, expect, it } from 'vitest'
import {
  calculateTVA,
  formatCurrency,
  formatDate,
  formatPhone,
  generateInvoiceNo,
  generatePatientId,
  normalizeMoroccoPhone,
  validateICE,
  validateMoroccoPhone,
} from '@/lib/utils'

describe('utils Maroc', () => {
  it('formats currency as MAD', () => {
    expect(formatCurrency(1000)).toContain('MAD')
    expect(formatCurrency(1234.56)).toContain('MAD')
  })

  it('formats a French date', () => {
    expect(formatDate(new Date('2026-01-15T12:00:00Z')).toLowerCase()).toContain('jan')
  })

  it('normalizes and formats +212 numbers', () => {
    expect(normalizeMoroccoPhone('0612345678')).toBe('+212612345678')
    expect(formatPhone('0612345678')).toBe('+212 6 12 34 56 78')
  })

  it('validates Moroccan phones', () => {
    expect(validateMoroccoPhone('0612345678')).toBe(true)
    expect(validateMoroccoPhone('0212345678')).toBe(false)
  })

  it('generates non-trivial patient identifiers', () => {
    const a = generatePatientId()
    const b = generatePatientId()
    expect(a).toMatch(/^PAT\d{4}\d{6}$/)
    expect(a).not.toBe(b)
  })

  it('generates invoice identifiers in French convention', () => {
    const value = generateInvoiceNo()
    expect(value).toMatch(/^FAC-\d{6}-\d{6}$/)
  })

  it('calculates TVA', () => {
    expect(calculateTVA(100, 20)).toEqual({ subtotal: 100, tva: 20, total: 120 })
    expect(calculateTVA(100, 10)).toEqual({ subtotal: 100, tva: 10, total: 110 })
  })

  it('validates a 15-digit ICE', () => {
    expect(validateICE('001234567000089')).toBe(true)
    expect(validateICE('')).toBe(false)
  })
})
