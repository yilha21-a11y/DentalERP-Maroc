import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'

export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole()
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT w.id, w.status, w.roomLabel, w.arrivedAt, w.calledAt,
           a.id appointmentId, a.scheduledTime,
           p.firstName, LEFT(p.lastName,1) lastInitial,
           s.firstName doctorFirstName, s.lastName doctorLastName
    FROM WaitingRoomEntry w
    JOIN Appointment a ON a.id = w.appointmentId
    JOIN Patient p ON p.id = a.patientId
    JOIN Staff s ON s.id = a.doctorId
    WHERE w.hospitalId = ? AND w.status <> 'CANCELLED'
      AND DATE(w.arrivedAt) = CURRENT_DATE()
    ORDER BY FIELD(w.status,'CALLED','IN_CONSULTATION','WAITING','COMPLETED'), w.arrivedAt ASC
  `, hospitalId)

  return NextResponse.json({ success: true, data: rows })
}

export async function POST(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'RECEPTIONIST', 'DOCTOR'])
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const appointmentId = String(body.appointmentId || '')
  if (!appointmentId) return NextResponse.json({ error: 'appointmentId requis' }, { status: 400 })

  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, hospitalId } })
  if (!appointment) return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 })

  const id = randomUUID()
  await prisma.$executeRawUnsafe(`
    INSERT INTO WaitingRoomEntry (id,hospitalId,appointmentId,status,arrivedAt,updatedAt)
    VALUES (?,?,?,'WAITING',NOW(3),NOW(3))
    ON DUPLICATE KEY UPDATE status='WAITING', arrivedAt=NOW(3), updatedAt=NOW(3)
  `, id, hospitalId, appointmentId)

  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'CHECKED_IN', checkedInAt: new Date() } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'RECEPTIONIST', 'DOCTOR'])
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const id = String(body.id || '')
  const status = String(body.status || '')
  const roomLabel = body.roomLabel ? String(body.roomLabel) : null
  const allowed = ['WAITING','CALLED','IN_CONSULTATION','COMPLETED','CANCELLED']
  if (!id || !allowed.includes(status)) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const timestampColumn: Record<string,string> = {
    CALLED: 'calledAt=NOW(3),', IN_CONSULTATION: 'startedAt=NOW(3),', COMPLETED: 'completedAt=NOW(3),'
  }
  await prisma.$executeRawUnsafe(`UPDATE WaitingRoomEntry SET status=?, roomLabel=?, ${timestampColumn[status] || ''} updatedAt=NOW(3) WHERE id=? AND hospitalId=?`, status, roomLabel, id, hospitalId)
  return NextResponse.json({ success: true })
}
