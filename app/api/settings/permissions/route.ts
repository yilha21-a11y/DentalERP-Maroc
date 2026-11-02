import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { PERMISSIONS, getDefaultPermissions, type Permission } from '@/lib/permissions'

const ROLES = ['DOCTOR', 'ASSISTANT', 'RECEPTIONIST', 'ACCOUNTANT', 'LAB_TECH'] as const

const updateSchema = z.object({
  role: z.enum(ROLES),
  permission: z.enum(PERMISSIONS),
  allowed: z.boolean(),
})

export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const overrides = await prisma.rolePermission.findMany({
    where: { hospitalId },
    select: { role: true, permission: true, allowed: true },
  })

  const data: Record<string, Record<string, boolean>> = {}
  for (const role of ROLES) {
    const defaults = getDefaultPermissions(role)
    data[role] = Object.fromEntries(
      PERMISSIONS.map((permission) => [permission, defaults.includes(permission)])
    )
  }

  for (const row of overrides) {
    if (data[row.role] && PERMISSIONS.includes(row.permission as Permission)) {
      data[row.role][row.permission] = row.allowed
    }
  }

  return NextResponse.json({ success: true, roles: ROLES, permissions: PERMISSIONS, data })
}

export async function PUT(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Rôle ou permission invalide' }, { status: 400 })
  }

  const { role, permission, allowed } = parsed.data
  await prisma.rolePermission.upsert({
    where: {
      hospitalId_role_permission: { hospitalId, role, permission },
    },
    create: { hospitalId, role, permission, allowed },
    update: { allowed },
  })

  return NextResponse.json({ success: true })
}
