import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendWhatsAppTemplate } from '@/lib/services/whatsapp.service'

export async function GET(req: Request) {
  const secret = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

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
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM WhatsAppLog WHERE appointmentId=? AND templateName=? AND status='SENT' LIMIT 1`,
      appt.id,
      templateName
    )
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
