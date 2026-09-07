import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppTemplate } from '@/lib/services/whatsapp.service'

function appointmentDateTime(date: Date, time: string) {
  const d = new Date(date)
  const [hours, minutes] = String(time || '09:00').split(':').map(Number)
  d.setHours(hours || 0, minutes || 0, 0, 0)
  return d
}

export async function GET(req: Request) {
  const secret = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = new Date()
  const in26Hours = new Date(now.getTime() + 26 * 60 * 60 * 1000)
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      scheduledDate: { gte: new Date(now.toDateString()), lte: in26Hours },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      reminders: true,
      hospital: { select: { id: true, name: true } },
    },
  })

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const appt of appointments) {
    const when = appointmentDateTime(appt.scheduledDate, appt.scheduledTime)
    const minutesUntil = (when.getTime() - now.getTime()) / 60000
    if (minutesUntil < 0) continue

    let slot: '24H' | '2H' | null = null
    if (minutesUntil >= 23 * 60 && minutesUntil <= 25 * 60) slot = '24H'
    if (minutesUntil >= 90 && minutesUntil <= 150) slot = '2H'
    if (!slot) continue

    const offsetMs = slot === '24H' ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000
    const scheduledFor = new Date(when.getTime() - offsetMs)
    const already = appt.reminders.some((r) =>
      r.reminderType === 'WHATSAPP' &&
      r.status === 'SENT' &&
      Math.abs(r.scheduledFor.getTime() - scheduledFor.getTime()) < 15 * 60 * 1000
    )
    if (already) { skipped++; continue }

    const reminder = await prisma.appointmentReminder.create({
      data: {
        appointmentId: appt.id,
        reminderType: 'WHATSAPP',
        scheduledFor,
        status: 'PENDING',
      },
    })

    try {
      await sendWhatsAppTemplate({
        hospitalId: appt.hospitalId,
        phone: appt.patient.phone,
        patientId: appt.patient.id,
        appointmentId: appt.id,
        templateName: slot === '24H'
          ? (process.env.WHATSAPP_TEMPLATE_REMINDER_24H || 'rendez_vous_24h')
          : (process.env.WHATSAPP_TEMPLATE_REMINDER_2H || 'rendez_vous_2h'),
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: appt.patient.firstName },
              { type: 'text', text: appt.hospital.name },
              { type: 'text', text: when.toLocaleDateString('fr-MA') },
              { type: 'text', text: appt.scheduledTime },
            ],
          },
        ],
      })
      await prisma.appointmentReminder.update({ where: { id: reminder.id }, data: { status: 'SENT', sentAt: new Date() } })
      sent++
    } catch {
      await prisma.appointmentReminder.update({ where: { id: reminder.id }, data: { status: 'FAILED' } })
      failed++
    }
  }

  return NextResponse.json({ checked: appointments.length, sent, failed, skipped, processedAt: now.toISOString() })
}
