import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatPhone,
  normalizeMoroccoPhone,
  validateICE,
  validateMoroccoPhone,
} from '@/lib/utils'

describe('localisation Maroc', () => {
  it('formats money in MAD', () => {
    expect(formatCurrency(500)).toContain('MAD')
    expect(formatCurrency(100000)).toContain('MAD')
  })

  it('formats dates in French Morocco', () => {
    const value = formatDate(new Date('2026-12-25T12:00:00Z'))
    expect(value.toLowerCase()).toContain('déc')
    expect(value).toContain('2026')
  })

  it('normalizes Moroccan mobile numbers', () => {
    expect(normalizeMoroccoPhone('06 12 34 56 78')).toBe('+212612345678')
    expect(normalizeMoroccoPhone('+212 6 12 34 56 78')).toBe('+212612345678')
  })

  it('formats Moroccan mobile numbers for display', () => {
    expect(formatPhone('0612345678')).toBe('+212 6 12 34 56 78')
  })

  it('validates Moroccan phone format', () => {
    expect(validateMoroccoPhone('0612345678')).toBe(true)
    expect(validateMoroccoPhone('+212712345678')).toBe(true)
    expect(validateMoroccoPhone('+919876543210')).toBe(false)
  })

  it('validates ICE format', () => {
    expect(validateICE('001234567000089')).toBe(true)
    expect(validateICE('123')).toBe(false)
    expect(validateICE('00123456700008A')).toBe(false)
  })
})
