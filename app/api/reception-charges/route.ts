import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'

export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN','ACCOUNTANT','RECEPTIONIST','DOCTOR'])
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT rc.*, CONCAT(p.firstName,' ',p.lastName) patientName,
           CONCAT(s.firstName,' ',s.lastName) doctorName,
           (SELECT rp.method FROM ReceptionPayment rp WHERE rp.chargeId=rc.id ORDER BY rp.createdAt DESC LIMIT 1) lastPaymentMethod
    FROM ReceptionCharge rc
    JOIN Patient p ON p.id=rc.patientId
    JOIN Staff s ON s.id=rc.doctorId
    WHERE rc.hospitalId=?
    ORDER BY FIELD(rc.status,'PENDING','PARTIAL','PAID','CANCELLED'), rc.sentAt DESC
  `, hospitalId)
  return NextResponse.json({ success: true, currency: 'MAD', data: rows })
}

export async function POST(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN','DOCTOR'])
  if (error || !hospitalId || !user?.id) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const patientId = String(body.patientId || '')
  const treatmentId = body.treatmentId ? String(body.treatmentId) : null
  let doctorId = String(body.doctorId || '')
  const numericAmount = Number(body.amount)
  const notes = body.notes ? String(body.notes) : null

  if (!patientId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: 'Données incomplètes ou montant invalide' }, { status: 400 })
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, hospitalId },
    select: { id: true },
  })
  if (!patient) return NextResponse.json({ error: 'Patient introuvable dans ce cabinet' }, { status: 404 })

  if (user.role === 'DOCTOR') {
    const ownStaff = await prisma.staff.findFirst({
      where: { hospitalId, userId: user.id, isActive: true },
      select: { id: true },
    })
    if (!ownStaff) return NextResponse.json({ error: 'Profil dentiste introuvable' }, { status: 403 })
    doctorId = ownStaff.id
  } else {
    if (!doctorId) return NextResponse.json({ error: 'Dentiste requis' }, { status: 400 })
    const doctor = await prisma.staff.findFirst({
      where: { id: doctorId, hospitalId, isActive: true },
      select: { id: true },
    })
    if (!doctor) return NextResponse.json({ error: 'Dentiste introuvable dans ce cabinet' }, { status: 404 })
  }

  if (treatmentId) {
    const treatment = await prisma.treatment.findFirst({
      where: { id: treatmentId, hospitalId, patientId, doctorId },
      select: { id: true },
    })
    if (!treatment) {
      return NextResponse.json({ error: 'Traitement incompatible avec ce patient ou ce dentiste' }, { status: 400 })
    }
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO ReceptionCharge (id,hospitalId,patientId,treatmentId,doctorId,amount,discount,amountPaid,status,notes,sentAt,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,0,0,'PENDING',?,NOW(3),NOW(3),NOW(3))`,
    randomUUID(), hospitalId, patientId, treatmentId, doctorId, numericAmount, notes
  )
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN','ACCOUNTANT','RECEPTIONIST'])
  if (error || !hospitalId || !user?.id) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const id = String(body.id || '')
  const payment = Number(body.payment || 0)
  const discount = Number(body.discount || 0)
  const method = String(body.method || 'CASH')
  const reference = body.reference ? String(body.reference) : null
  const allowedMethods = ['CASH','CARD','BANK_TRANSFER','CHEQUE','OTHER']

  if (!id || !Number.isFinite(payment) || !Number.isFinite(discount) || payment < 0 || discount < 0 || !allowedMethods.includes(method)) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }
  if (payment <= 0 && discount <= 0) {
    return NextResponse.json({ error: 'Saisissez un paiement ou une remise' }, { status: 400 })
  }

  if (discount > 0) {
    const allowed = await hasPermission({ hospitalId, role: user.role, permission: 'billing.discount' })
    if (!allowed) return NextResponse.json({ error: 'Remise non autorisée pour ce rôle' }, { status: 403 })
  }

  const charges = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id,amount,amountPaid,discount,status FROM ReceptionCharge WHERE id=? AND hospitalId=? LIMIT 1`, id, hospitalId
  )
  const charge = charges[0]
  if (!charge) return NextResponse.json({ error: 'Encaissement introuvable' }, { status: 404 })
  if (charge.status === 'PAID' || charge.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Ce dossier est déjà clôturé' }, { status: 400 })
  }

  const amount = Number(charge.amount)
  const currentPaid = Number(charge.amountPaid)
  const currentDiscount = Number(charge.discount)
  const due = Math.max(0, amount - currentPaid - currentDiscount)
  if (payment + discount > due + 0.001) {
    return NextResponse.json({ error: `Le total dépasse le reste à payer (${due.toFixed(2)} MAD)` }, { status: 400 })
  }

  const newPaid = currentPaid + payment
  const newDiscount = currentDiscount + discount
  const newDue = Math.max(0, amount - newPaid - newDiscount)
  const newStatus = newDue <= 0.001 ? 'PAID' : (newPaid > 0 || newDiscount > 0 ? 'PARTIAL' : 'PENDING')

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE ReceptionCharge SET amountPaid=?, discount=?, status=?, paidAt=CASE WHEN ?='PAID' THEN NOW(3) ELSE paidAt END, updatedAt=NOW(3) WHERE id=? AND hospitalId=?`,
      newPaid, newDiscount, newStatus, newStatus, id, hospitalId
    )
    if (payment > 0) {
      await tx.$executeRawUnsafe(
        `INSERT INTO ReceptionPayment (id,hospitalId,chargeId,amount,method,reference,receivedById,createdAt) VALUES (?,?,?,?,?,?,?,NOW(3))`,
        randomUUID(), hospitalId, id, payment, method, reference, user.id
      )
    }
  })

  return NextResponse.json({ success: true, status: newStatus, remaining: newDue })
}
