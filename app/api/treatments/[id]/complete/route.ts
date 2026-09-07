import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'

// POST - Complete treatment and send the charge to reception.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId, session } = await requireAuthAndRole()
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    if (!['ADMIN', 'DOCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Vous ne pouvez pas terminer un traitement' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const treatment = await prisma.treatment.findUnique({ where: { id, hospitalId } })

    if (!treatment) return NextResponse.json({ error: 'Traitement introuvable' }, { status: 404 })
    if (treatment.status !== 'IN_PROGRESS' && treatment.status !== 'PLANNED') {
      return NextResponse.json({ error: `Traitement non clôturable: ${treatment.status}` }, { status: 400 })
    }

    const updateData: any = { status: 'COMPLETED', endTime: new Date() }
    if (!treatment.startTime) updateData.startTime = new Date()
    if (body.procedureNotes !== undefined) updateData.procedureNotes = body.procedureNotes
    if (body.materialsUsed !== undefined) updateData.materialsUsed = body.materialsUsed
    if (body.complications !== undefined) updateData.complications = body.complications
    if (body.followUpRequired !== undefined) updateData.followUpRequired = body.followUpRequired
    if (body.followUpDate !== undefined) updateData.followUpDate = body.followUpDate ? new Date(body.followUpDate) : null

    // Only an admin may override the recorded treatment price at completion.
    if (body.finalAmount !== undefined && session.user.role === 'ADMIN') {
      const finalAmount = Number(body.finalAmount)
      if (!Number.isNaN(finalAmount) && finalAmount >= 0) updateData.cost = finalAmount
    }

    const updatedTreatment = await prisma.treatment.update({
      where: { id, hospitalId },
      data: updateData,
      include: {
        patient: { select: { id: true, patientId: true, firstName: true, lastName: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
        procedure: { select: { id: true, code: true, name: true, category: true } },
      },
    })

    // Idempotent handoff: do not create a second charge if the endpoint is retried.
    try {
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM ReceptionCharge WHERE treatmentId=? AND hospitalId=? LIMIT 1`,
        updatedTreatment.id,
        hospitalId
      )
      if (!existing.length) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO ReceptionCharge (id,hospitalId,patientId,treatmentId,doctorId,amount,discount,amountPaid,status,notes,sentAt,createdAt,updatedAt)
           VALUES (?,?,?,?,?,?,0,0,'PENDING',?,NOW(3),NOW(3),NOW(3))`,
          randomUUID(), hospitalId, updatedTreatment.patientId, updatedTreatment.id,
          updatedTreatment.doctorId, Number(updatedTreatment.cost),
          `Traitement: ${updatedTreatment.procedure.name}`
        )
      }
    } catch (handoffError) {
      // Clinical completion must not be lost because of a reception module outage.
      console.error('Reception charge handoff failed:', handoffError)
    }

    return NextResponse.json({ ...updatedTreatment, sentToReception: true })
  } catch (error) {
    console.error('Error completing treatment:', error)
    return NextResponse.json({ error: 'Échec de la clôture du traitement' }, { status: 500 })
  }
}
