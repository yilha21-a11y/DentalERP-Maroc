// Billing & Financial Management Utilities

import {
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  InsuranceClaimStatus,
  DiscountType,
} from '@prisma/client'
import {
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatDateTime as baseFormatDateTime,
} from '@/lib/i18n/format'

// Invoice Status Configuration
export const invoiceStatusConfig: Record<
  InvoiceStatus,
  {
    label: string
    color: string
    bgColor: string
    description: string
  }
> = {
  DRAFT: {
    label: 'Brouillon',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: 'Facture en préparation',
  },
  PENDING: {
    label: 'En attente',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    description: 'Facture émise, en attente de règlement',
  },
  PARTIALLY_PAID: {
    label: 'Partiellement réglée',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Paiement partiel reçu',
  },
  PAID: {
    label: 'Payée',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Paiement intégral reçu',
  },
  OVERDUE: {
    label: 'En retard',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Échéance dépassée',
  },
  CANCELLED: {
    label: 'Annulée',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: 'Facture annulée',
  },
  REFUNDED: {
    label: 'Remboursée',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Paiement remboursé',
  },
}

// Payment Method Configuration
export const paymentMethodConfig: Record<
  PaymentMethod,
  {
    label: string
    icon: string
    description: string
  }
> = {
  CASH: {
    label: 'Espèces',
    icon: 'Banknote',
    description: 'Paiement en espèces',
  },
  CARD: {
    label: 'Carte',
    icon: 'CreditCard',
    description: 'Carte bancaire',
  },
  UPI: {
    label: 'Paiement mobile',
    icon: 'Smartphone',
    description: 'Moyen de paiement mobile hérité',
  },
  BANK_TRANSFER: {
    label: 'Virement bancaire',
    icon: 'Building2',
    description: 'Virement bancaire',
  },
  CHEQUE: {
    label: 'Chèque',
    icon: 'FileText',
    description: 'Paiement par chèque',
  },
  INSURANCE: {
    label: 'Assurance',
    icon: 'Shield',
    description: 'Règlement par assurance',
  },
  WALLET: {
    label: 'Portefeuille numérique',
    icon: 'Wallet',
    description: 'Portefeuille numérique',
  },
  ONLINE: {
    label: 'En ligne',
    icon: 'Globe',
    description: 'Paiement en ligne (désactivé tant qu’aucune passerelle Maroc n’est configurée)',
  },
}

// Payment Status Configuration
export const paymentStatusConfig: Record<
  PaymentStatus,
  {
    label: string
    color: string
    bgColor: string
  }
> = {
  PENDING: {
    label: 'En attente',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  COMPLETED: {
    label: 'Terminé',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  FAILED: {
    label: 'Échoué',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  REFUNDED: {
    label: 'Remboursée',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  CANCELLED: {
    label: 'Annulée',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
}

// Insurance Claim Status Configuration
export const insuranceClaimStatusConfig: Record<
  InsuranceClaimStatus,
  {
    label: string
    color: string
    bgColor: string
    description: string
  }
> = {
  DRAFT: {
    label: 'Brouillon',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: 'Claim is being prepared',
  },
  SUBMITTED: {
    label: 'Soumise',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Demande transmise à l’assureur',
  },
  UNDER_REVIEW: {
    label: 'En cours d’étude',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    description: 'Demande en cours d’étude par l’assureur',
  },
  APPROVED: {
    label: 'Approuvée',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Demande approuvée par l’assureur',
  },
  PARTIALLY_APPROVED: {
    label: 'Partiellement approuvée',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    description: 'Demande partiellement approuvée',
  },
  REJECTED: {
    label: 'Rejetée',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Demande rejetée par l’assureur',
  },
  SETTLED: {
    label: 'Réglée',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    description: 'Règlement reçu de l’assureur',
  },
}

// Discount Type Configuration
export const discountTypeConfig: Record<
  DiscountType,
  {
    label: string
    symbol: string
  }
> = {
  PERCENTAGE: {
    label: 'Pourcentage',
    symbol: '%',
  },
  FIXED: {
    label: 'Montant fixe',
    symbol: 'MAD',
  },
}

// Configuration TVA Maroc.
// The default rate is configurable; 20% is used only as an application default,
// not as legal/tax advice for every dental act.
export const taxConfig = {
  defaultRate: 20,
  defaultTaxable: true,
}

export function calculateTax(
  subtotal: number,
  taxRate: number = taxConfig.defaultRate
): {
  subtotal: number
  taxAmount: number
  grandTotal: number
} {
  const taxAmount = (subtotal * taxRate) / 100
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    grandTotal: Math.round((subtotal + taxAmount) * 100) / 100,
  }
}

// Calculate discount
export function calculateDiscount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number
): {
  discountAmount: number
  afterDiscount: number
} {
  let discountAmount: number

  if (discountType === 'PERCENTAGE') {
    discountAmount = (subtotal * discountValue) / 100
  } else {
    discountAmount = discountValue
  }

  // Ensure discount doesn't exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal)

  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    afterDiscount: Math.round((subtotal - discountAmount) * 100) / 100,
  }
}

// Calculate invoice totals
export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unitPrice: number; taxable: boolean }>,
  discountType: DiscountType = 'FIXED',
  discountValue: number = 0,
  taxRate: number = taxConfig.defaultRate
): {
  subtotal: number
  discountAmount: number
  taxableAmount: number
  nonTaxableAmount: number
  cgstAmount: number
  sgstAmount: number
  totalTax: number
  totalAmount: number
} {
  // Calculate subtotals
  let taxableSubtotal = 0
  let nonTaxableSubtotal = 0

  items.forEach((item) => {
    const itemTotal = item.quantity * item.unitPrice
    if (item.taxable) {
      taxableSubtotal += itemTotal
    } else {
      nonTaxableSubtotal += itemTotal
    }
  })

  const subtotal = taxableSubtotal + nonTaxableSubtotal

  // Apply discount proportionally
  const { discountAmount } = calculateDiscount(subtotal, discountType, discountValue)

  // Proportional discount for taxable amount
  const taxableDiscountRatio = subtotal > 0 ? taxableSubtotal / subtotal : 0
  const taxableDiscount = discountAmount * taxableDiscountRatio
  const taxableAmount = taxableSubtotal - taxableDiscount
  const nonTaxableAmount = nonTaxableSubtotal - (discountAmount - taxableDiscount)

  // TVA on the taxable amount. Legacy fields are preserved temporarily for
  // database compatibility: cgstAmount stores TVA and sgstAmount stays zero.
  const cgstAmount = (taxableAmount * taxRate) / 100
  const sgstAmount = 0
  const totalTax = cgstAmount

  const totalAmount = taxableAmount + nonTaxableAmount + totalTax

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    nonTaxableAmount: Math.round(nonTaxableAmount * 100) / 100,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  }
}

// Invoices always show both decimal places, unlike the summary figures
// elsewhere in the app.
export function formatCurrency(
  amount: number | string | null | undefined,
  locale?: string
): string {
  return baseFormatCurrency(amount, {
    locale,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Format date for display
export function formatDate(date: Date | string | null | undefined, locale?: string): string {
  return baseFormatDate(date, { locale })
}

// Format date-time for display
export function formatDateTime(date: Date | string | null | undefined, locale?: string): string {
  return baseFormatDateTime(date, { locale, hour12: true })
}

// Generate Invoice Number
export async function generateInvoiceNo(prisma: any, prefix: string = 'INV'): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const datePrefix = `${prefix}-${year}${month}-`

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNo: {
        startsWith: datePrefix,
      },
    },
    orderBy: {
      invoiceNo: 'desc',
    },
    select: {
      invoiceNo: true,
    },
  })

  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNo.slice(-4))
    return `${datePrefix}${String(lastNumber + 1).padStart(4, '0')}`
  }

  return `${datePrefix}0001`
}

// Generate Payment Number
export async function generatePaymentNo(prisma: any, prefix: string = 'PAY'): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const datePrefix = `${prefix}-${year}${month}-`

  const lastPayment = await prisma.payment.findFirst({
    where: {
      paymentNo: {
        startsWith: datePrefix,
      },
    },
    orderBy: {
      paymentNo: 'desc',
    },
    select: {
      paymentNo: true,
    },
  })

  if (lastPayment) {
    const lastNumber = parseInt(lastPayment.paymentNo.slice(-4))
    return `${datePrefix}${String(lastNumber + 1).padStart(4, '0')}`
  }

  return `${datePrefix}0001`
}

// Generate Insurance Claim Number
export async function generateClaimNo(prisma: any, prefix: string = 'CLM'): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const datePrefix = `${prefix}-${year}${month}-`

  const lastClaim = await prisma.insuranceClaim.findFirst({
    where: {
      claimNumber: {
        startsWith: datePrefix,
      },
    },
    orderBy: {
      claimNumber: 'desc',
    },
    select: {
      claimNumber: true,
    },
  })

  if (lastClaim) {
    const lastNumber = parseInt(lastClaim.claimNumber.slice(-4))
    return `${datePrefix}${String(lastNumber + 1).padStart(4, '0')}`
  }

  return `${datePrefix}0001`
}

// Get patient display name
export function getPatientName(
  patient: {
    firstName: string
    lastName: string
    patientId?: string
  } | null
): string {
  if (!patient) return 'Patient inconnu'
  return `${patient.firstName} ${patient.lastName}`
}

// Calculate balance amount
export function calculateBalance(totalAmount: number, paidAmount: number): number {
  return Math.round((totalAmount - paidAmount) * 100) / 100
}

// Check if invoice is overdue
export function isInvoiceOverdue(dueDate: Date | string | null, status: InvoiceStatus): boolean {
  if (!dueDate) return false
  if (status === 'PAID' || status === 'CANCELLED' || status === 'REFUNDED') {
    return false
  }

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  return due < today
}

// Get days until due / days overdue
export function getDueDays(dueDate: Date | string | null): {
  days: number
  isOverdue: boolean
  label: string
} {
  if (!dueDate) return { days: 0, isOverdue: false, label: 'Aucune échéance' }

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      days: Math.abs(diffDays),
      isOverdue: true,
      label: `${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''} de retard`,
    }
  } else if (diffDays === 0) {
    return { days: 0, isOverdue: false, label: 'Échéance aujourd’hui' }
  } else {
    return {
      days: diffDays,
      isOverdue: false,
      label: `Échéance dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`,
    }
  }
}

// Payment method icons mapping for Lucide icons
export const paymentMethodIcons = {
  CASH: 'Banknote',
  CARD: 'CreditCard',
  UPI: 'Smartphone',
  BANK_TRANSFER: 'Building2',
  CHEQUE: 'FileText',
  INSURANCE: 'Shield',
  WALLET: 'Wallet',
  ONLINE: 'Globe',
} as const

// Common payment terms
export const paymentTermsOptions = [
  { value: 0, label: 'Paiement immédiat' },
  { value: 7, label: 'Échéance 7 jours' },
  { value: 15, label: 'Échéance 15 jours' },
  { value: 30, label: 'Échéance 30 jours' },
  { value: 45, label: 'Échéance 45 jours' },
  { value: 60, label: 'Échéance 60 jours' },
]

// Calculate due date from invoice date
export function calculateDueDate(invoiceDate: Date, paymentTermDays: number): Date {
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + paymentTermDays)
  return dueDate
}

// Montant en toutes lettres pour les factures (dirhams marocains).
export function numberToWords(num: number): string {
  if (!Number.isFinite(num) || num < 0) return ''
  const units = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize']
  const tens: Record<number,string> = {20:'vingt',30:'trente',40:'quarante',50:'cinquante',60:'soixante'}

  function underHundred(n: number): string {
    if (n <= 16) return units[n]
    if (n < 20) return 'dix-' + units[n - 10]
    if (n < 70) {
      const ten = Math.floor(n / 10) * 10
      const rest = n % 10
      if (!rest) return tens[ten]
      if (rest === 1) return tens[ten] + ' et un'
      return tens[ten] + '-' + units[rest]
    }
    if (n < 80) {
      if (n === 71) return 'soixante et onze'
      return 'soixante-' + underHundred(n - 60)
    }
    if (n === 80) return 'quatre-vingts'
    return 'quatre-vingt-' + underHundred(n - 80)
  }

  function integerWords(n: number): string {
    if (n < 100) return underHundred(n)
    if (n < 1000) {
      const hundreds = Math.floor(n / 100)
      const rest = n % 100
      const prefix = hundreds === 1 ? 'cent' : units[hundreds] + ' cent'
      return rest ? prefix + ' ' + integerWords(rest) : prefix
    }
    if (n < 1_000_000) {
      const thousands = Math.floor(n / 1000)
      const rest = n % 1000
      const prefix = thousands === 1 ? 'mille' : integerWords(thousands) + ' mille'
      return rest ? prefix + ' ' + integerWords(rest) : prefix
    }
    if (n < 1_000_000_000) {
      const millions = Math.floor(n / 1_000_000)
      const rest = n % 1_000_000
      const prefix = millions === 1 ? 'un million' : integerWords(millions) + ' millions'
      return rest ? prefix + ' ' + integerWords(rest) : prefix
    }
    const billions = Math.floor(n / 1_000_000_000)
    const rest = n % 1_000_000_000
    const prefix = billions === 1 ? 'un milliard' : integerWords(billions) + ' milliards'
    return rest ? prefix + ' ' + integerWords(rest) : prefix
  }

  const dirhams = Math.floor(num)
  const centimes = Math.round((num - dirhams) * 100)
  let result = `${integerWords(dirhams)} dirham${dirhams > 1 ? 's' : ''}`
  if (centimes > 0) {
    result += ` et ${integerWords(centimes)} centime${centimes > 1 ? 's' : ''}`
  }
  return result
}

// Report date range presets
export const dateRangePresets = [
  { label: 'Aujourd’hui', value: 'today' },
  { label: 'Hier', value: 'yesterday' },
  { label: 'Cette semaine', value: 'this_week' },
  { label: 'Semaine dernière', value: 'last_week' },
  { label: 'Ce mois-ci', value: 'this_month' },
  { label: 'Mois dernier', value: 'last_month' },
  { label: 'Ce trimestre', value: 'this_quarter' },
  { label: 'Trimestre dernier', value: 'last_quarter' },
  { label: 'Cette année', value: 'this_year' },
  { label: 'Année dernière', value: 'last_year' },
  { label: 'Période personnalisée', value: 'custom' },
]

// Get date range from preset
export function getDateRangeFromPreset(preset: string): {
  startDate: Date
  endDate: Date
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: endOfDay }

    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const endYesterday = new Date(yesterday)
      endYesterday.setHours(23, 59, 59, 999)
      return { startDate: yesterday, endDate: endYesterday }
    }

    case 'this_week': {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      return { startDate: startOfWeek, endDate: endOfDay }
    }

    case 'last_week': {
      const startOfLastWeek = new Date(today)
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7)
      const endOfLastWeek = new Date(startOfLastWeek)
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
      endOfLastWeek.setHours(23, 59, 59, 999)
      return { startDate: startOfLastWeek, endDate: endOfLastWeek }
    }

    case 'this_month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      return { startDate: startOfMonth, endDate: endOfDay }
    }

    case 'last_month': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      endOfLastMonth.setHours(23, 59, 59, 999)
      return { startDate: startOfLastMonth, endDate: endOfLastMonth }
    }

    case 'this_quarter': {
      const quarter = Math.floor(today.getMonth() / 3)
      const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1)
      return { startDate: startOfQuarter, endDate: endOfDay }
    }

    case 'last_quarter': {
      const currentQuarter = Math.floor(today.getMonth() / 3)
      const lastQuarter = currentQuarter - 1
      const year = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear()
      const actualQuarter = lastQuarter < 0 ? 3 : lastQuarter
      const startOfLastQuarter = new Date(year, actualQuarter * 3, 1)
      const endOfLastQuarter = new Date(year, (actualQuarter + 1) * 3, 0)
      endOfLastQuarter.setHours(23, 59, 59, 999)
      return { startDate: startOfLastQuarter, endDate: endOfLastQuarter }
    }

    case 'this_year': {
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      return { startDate: startOfYear, endDate: endOfDay }
    }

    case 'last_year': {
      const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1)
      const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31)
      endOfLastYear.setHours(23, 59, 59, 999)
      return { startDate: startOfLastYear, endDate: endOfLastYear }
    }

    default:
      return { startDate: today, endDate: endOfDay }
  }
}
