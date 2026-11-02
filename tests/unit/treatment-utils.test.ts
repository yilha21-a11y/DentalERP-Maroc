import { describe, it, expect } from 'vitest'
import {
  treatmentStatusConfig,
  treatmentPlanStatusConfig,
  treatmentPlanItemStatusConfig,
  toothConditionConfig,
  toothNumbers,
  toothNames,
  formatDuration,
  formatCurrency,
  parseToothNumbers,
  formatToothNumbers,
  getToothQuadrant,
  isMolar,
  isPremolar,
  isCanine,
  isIncisor,
  getToothType,
  calculatePlanProgress,
  getTreatmentStatusBadge,
} from '@/lib/treatment-utils'

describe('treatment utilities', () => {
  it('has the core treatment statuses in French', () => {
    expect(treatmentStatusConfig.PLANNED.label).toBe('Planifié')
    expect(treatmentStatusConfig.IN_PROGRESS.label).toBe('En cours')
    expect(treatmentStatusConfig.COMPLETED.label).toBe('Terminé')
    expect(treatmentStatusConfig.CANCELLED.label).toBe('Annulé')
  })

  it('keeps plan and item status maps complete', () => {
    expect(Object.keys(treatmentPlanStatusConfig)).toHaveLength(6)
    expect(treatmentPlanItemStatusConfig.PENDING).toBeDefined()
    expect(treatmentPlanItemStatusConfig.COMPLETED).toBeDefined()
  })

  it('uses French dental chart labels', () => {
    expect(toothConditionConfig.HEALTHY.label).toBe('Saine')
    expect(toothConditionConfig.CARIES.label).toBe('Carie')
    expect(toothNames[11]).toBe('Incisive centrale supérieure droite')
  })

  it('contains 32 unique permanent teeth', () => {
    const all = [
      ...toothNumbers.upperRight,
      ...toothNumbers.upperLeft,
      ...toothNumbers.lowerLeft,
      ...toothNumbers.lowerRight,
    ]
    expect(all).toHaveLength(32)
    expect(new Set(all).size).toBe(32)
  })

  it('formats durations in French notation', () => {
    expect(formatDuration(30)).toBe('30 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(90)).toBe('1 h 30 min')
  })

  it('formats treatment prices in MAD', () => {
    expect(formatCurrency(2500)).toContain('MAD')
    expect(formatCurrency('1500')).toContain('MAD')
  })

  it('parses and formats FDI tooth numbers', () => {
    expect(parseToothNumbers('11, 21-23, 31')).toEqual([11, 21, 22, 23, 31])
    expect(formatToothNumbers([21, 11, 31])).toBe('11, 21, 31')
  })

  it('classifies teeth correctly', () => {
    expect(getToothQuadrant(11)).toBe(1)
    expect(isMolar(16)).toBe(true)
    expect(isPremolar(14)).toBe(true)
    expect(isCanine(13)).toBe(true)
    expect(isIncisor(11)).toBe(true)
    expect(getToothType(16)).toBe('molar')
  })

  it('calculates treatment plan progress', () => {
    expect(calculatePlanProgress([])).toBe(0)
    expect(calculatePlanProgress([{ status: 'COMPLETED' }, { status: 'PENDING' }])).toBe(50)
    expect(calculatePlanProgress([{ status: 'COMPLETED' }, { status: 'COMPLETED' }])).toBe(100)
  })

  it('returns a French fallback treatment badge', () => {
    expect(getTreatmentStatusBadge('COMPLETED').label).toBe('Terminé')
    expect(getTreatmentStatusBadge('UNKNOWN').label).toBe('Planifié')
  })
})
