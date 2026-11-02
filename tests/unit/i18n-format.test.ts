import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  createFormatters,
} from '@/lib/i18n/format'
import {
  defaultLocale,
  getLocaleDefaults,
  isSupportedLocale,
  resolveLocale,
} from '@/lib/i18n/config'

describe('i18n Maroc', () => {
  it('uses fr-MA as the only supported/default locale', () => {
    expect(defaultLocale).toBe('fr-MA')
    expect(isSupportedLocale('fr-MA')).toBe(true)
    expect(isSupportedLocale('en-IN')).toBe(false)
    expect(resolveLocale('en-US')).toBe('fr-MA')
  })

  it('uses Morocco defaults', () => {
    expect(getLocaleDefaults('fr-MA')).toEqual({
      currency: 'MAD',
      country: 'MA',
      timezone: 'Africa/Casablanca',
    })
  })

  it('formats MAD currency with Moroccan locale', () => {
    const value = formatCurrency(1234.56, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    expect(value).toContain('MAD')
    expect(value).toMatch(/1[.\s]234,56/)
  })

  it('formats numbers with Moroccan separators', () => {
    expect(formatNumber(100000)).toMatch(/100[.\s]000/)
  })

  it('formats dates in French', () => {
    const result = formatDate(new Date('2026-01-15T12:00:00Z'))
    expect(result.toLowerCase()).toContain('jan')
    expect(result).toContain('2026')
  })

  it('formats date/time without falling back to India', () => {
    const result = formatDateTime(new Date('2026-03-08T10:15:00Z'))
    expect(result.toLowerCase()).toContain('mar')
    expect(result).not.toContain('₹')
  })

  it('creates formatters bound to fr-MA/MAD', () => {
    const fmt = createFormatters('en-IN')
    expect(fmt.locale).toBe('fr-MA')
    expect(fmt.currency).toBe('MAD')
    expect(fmt.formatCurrency(500)).toContain('MAD')
  })
})
