import { NextRequest, NextResponse } from 'next/server'
import { Prisma, WaitingRoomStatus } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { verifyWaitingRoomDisplayToken } from '@/lib/waiting-room-display-token'

const createSchema = z.object({
  appointmentId: z.string().min(1),
})

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED']),
  roomLabel: z.string().trim().max(100).nullable().optional(),
})

async function resolveHospitalId(req: NextRequest): Promise<
  | { hospitalId: string; response?: never }
  | { hospitalId?: never; response: NextResponse }
> {
  const token = new URL(req.url).searchParams.get('token')

  if (token) {
    const payload = await verifyWaitingRoomDisplayToken(token)
    if (!payload) {
      return {
        response: NextResponse.json({ error: 'Jeton d’affichage invalide ou expiré' }, { status: 401 }),
      }
    }
    return { hospitalId: payload.hospitalId }
  }

  const authResult = await requireAuthAndRole()
  if (authResult.error || !authResult.hospitalId) {
    return {
      response:
        authResult.error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 }),
    }
  }
  return { hospitalId: authResult.hospitalId }
}

export async function GET(req: NextRequest) {
  const resolved = await resolveHospitalId(req)
  if (resolved.response) return resolved.response

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const entries = await prisma.waitingRoomEntry.findMany({
    where: {
      hospitalId: resolved.hospitalId,
      status: { not: 'CANCELLED' },
      arrivedAt: { gte: start, lt: end },
    },
    include: {
      appointment: {
        select: {
          id: true,
          scheduledTime: true,
          patient: {
            select: { firstName: true, lastName: true },
          },
          doctor: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { arrivedAt: 'asc' },
  })

  const priority: Record<WaitingRoomStatus, number> = {
    CALLED: 0,
    IN_CONSULTATION: 1,
    WAITING: 2,
    COMPLETED: 3,
    CANCELLED: 4,
  }

  const data = entries
    .sort((a, b) => priority[a.status] - priority[b.status] || a.arrivedAt.getTime() - b.arrivedAt.getTime())
    .map((entry) => ({
      id: entry.id,
      status: entry.status,
      roomLabel: entry.roomLabel,
      arrivedAt: entry.arrivedAt,
      calledAt: entry.calledAt,
      appointmentId: entry.appointment.id,
      scheduledTime: entry.appointment.scheduledTime,
      firstName: entry.appointment.patient.firstName,
      lastInitial: entry.appointment.patient.lastName.slice(0, 1),
      doctorFirstName: entry.appointment.doctor.firstName,
      doctorLastName: entry.appointment.doctor.lastName,
    }))

  return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'RECEPTIONIST', 'DOCTOR'])
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Rendez-vous invalide' }, { status: 400 })
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, hospitalId },
    select: { id: true },
  })
  if (!appointment) {
    return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 })
  }

  const now = new Date()
  await prisma.$transaction([
    prisma.waitingRoomEntry.upsert({
      where: { appointmentId: appointment.id },
      create: {
        hospitalId,
        appointmentId: appointment.id,
        status: 'WAITING',
        arrivedAt: now,
      },
      update: {
        hospitalId,
        status: 'WAITING',
        roomLabel: null,
        arrivedAt: now,
        calledAt: null,
        startedAt: null,
        completedAt: null,
      },
    }),
    prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CHECKED_IN', checkedInAt: now },
    }),
  ])

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'RECEPTIONIST', 'DOCTOR'])
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const now = new Date()
  const data: Prisma.WaitingRoomEntryUpdateManyMutationInput = {
    status: parsed.data.status as WaitingRoomStatus,
    roomLabel: parsed.data.roomLabel ?? null,
  }

  if (parsed.data.status === 'CALLED') data.calledAt = now
  if (parsed.data.status === 'IN_CONSULTATION') data.startedAt = now
  if (parsed.data.status === 'COMPLETED') data.completedAt = now

  const result = await prisma.waitingRoomEntry.updateMany({
    where: { id: parsed.data.id, hospitalId },
    data,
  })

  if (result.count !== 1) {
    return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
