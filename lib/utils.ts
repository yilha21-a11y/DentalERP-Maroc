import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatDateTime as baseFormatDateTime,
} from '@/lib/i18n/format'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, locale?: string): string {
  return baseFormatCurrency(amount, { locale })
}

export function formatDate(date: Date | string, locale?: string): string {
  return baseFormatDate(date, { locale })
}

export function formatDateTime(date: Date | string, locale?: string): string {
  return baseFormatDateTime(date, { locale })
}

export function normalizeMoroccoPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('212') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+212${digits.slice(1)}`
  if (digits.length === 9 && /^[5-8]/.test(digits)) return `+212${digits}`
  return phone.trim()
}

export function formatPhone(phone: string): string {
  const normalized = normalizeMoroccoPhone(phone)
  const digits = normalized.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('212')) {
    const local = digits.slice(3)
    return `+212 ${local.slice(0, 1)} ${local.slice(1, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`
  }
  return phone
}

export function validateMoroccoPhone(phone: string): boolean {
  return /^\+212[5-8]\d{8}$/.test(normalizeMoroccoPhone(phone))
}

function secureDigits(length: number): string {
  const values = new Uint32Array(length)
  globalThis.crypto.getRandomValues(values)
  return Array.from(values, (value) => String(value % 10)).join('')
}

export function generatePatientId(): string {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `PAT${year}${month}${secureDigits(6)}`
}

export function generateInvoiceNo(): string {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `FAC-${year}${month}-${secureDigits(6)}`
}

export function calculateTVA(amount: number, rate = 20) {
  const tax = (amount * rate) / 100
  return {
    subtotal: amount,
    tva: tax,
    total: amount + tax,
  }
}

/**
 * ICE marocain : 15 chiffres. Cette vérification contrôle le format,
 * pas l'existence du numéro dans un registre officiel.
 */
export function validateICE(ice: string): boolean {
  return /^\d{15}$/.test(ice.replace(/\s/g, ''))
}
