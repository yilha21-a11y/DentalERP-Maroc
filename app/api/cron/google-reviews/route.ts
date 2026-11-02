import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendWhatsAppTemplate } from '@/lib/services/whatsapp.service'
import { requireCronAuth } from '@/lib/cron-auth'

export async function GET(req: Request) {
  const authError = requireCronAuth(req)
  if (authError) return authError

  const now = new Date()
  const from = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  const to = new Date(now.getTime() - 2 * 60 * 60 * 1000)

  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      checkedOutAt: { gte: from, lte: to },
    },
    include: {
      patient: { select: { id: true, firstName: true, phone: true } },
      hospital: { select: { id: true, name: true } },
    },
    take: 200,
  })

  let sent = 0
  let skipped = 0
  let failed = 0
  const templateName = process.env.WHATSAPP_TEMPLATE_GOOGLE_REVIEW || 'avis_google'
  const reviewUrl = process.env.GOOGLE_REVIEW_URL

  if (!reviewUrl) {
    return NextResponse.json({ error: 'GOOGLE_REVIEW_URL manquant' }, { status: 500 })
  }

  for (const appt of appointments) {
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM WhatsAppLog
      WHERE appointmentId = ${appt.id}
        AND templateName = ${templateName}
        AND status = 'SENT'
      LIMIT 1
    `
    if (existing.length) { skipped++; continue }

    try {
      await sendWhatsAppTemplate({
        hospitalId: appt.hospitalId,
        phone: appt.patient.phone,
        patientId: appt.patient.id,
        appointmentId: appt.id,
        templateName,
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: appt.patient.firstName },
              { type: 'text', text: appt.hospital.name },
              { type: 'text', text: reviewUrl },
            ],
          },
        ],
      })
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ checked: appointments.length, sent, skipped, failed })
}
