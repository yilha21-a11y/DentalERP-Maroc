/**
 * Normalisation des numéros marocains au format E.164 (+212XXXXXXXXX).
 * Retourne null si le numéro n'est pas un numéro marocain plausible.
 */
export function normalizeMoroccoE164(input: string | null | undefined): string | null {
  if (!input) return null
  let digits = String(input).replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)

  let national: string
  if (digits.startsWith('212')) national = digits.slice(3)
  else if (digits.startsWith('0')) national = digits.slice(1)
  else national = digits

  if (!/^[5-8]\d{8}$/.test(national)) return null
  return '+212' + national
}

/**
 * Variantes de stockage possibles d'un même numéro (les fiches patient
 * existantes peuvent être en 06…, 2126… ou +2126…).
 */
export function moroccoPhoneVariants(e164: string): string[] {
  const national = e164.replace(/^\+212/, '')
  return ['+212' + national, '212' + national, '0' + national, national]
}
