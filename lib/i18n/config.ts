/**
 * Locale configuration for DentalERP Maroc.
 *
 * The Morocco edition is French-only for now. Keeping a single locale avoids
 * language-switching complexity while preserving the existing next-intl
 * architecture for a future expansion if needed.
 */

export const locales = ['fr-MA'] as const

export type Locale = (typeof locales)[number]

/** French (Morocco) is the default and only supported locale. */
export const defaultLocale: Locale = 'fr-MA'

export interface LocaleDefaults {
  /** ISO 4217 currency code. */
  currency: string
  /** ISO 3166-1 alpha-2 country code. */
  country: string
  /** IANA timezone. */
  timezone: string
}

export const localeDefaults: Record<Locale, LocaleDefaults> = {
  'fr-MA': { currency: 'MAD', country: 'MA', timezone: 'Africa/Casablanca' },
}

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value)
}

export function resolveLocale(value: string | null | undefined): Locale {
  return isSupportedLocale(value) ? value : defaultLocale
}

export function resolveLocaleCascade(...candidates: (string | null | undefined)[]): Locale {
  for (const candidate of candidates) {
    if (isSupportedLocale(candidate)) return candidate
  }
  return defaultLocale
}

export function resolvePublicLocale(
  hospitalLocale: string | null | undefined,
  langParam?: string | string[] | null
): Locale {
  const requested = Array.isArray(langParam) ? langParam[0] : langParam
  return resolveLocaleCascade(requested, hospitalLocale)
}

export function getLocaleDefaults(value: string | null | undefined): LocaleDefaults {
  return localeDefaults[resolveLocale(value)]
}

export function getLocaleLabel(locale: string, displayIn = 'fr'): string {
  try {
    return (
      new Intl.DisplayNames([displayIn], {
        type: 'language',
        languageDisplay: 'standard',
      }).of(locale) ?? locale
    )
  } catch {
    return locale
  }
}
