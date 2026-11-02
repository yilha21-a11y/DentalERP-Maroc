import { describe, it, expect } from 'vitest'
import { navigation, getNavigationForRole } from '@/config/nav'

function section(title: string) {
  return navigation.find((item) => item.title === title)
}

describe('navigation DentalERP Maroc', () => {
  it('contains the French sections', () => {
    const titles = navigation.map((item) => item.title)
    expect(titles).toEqual(
      expect.arrayContaining([
        'Vue générale',
        'Soins patients',
        'Finances',
        'Relation patient',
        'Opérations',
        'Administration',
      ])
    )
  })

  it('shows the French dashboard and AI labels', () => {
    const titles = section('Vue générale')!.items.map((item) => item.title)
    expect(titles).toContain('Tableau de bord')
    expect(titles).toContain('Assistant IA')
  })

  it('restricts settings to admins', () => {
    const settings = section('Administration')!.items.find((item) => item.title === 'Paramètres')
    expect(settings?.roles).toEqual(['ADMIN'])
  })

  it('allows reception to manage waiting list and billing', () => {
    const nav = getNavigationForRole('RECEPTIONIST')
    const care = nav.find((item) => item.title === 'Soins patients')!
    const appointments = care.items.find((item) => item.title === 'Rendez-vous')!
    expect(appointments.subItems?.map((item) => item.title)).toContain('Liste d’attente')
    expect(nav.find((item) => item.title === 'Finances')?.items.map((item) => item.title)).toContain('Facturation')
  })

  it('allows assistants in waiting room, inventory and lab', () => {
    const nav = getNavigationForRole('ASSISTANT')
    expect(nav.find((item) => item.title === 'Soins patients')?.items.map((item) => item.title)).toContain('Salle d’attente')
    const ops = nav.find((item) => item.title === 'Opérations')!
    expect(ops.items.map((item) => item.title)).toEqual(expect.arrayContaining(['Stock', 'Laboratoire']))
  })

  it('does not expose settings to doctors', () => {
    const nav = getNavigationForRole('DOCTOR')
    const admin = nav.find((item) => item.title === 'Administration')
    expect(admin?.items.map((item) => item.title) || []).not.toContain('Paramètres')
  })

  it('filters empty sections for unknown roles', () => {
    getNavigationForRole('UNKNOWN').forEach((item) => {
      expect(item.items.length).toBeGreaterThan(0)
    })
  })
})
