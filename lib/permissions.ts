import prisma from '@/lib/prisma'

export const PERMISSIONS = [
  'patients.view','patients.edit','clinical.view','clinical.edit','appointments.manage',
  'queue.manage','billing.view','billing.collect','billing.discount','reports.own',
  'reports.all_doctors','staff.manage','settings.manage','inventory.manage','lab.manage',
  'messages.use','messages.broadcast','export.data','delete.records'
] as const

export type Permission = (typeof PERMISSIONS)[number]

const roleDefaults: Record<string, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  DOCTOR: ['patients.view','patients.edit','clinical.view','clinical.edit','appointments.manage','queue.manage','reports.own','messages.use'],
  ASSISTANT: ['patients.view','clinical.view','appointments.manage','queue.manage','inventory.manage','lab.manage','messages.use'],
  RECEPTIONIST: ['patients.view','patients.edit','appointments.manage','queue.manage','billing.view','billing.collect','messages.use'],
  ACCOUNTANT: ['billing.view','billing.collect','billing.discount','reports.all_doctors','export.data','messages.use'],
  LAB_TECH: ['patients.view','lab.manage','inventory.manage','messages.use'],
}

export async function hasPermission(input: {
  hospitalId: string
  role: string
  permission: Permission
}) {
  if (input.role === 'ADMIN') return true

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT allowed FROM RolePermission WHERE hospitalId=? AND role=? AND permission=? LIMIT 1`,
      input.hospitalId,
      input.role,
      input.permission
    )
    if (rows.length) return Boolean(rows[0].allowed)
  } catch {
    // Migration may not have been applied yet; fall back to safe role defaults.
  }

  return (roleDefaults[input.role] || []).includes(input.permission)
}

export function getDefaultPermissions(role: string) {
  return roleDefaults[role] || []
}
