import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { sendWhatsAppTemplate } from '@/lib/services/whatsapp.service'

export async function POST(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN','RECEPTIONIST'])
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.phone || !body.templateName) {
      return NextResponse.json({ error: 'Téléphone et modèle requis' }, { status: 400 })
    }

    const result = await sendWhatsAppTemplate({
      hospitalId,
      phone: body.phone,
      templateName: body.templateName,
      languageCode: body.languageCode || 'fr',
      components: body.components || [],
      patientId: body.patientId || null,
      appointmentId: body.appointmentId || null,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Échec WhatsApp' }, { status: 500 })
  }
}
