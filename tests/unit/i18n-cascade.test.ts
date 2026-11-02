import { describe, expect, it } from 'vitest'
import {
  defaultLocale,
  getLocaleDefaults,
  getLocaleLabel,
  resolveLocale,
  resolveLocaleCascade,
  resolvePublicLocale,
} from '@/lib/i18n/config'

describe('locale cascade — DentalERP Maroc', () => {
  it('always falls back to fr-MA for unsupported locale values', () => {
    expect(defaultLocale).toBe('fr-MA')
    expect(resolveLocale(undefined)).toBe('fr-MA')
    expect(resolveLocale('en-IN')).toBe('fr-MA')
    expect(resolveLocale('en-US')).toBe('fr-MA')
  })

  it('resolves supported candidates and ignores unsupported ones', () => {
    expect(resolveLocaleCascade('en-IN', null, 'fr-MA')).toBe('fr-MA')
    expect(resolveLocaleCascade('en-IN', 'en-US')).toBe('fr-MA')
  })

  it('resolves public locale to fr-MA', () => {
    expect(resolvePublicLocale('fr-MA', 'en-IN')).toBe('fr-MA')
    expect(resolvePublicLocale(null, null)).toBe('fr-MA')
  })

  it('returns Morocco financial/time defaults', () => {
    expect(getLocaleDefaults('anything')).toEqual({
      currency: 'MAD',
      country: 'MA',
      timezone: 'Africa/Casablanca',
    })
  })

  it('returns a French locale label', () => {
    expect(getLocaleLabel('fr-MA', 'fr').toLowerCase()).toContain('français')
  })
})
