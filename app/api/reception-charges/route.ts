import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'

export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN','ACCOUNTANT','RECEPTIONIST','DOCTOR'])
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT rc.*, CONCAT(p.firstName,' ',p.lastName) patientName,
           CONCAT(s.firstName,' ',s.lastName) doctorName
    FROM ReceptionCharge rc
    JOIN Patient p ON p.id=rc.patientId
    JOIN Staff s ON s.id=rc.doctorId
    WHERE rc.hospitalId=?
    ORDER BY FIELD(rc.status,'PENDING','PARTIAL','PAID','CANCELLED'), rc.sentAt DESC
  `, hospitalId)
  return NextResponse.json({ success: true, currency: 'MAD', data: rows })
}

export async function POST(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN','DOCTOR'])
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await req.json()
  const { patientId, treatmentId, doctorId, amount, notes } = body
  if (!patientId || !doctorId || !amount) return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 })

  await prisma.$executeRawUnsafe(
    `INSERT INTO ReceptionCharge (id,hospitalId,patientId,treatmentId,doctorId,amount,discount,amountPaid,status,notes,sentAt,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,0,0,'PENDING',?,NOW(3),NOW(3),NOW(3))`,
    randomUUID(), hospitalId, patientId, treatmentId || null, doctorId, Number(amount), notes || null
  )
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN','ACCOUNTANT','RECEPTIONIST'])
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await req.json()
  const id = String(body.id || '')
  const payment = Number(body.payment || 0)
  const discount = Number(body.discount || 0)
  if (!id || payment < 0 || discount < 0) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  await prisma.$executeRawUnsafe(`
    UPDATE ReceptionCharge
    SET amountPaid = LEAST(amount, amountPaid + ?), discount = discount + ?,
        status = CASE
          WHEN amountPaid + ? + discount + ? >= amount THEN 'PAID'
          WHEN amountPaid + ? > 0 THEN 'PARTIAL'
          ELSE status END,
        paidAt = CASE WHEN amountPaid + ? + discount + ? >= amount THEN NOW(3) ELSE paidAt END,
        updatedAt = NOW(3)
    WHERE id=? AND hospitalId=?
  `, payment, discount, payment, discount, payment, payment, discount, id, hospitalId)

  return NextResponse.json({ success: true })
}
