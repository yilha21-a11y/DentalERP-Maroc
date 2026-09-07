import prisma from '@/lib/prisma'

function normalizeMoroccoPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('212')) return digits
  if (digits.startsWith('0')) return `212${digits.slice(1)}`
  return `212${digits}`
}

export async function sendWhatsAppTemplate(input: {
  hospitalId: string
  phone: string
  templateName: string
  languageCode?: string
  components?: unknown[]
  patientId?: string | null
  appointmentId?: string | null
}) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) throw new Error('Configuration WhatsApp manquante')

  const phone = normalizeMoroccoPhone(input.phone)
  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: input.templateName,
        language: { code: input.languageCode || 'fr' },
        components: input.components || [],
      },
    }),
  })

  const payload = await response.json().catch(() => ({}))
  const providerMessageId = payload?.messages?.[0]?.id || null
  const status = response.ok ? 'SENT' : 'FAILED'

  await prisma.$executeRawUnsafe(
    `INSERT INTO WhatsAppLog (id,hospitalId,patientId,appointmentId,phone,templateName,messageType,status,providerMessageId,errorMessage,sentAt,createdAt)
     VALUES (UUID(),?,?,?,?,?,'TEMPLATE',?,?,?,?,NOW(3))`,
    input.hospitalId,
    input.patientId || null,
    input.appointmentId || null,
    phone,
    input.templateName,
    status,
    providerMessageId,
    response.ok ? null : JSON.stringify(payload),
    response.ok ? new Date() : null
  )

  if (!response.ok) throw new Error(payload?.error?.message || 'Échec envoi WhatsApp')
  return payload
}

export { normalizeMoroccoPhone }
