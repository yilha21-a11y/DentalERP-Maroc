import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { PERMISSIONS, getDefaultPermissions, type Permission } from '@/lib/permissions'

const ROLES = ['DOCTOR','ASSISTANT','RECEPTIONIST','ACCOUNTANT','LAB_TECH'] as const

export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const overrides = await prisma.$queryRawUnsafe<any[]>(
    `SELECT role,permission,allowed FROM RolePermission WHERE hospitalId=?`, hospitalId
  ).catch(() => [])

  const data: Record<string,Record<string,boolean>> = {}
  for (const role of ROLES) {
    const defaults = getDefaultPermissions(role)
    data[role] = Object.fromEntries(PERMISSIONS.map((permission) => [permission, defaults.includes(permission)]))
  }
  for (const row of overrides) {
    if (data[row.role] && PERMISSIONS.includes(row.permission as Permission)) {
      data[row.role][row.permission] = Boolean(row.allowed)
    }
  }

  return NextResponse.json({ success: true, roles: ROLES, permissions: PERMISSIONS, data })
}

export async function PUT(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const role = String(body.role || '')
  const permission = String(body.permission || '') as Permission
  const allowed = Boolean(body.allowed)

  if (!ROLES.includes(role as any) || !PERMISSIONS.includes(permission)) {
    return NextResponse.json({ error: 'Rôle ou permission invalide' }, { status: 400 })
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO RolePermission (id,hospitalId,role,permission,allowed,createdAt,updatedAt)
     VALUES (UUID(),?,?,?,?,NOW(3),NOW(3))
     ON DUPLICATE KEY UPDATE allowed=VALUES(allowed),updatedAt=NOW(3)`,
    hospitalId, role, permission, allowed
  )

  return NextResponse.json({ success: true })
}
