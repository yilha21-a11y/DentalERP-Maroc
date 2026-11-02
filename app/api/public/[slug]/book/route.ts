import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePatientAuth } from '@/lib/patient-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const bookingSchema = z.object({
  // Kept optional for backward-compatible clients; identity comes from the signed patient cookie.
  phone: z.string().optional(),
  doctorId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  type: z.enum(['CONSULTATION', 'PROCEDURE', 'FOLLOW_UP', 'EMERGENCY', 'CHECK_UP']).optional(),
  chiefComplaint: z.string().trim().max(2000).optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const auth = await requirePatientAuth(req)
    if (auth.error || !auth.patient) {
      return auth.error || NextResponse.json({ error: 'Authentification patient requise' }, { status: 401 })
    }

    const rate = await checkRateLimit(
      `patient-booking:${auth.patient.id}:${getClientIp(req)}`,
      20,
      10 * 60 * 1000
    )
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      )
    }

    const parsed = bookingSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données de rendez-vous invalides' }, { status: 400 })
    }

    const { slug } = await params
    const { doctorId, date, time, type, chiefComplaint } = parsed.data

    const hospital = await prisma.hospital.findUnique({
      where: { slug },
      select: { id: true, patientPortalEnabled: true, isActive: true },
    })

    if (
      !hospital ||
      !hospital.isActive ||
      !hospital.patientPortalEnabled ||
      hospital.id !== auth.patient.hospitalId
    ) {
      return NextResponse.json({ error: 'Réservation indisponible' }, { status: 404 })
    }

    const doctor = await prisma.staff.findFirst({
      where: { id: doctorId, hospitalId: hospital.id },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Praticien introuvable' }, { status: 404 })
    }

    const dateObj = new Date(`${date}T00:00:00`)
    if (Number.isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
    }

    const now = new Date()
    const requestedDateTime = new Date(`${date}T${time}:00`)
    if (Number.isNaN(requestedDateTime.getTime()) || requestedDateTime <= now) {
      return NextResponse.json({ error: 'Le rendez-vous doit être dans le futur' }, { status: 400 })
    }

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        hospitalId: hospital.id,
        doctorId,
        scheduledDate: dateObj,
        scheduledTime: time,
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
      },
      select: { id: true, patientId: true },
    })

    if (conflictingAppointment) {
      return NextResponse.json({ error: 'Ce créneau n’est plus disponible' }, { status: 409 })
    }

    const appointmentNo = `APT-${date.replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`

    const appointment = await prisma.appointment.create({
      data: {
        hospitalId: hospital.id,
        appointmentNo,
        patientId: auth.patient.id,
        doctorId,
        scheduledDate: dateObj,
        scheduledTime: time,
        appointmentType: type || 'CONSULTATION',
        status: 'SCHEDULED',
        chiefComplaint: chiefComplaint || null,
      },
    })

    return NextResponse.json(
      {
        success: true,
        appointment: {
          appointmentNo: appointment.appointmentNo,
          date: appointment.scheduledDate,
          time: appointment.scheduledTime,
          doctor: `Dr ${doctor.firstName} ${doctor.lastName}`,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Public booking error:', err)
    return NextResponse.json({ error: 'Impossible de réserver le rendez-vous' }, { status: 500 })
  }
}
