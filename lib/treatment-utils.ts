import {
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatDateTime as baseFormatDateTime,
} from '@/lib/i18n/format'

// Treatment status colors and labels
export const treatmentStatusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  PLANNED: {
    label: 'Planifié',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  IN_PROGRESS: {
    label: 'En cours',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  COMPLETED: {
    label: 'Terminé',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  CANCELLED: {
    label: 'Annulé',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
}

// Treatment Plan status colors and labels
export const treatmentPlanStatusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  DRAFT: {
    label: 'Brouillon',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  PROPOSED: {
    label: 'Proposé',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  ACCEPTED: {
    label: 'Accepté',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
  },
  IN_PROGRESS: {
    label: 'En cours',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  COMPLETED: {
    label: 'Terminé',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  CANCELLED: {
    label: 'Annulé',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
}

// Treatment Plan Item status colors and labels
export const treatmentPlanItemStatusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  PENDING: {
    label: 'En attente',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  SCHEDULED: {
    label: 'Programmé',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  IN_PROGRESS: {
    label: 'En cours',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  COMPLETED: {
    label: 'Terminé',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  CANCELLED: {
    label: 'Annulé',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
}

// Procedure category colors and labels
export const procedureCategoryConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  PREVENTIVE: {
    label: 'Préventif',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: 'Shield',
  },
  RESTORATIVE: {
    label: 'Restaurateur',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: 'Wrench',
  },
  ENDODONTIC: {
    label: 'Endodontie',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: 'Target',
  },
  PERIODONTIC: {
    label: 'Parodontologie',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    icon: 'Layers',
  },
  PROSTHODONTIC: {
    label: 'Prothèse',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    icon: 'Crown',
  },
  ORTHODONTIC: {
    label: 'Orthodontie',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    icon: 'AlignCenter',
  },
  ORAL_SURGERY: {
    label: 'Chirurgie orale',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: 'Scissors',
  },
  COSMETIC: {
    label: 'Esthétique',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: 'Sparkles',
  },
  DIAGNOSTIC: {
    label: 'Diagnostic',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    icon: 'Search',
  },
  EMERGENCY: {
    label: 'Urgence',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: 'AlertTriangle',
  },
}

// Dental chart tooth condition colors and labels
export const toothConditionConfig: Record<
  string,
  { label: string; color: string; bgColor: string; fillColor: string }
> = {
  HEALTHY: {
    label: 'Saine',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    fillColor: '#22c55e',
  },
  CARIES: {
    label: 'Carie',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    fillColor: '#ef4444',
  },
  FILLED: {
    label: 'Obturée',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    fillColor: '#3b82f6',
  },
  CROWN: {
    label: 'Couronne',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    fillColor: '#f59e0b',
  },
  BRIDGE: {
    label: 'Bridge',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    fillColor: '#a855f7',
  },
  MISSING: {
    label: 'Absente',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    fillColor: '#9ca3af',
  },
  IMPLANT: {
    label: 'Implant',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    fillColor: '#06b6d4',
  },
  ROOT_CANAL: {
    label: 'Traitement canalaire',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    fillColor: '#ec4899',
  },
  EXTRACTION_NEEDED: {
    label: 'Extraction indiquée',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    fillColor: '#f97316',
  },
  VENEER: {
    label: 'Facette',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    fillColor: '#6366f1',
  },
}

// Tooth surface labels (FDI notation)
export const toothSurfaceLabels: Record<string, string> = {
  M: 'Mésial',
  D: 'Distal',
  O: 'Occlusal',
  B: 'Vestibulaire',
  L: 'Lingual',
  I: 'Incisif',
  F: 'Facial',
  P: 'Palatin',
}

// Tooth numbering (Universal/FDI)
export const toothNumbers = {
  // Upper Right (Quadrant 1)
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  // Upper Left (Quadrant 2)
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  // Lower Left (Quadrant 3)
  lowerLeft: [38, 37, 36, 35, 34, 33, 32, 31],
  // Lower Right (Quadrant 4)
  lowerRight: [41, 42, 43, 44, 45, 46, 47, 48],
}

// Tooth names by number (FDI notation)
export const toothNames: Record<number, string> = {
  // Upper Right
  18: '3e molaire supérieure droite',
  17: '2e molaire supérieure droite',
  16: '1re molaire supérieure droite',
  15: '2e prémolaire supérieure droite',
  14: '1re prémolaire supérieure droite',
  13: 'Canine supérieure droite',
  12: 'Incisive latérale supérieure droite',
  11: 'Incisive centrale supérieure droite',
  // Upper Left
  21: 'Incisive centrale supérieure gauche',
  22: 'Incisive latérale supérieure gauche',
  23: 'Canine supérieure gauche',
  24: '1re prémolaire supérieure gauche',
  25: '2e prémolaire supérieure gauche',
  26: '1re molaire supérieure gauche',
  27: '2e molaire supérieure gauche',
  28: '3e molaire supérieure gauche',
  // Lower Left
  31: 'Incisive centrale inférieure gauche',
  32: 'Incisive latérale inférieure gauche',
  33: 'Canine inférieure gauche',
  34: '1re prémolaire inférieure gauche',
  35: '2e prémolaire inférieure gauche',
  36: '1re molaire inférieure gauche',
  37: '2e molaire inférieure gauche',
  38: '3e molaire inférieure gauche',
  // Lower Right
  41: 'Incisive centrale inférieure droite',
  42: 'Incisive latérale inférieure droite',
  43: 'Canine inférieure droite',
  44: '1re prémolaire inférieure droite',
  45: '2e prémolaire inférieure droite',
  46: '1re molaire inférieure droite',
  47: '2e molaire inférieure droite',
  48: '3e molaire inférieure droite',
}

// Format treatment duration in minutes to readable string
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} h`
  }
  return `${hours} h ${mins} min`
}

export function formatCurrency(amount: number | string, locale?: string): string {
  return baseFormatCurrency(amount, { locale })
}

// Parse tooth numbers from string (e.g., "11,12,13" or "11-13")
export function parseToothNumbers(toothString: string): number[] {
  if (!toothString) return []

  const teeth: number[] = []
  const parts = toothString.split(',').map((s) => s.trim())

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      for (let i = start; i <= end; i++) {
        teeth.push(i)
      }
    } else {
      const num = parseInt(part, 10)
      if (!isNaN(num)) {
        teeth.push(num)
      }
    }
  }

  return [...new Set(teeth)].sort((a, b) => a - b)
}

// Format tooth numbers to string
export function formatToothNumbers(teeth: number[]): string {
  if (!teeth || teeth.length === 0) return '-'
  return teeth.sort((a, b) => a - b).join(', ')
}

// Get tooth quadrant from tooth number
export function getToothQuadrant(toothNumber: number): 1 | 2 | 3 | 4 {
  const firstDigit = Math.floor(toothNumber / 10)
  return firstDigit as 1 | 2 | 3 | 4
}

// Check if tooth is a molar
export function isMolar(toothNumber: number): boolean {
  const lastDigit = toothNumber % 10
  return lastDigit >= 6 && lastDigit <= 8
}

// Check if tooth is a premolar
export function isPremolar(toothNumber: number): boolean {
  const lastDigit = toothNumber % 10
  return lastDigit === 4 || lastDigit === 5
}

// Check if tooth is a canine
export function isCanine(toothNumber: number): boolean {
  const lastDigit = toothNumber % 10
  return lastDigit === 3
}

// Check if tooth is an incisor
export function isIncisor(toothNumber: number): boolean {
  const lastDigit = toothNumber % 10
  return lastDigit === 1 || lastDigit === 2
}

// Get tooth type
export function getToothType(toothNumber: number): 'molar' | 'premolar' | 'canine' | 'incisor' {
  if (isMolar(toothNumber)) return 'molar'
  if (isPremolar(toothNumber)) return 'premolar'
  if (isCanine(toothNumber)) return 'canine'
  return 'incisor'
}

// Format date for display
export function formatDate(date: Date | string, locale?: string): string {
  return baseFormatDate(date, { locale })
}

// Format date and time
export function formatDateTime(date: Date | string, locale?: string): string {
  return baseFormatDateTime(date, { locale, hour12: true })
}

// Calculate treatment plan progress percentage
export function calculatePlanProgress(items: { status: string }[]): number {
  if (!items || items.length === 0) return 0
  const completed = items.filter((item) => item.status === 'COMPLETED').length
  return Math.round((completed / items.length) * 100)
}

// Get treatment status badge component props
export function getTreatmentStatusBadge(status: string): { label: string; variant: string } {
  const config = treatmentStatusConfig[status] || treatmentStatusConfig.PLANNED
  return {
    label: config.label,
    variant: status.toLowerCase(),
  }
}
