import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'

const completeSchema = z.object({
  procedureNotes: z.string().trim().max(10000).nullable().optional(),
  materialsUsed: z.string().max(10000).nullable().optional(),
  complications: z.string().trim().max(10000).nullable().optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().datetime().nullable().optional(),
  finalAmount: z.coerce.number().min(0).max(10000000).optional(),
})

// POST - Complete treatment and send the charge to reception.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, hospitalId, session } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
  if (error || !hospitalId || !session?.user) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const parsed = completeSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données de clôture invalides' }, { status: 400 })
  }

  const { id } = await params

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const treatment = await tx.treatment.findFirst({
          where: { id, hospitalId },
          include: {
            procedure: { select: { name: true } },
          },
        })

        if (!treatment) return { kind: 'not_found' as const }
        if (!['IN_PROGRESS', 'PLANNED'].includes(treatment.status)) {
          return { kind: 'invalid_status' as const, status: treatment.status }
        }

        const now = new Date()
        const data: Prisma.TreatmentUpdateInput = {
          status: 'COMPLETED',
          endTime: now,
          ...(!treatment.startTime ? { startTime: now } : {}),
        }

        if (parsed.data.procedureNotes !== undefined) {
          data.procedureNotes = parsed.data.procedureNotes
        }
        if (parsed.data.materialsUsed !== undefined) {
          data.materialsUsed = parsed.data.materialsUsed
        }
        if (parsed.data.complications !== undefined) {
          data.complications = parsed.data.complications
        }
        if (parsed.data.followUpRequired !== undefined) {
          data.followUpRequired = parsed.data.followUpRequired
        }
        if (parsed.data.followUpDate !== undefined) {
          data.followUpDate = parsed.data.followUpDate
            ? new Date(parsed.data.followUpDate)
            : null
        }
        if (parsed.data.finalAmount !== undefined && session.user.role === 'ADMIN') {
          data.cost = parsed.data.finalAmount
        }

        const updatedTreatment = await tx.treatment.update({
          where: { id },
          data,
          include: {
            patient: {
              select: { id: true, patientId: true, firstName: true, lastName: true },
            },
            doctor: { select: { id: true, firstName: true, lastName: true } },
            procedure: { select: { id: true, code: true, name: true, category: true } },
          },
        })

        const existingCharge = await tx.receptionCharge.findFirst({
          where: {
            treatmentId: updatedTreatment.id,
            hospitalId,
          },
          select: { id: true },
        })

        if (!existingCharge) {
          await tx.receptionCharge.create({
            data: {
              hospitalId,
              patientId: updatedTreatment.patientId,
              treatmentId: updatedTreatment.id,
              doctorId: updatedTreatment.doctorId,
              amount: updatedTreatment.cost,
              status: 'PENDING',
              notes: `Traitement : ${updatedTreatment.procedure.name}`,
            },
          })
        }

        return { kind: 'ok' as const, updatedTreatment }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'Traitement introuvable' }, { status: 404 })
    }
    if (result.kind === 'invalid_status') {
      return NextResponse.json(
        { error: `Traitement non clôturable : ${result.status}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ...result.updatedTreatment,
      sentToReception: true,
    })
  } catch (err) {
    console.error('Treatment completion transaction failed:', err)
    return NextResponse.json({ error: 'Échec de la clôture du traitement' }, { status: 500 })
  }
}
