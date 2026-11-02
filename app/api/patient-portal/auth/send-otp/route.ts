import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { generateOTP, hashOTP } from '@/lib/patient-auth'
import { normalizeMoroccoPhone, sendWhatsAppTemplate } from '@/lib/services/whatsapp.service'

const requestSchema = z.object({
  phone: z.string().min(8).max(20),
  hospitalSlug: z.string().min(2).max(100),
})

const genericResponse = {
  success: true,
  message: 'Si ce numéro est associé à un patient, un code de vérification sera envoyé.',
}

function canonicalPhone(phone: string): string {
  return `+${normalizeMoroccoPhone(phone)}`
}

function patientPhoneCandidates(phone: string): string[] {
  const normalized = normalizeMoroccoPhone(phone)
  const local = normalized.startsWith('212') ? `0${normalized.slice(3)}` : phone
  return Array.from(new Set([phone.trim(), `+${normalized}`, normalized, local]))
}

/**
 * POST: Send an OTP to a patient's phone for portal login.
 * Body: { phone, hospitalSlug }
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = requestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    const { phone, hospitalSlug } = parsed.data
    const normalizedPhone = canonicalPhone(phone)
    const otpTemplate = process.env.WHATSAPP_TEMPLATE_PATIENT_OTP
    const deliveryConfigured =
      Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) &&
      Boolean(process.env.WHATSAPP_ACCESS_TOKEN) &&
      Boolean(otpTemplate)

    const devExposeOtp =
      process.env.NODE_ENV !== 'production' && process.env.PATIENT_OTP_DEV_EXPOSE === 'true'

    // In production, never pretend an OTP was sent when no delivery channel is configured.
    if (process.env.NODE_ENV === 'production' && !deliveryConfigured) {
      console.error('Patient OTP delivery is not configured')
      return NextResponse.json({ error: 'Service OTP temporairement indisponible' }, { status: 503 })
    }

    const hospital = await prisma.hospital.findUnique({
      where: { slug: hospitalSlug },
      select: { id: true, patientPortalEnabled: true },
    })

    // Uniform response prevents clinic/patient enumeration.
    if (!hospital || !hospital.patientPortalEnabled) {
      return NextResponse.json(genericResponse)
    }

    const patient = await prisma.patient.findFirst({
      where: {
        hospitalId: hospital.id,
        phone: { in: patientPhoneCandidates(phone) },
        isActive: true,
      },
      select: { id: true },
    })

    if (!patient) {
      return NextResponse.json(genericResponse)
    }

    // Database-backed throttle: max 5 issued codes per phone in 10 minutes.
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentOTPs = await prisma.patientOTP.count({
      where: {
        hospitalId: hospital.id,
        phone: normalizedPhone,
        createdAt: { gte: tenMinAgo },
      },
    })

    if (recentOTPs >= 5) {
      return NextResponse.json(genericResponse)
    }

    // Invalidate previous active codes before issuing a new one.
    await prisma.patientOTP.updateMany({
      where: {
        hospitalId: hospital.id,
        phone: normalizedPhone,
        verified: false,
      },
      data: { verified: true },
    })

    const otp = generateOTP()
    const otpHash = await hashOTP(otp)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    const otpRecord = await prisma.patientOTP.create({
      data: {
        hospitalId: hospital.id,
        phone: normalizedPhone,
        otp: otpHash,
        expiresAt,
      },
    })

    try {
      if (deliveryConfigured && otpTemplate) {
        await sendWhatsAppTemplate({
          hospitalId: hospital.id,
          patientId: patient.id,
          phone: normalizedPhone,
          templateName: otpTemplate,
          languageCode: process.env.WHATSAPP_TEMPLATE_PATIENT_OTP_LANG || 'fr',
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        })
      } else if (!devExposeOtp) {
        // Development without a configured delivery channel should fail closed.
        await prisma.patientOTP.delete({ where: { id: otpRecord.id } })
        return NextResponse.json({ error: 'Canal OTP non configuré' }, { status: 503 })
      }
    } catch (deliveryError) {
      await prisma.patientOTP.delete({ where: { id: otpRecord.id } }).catch(() => undefined)
      console.error('Patient OTP delivery failed:', deliveryError)
      return NextResponse.json({ error: 'Impossible d’envoyer le code pour le moment' }, { status: 503 })
    }

    return NextResponse.json({
      ...genericResponse,
      ...(devExposeOtp && { devOtp: otp }),
    })
  } catch (err: unknown) {
    console.error('Send OTP error:', err)
    return NextResponse.json({ error: 'Impossible de traiter la demande OTP' }, { status: 500 })
  }
}
