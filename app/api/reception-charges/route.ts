import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'

const createSchema = z.object({
  patientId: z.string().min(1),
  treatmentId: z.string().min(1).nullable().optional(),
  doctorId: z.string().min(1).optional(),
  amount: z.coerce.number().positive().max(10000000),
  notes: z.string().trim().max(4000).nullable().optional(),
})

const paymentSchema = z.object({
  id: z.string().min(1),
  payment: z.coerce.number().min(0).max(10000000).default(0),
  discount: z.coerce.number().min(0).max(10000000).default(0),
  method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']).default('CASH'),
  reference: z.string().trim().max(191).nullable().optional(),
})

export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole([
    'ADMIN',
    'ACCOUNTANT',
    'RECEPTIONIST',
    'DOCTOR',
  ])
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const charges = await prisma.receptionCharge.findMany({
    where: { hospitalId },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      doctor: { select: { firstName: true, lastName: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { method: true },
      },
    },
    orderBy: { sentAt: 'desc' },
  })

  const priority = { PENDING: 0, PARTIAL: 1, PAID: 2, CANCELLED: 3 } as const
  const data = charges
    .sort((a, b) => priority[a.status] - priority[b.status] || b.sentAt.getTime() - a.sentAt.getTime())
    .map((charge) => ({
      ...charge,
      patientName: `${charge.patient.firstName} ${charge.patient.lastName}`,
      doctorName: `${charge.doctor.firstName} ${charge.doctor.lastName}`,
      lastPaymentMethod: charge.payments[0]?.method || null,
      patient: undefined,
      doctor: undefined,
      payments: undefined,
    }))

  return NextResponse.json({ success: true, currency: 'MAD', data })
}

export async function POST(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
  if (error || !hospitalId || !user?.id) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données incomplètes ou montant invalide' }, { status: 400 })
  }

  const { patientId, treatmentId, amount, notes } = parsed.data
  let doctorId = parsed.data.doctorId || ''

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, hospitalId, isActive: true },
    select: { id: true },
  })
  if (!patient) {
    return NextResponse.json({ error: 'Patient introuvable dans ce cabinet' }, { status: 404 })
  }

  if (user.role === 'DOCTOR') {
    const ownStaff = await prisma.staff.findFirst({
      where: { hospitalId, userId: user.id, isActive: true },
      select: { id: true },
    })
    if (!ownStaff) {
      return NextResponse.json({ error: 'Profil dentiste introuvable' }, { status: 403 })
    }
    doctorId = ownStaff.id
  } else {
    if (!doctorId) {
      return NextResponse.json({ error: 'Dentiste requis' }, { status: 400 })
    }
    const doctor = await prisma.staff.findFirst({
      where: { id: doctorId, hospitalId, isActive: true },
      select: { id: true },
    })
    if (!doctor) {
      return NextResponse.json({ error: 'Dentiste introuvable dans ce cabinet' }, { status: 404 })
    }
  }

  if (treatmentId) {
    const treatment = await prisma.treatment.findFirst({
      where: { id: treatmentId, hospitalId, patientId, doctorId },
      select: { id: true },
    })
    if (!treatment) {
      return NextResponse.json(
        { error: 'Traitement incompatible avec ce patient ou ce dentiste' },
        { status: 400 }
      )
    }
  }

  await prisma.receptionCharge.create({
    data: {
      hospitalId,
      patientId,
      treatmentId: treatmentId || null,
      doctorId,
      amount,
      notes: notes || null,
      status: 'PENDING',
    },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole([
    'ADMIN',
    'ACCOUNTANT',
    'RECEPTIONIST',
  ])
  if (error || !hospitalId || !user?.id) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const parsed = paymentSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { id, payment, discount, method, reference } = parsed.data
  if (payment <= 0 && discount <= 0) {
    return NextResponse.json({ error: 'Saisissez un paiement ou une remise' }, { status: 400 })
  }

  if (discount > 0) {
    const allowed = await hasPermission({
      hospitalId,
      role: user.role,
      permission: 'billing.discount',
    })
    if (!allowed) {
      return NextResponse.json({ error: 'Remise non autorisée pour ce rôle' }, { status: 403 })
    }
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const charge = await tx.receptionCharge.findFirst({
          where: { id, hospitalId },
        })
        if (!charge) return { kind: 'not_found' as const }
        if (charge.status === 'PAID' || charge.status === 'CANCELLED') {
          return { kind: 'closed' as const }
        }

        const amount = Number(charge.amount)
        const currentPaid = Number(charge.amountPaid)
        const currentDiscount = Number(charge.discount)
        const due = Math.max(0, amount - currentPaid - currentDiscount)

        if (payment + discount > due + 0.001) {
          return { kind: 'overpay' as const, due }
        }

        const newPaid = currentPaid + payment
        const newDiscount = currentDiscount + discount
        const newDue = Math.max(0, amount - newPaid - newDiscount)
        const newStatus =
          newDue <= 0.001
            ? ('PAID' as const)
            : newPaid > 0 || newDiscount > 0
              ? ('PARTIAL' as const)
              : ('PENDING' as const)

        await tx.receptionCharge.update({
          where: { id },
          data: {
            amountPaid: newPaid,
            discount: newDiscount,
            status: newStatus,
            ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}),
          },
        })

        if (payment > 0) {
          await tx.receptionPayment.create({
            data: {
              hospitalId,
              chargeId: id,
              amount: payment,
              method,
              reference: reference || null,
              receivedById: user.id,
            },
          })
        }

        return { kind: 'ok' as const, status: newStatus, remaining: newDue }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'Encaissement introuvable' }, { status: 404 })
    }
    if (result.kind === 'closed') {
      return NextResponse.json({ error: 'Ce dossier est déjà clôturé' }, { status: 400 })
    }
    if (result.kind === 'overpay') {
      return NextResponse.json(
        { error: `Le total dépasse le reste à payer (${result.due.toFixed(2)} MAD)` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      remaining: result.remaining,
    })
  } catch (err) {
    console.error('Reception payment transaction failed:', err)
    return NextResponse.json({ error: 'Impossible d’enregistrer le paiement' }, { status: 500 })
  }
}
