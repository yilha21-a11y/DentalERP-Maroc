import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createPatientToken, setPatientCookie, verifyOTPHash } from '@/lib/patient-auth'
import { normalizeMoroccoPhone } from '@/lib/services/whatsapp.service'

const requestSchema = z.object({
  phone: z.string().min(8).max(20),
  otp: z.string().regex(/^\d{6}$/),
  hospitalSlug: z.string().min(2).max(100),
})

function canonicalPhone(phone: string): string {
  return `+${normalizeMoroccoPhone(phone)}`
}

function patientPhoneCandidates(phone: string): string[] {
  const normalized = normalizeMoroccoPhone(phone)
  const local = normalized.startsWith('212') ? `0${normalized.slice(3)}` : phone
  return Array.from(new Set([phone.trim(), `+${normalized}`, normalized, local]))
}

/**
 * POST: Verify OTP and return JWT in httpOnly cookie.
 * Body: { phone, otp, hospitalSlug }
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = requestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Code de vérification invalide' }, { status: 400 })
    }

    const { phone, otp, hospitalSlug } = parsed.data
    const normalizedPhone = canonicalPhone(phone)

    const hospital = await prisma.hospital.findUnique({
      where: { slug: hospitalSlug },
      select: { id: true, patientPortalEnabled: true },
    })

    if (!hospital || !hospital.patientPortalEnabled) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    const otpRecord = await prisma.patientOTP.findFirst({
      where: {
        hospitalId: hospital.id,
        phone: normalizedPhone,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord || otpRecord.attempts >= 3) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    const valid = await verifyOTPHash(otp, otpRecord.otp)
    if (!valid) {
      await prisma.patientOTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      })
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    const patient = await prisma.patient.findFirst({
      where: {
        hospitalId: hospital.id,
        phone: { in: patientPhoneCandidates(phone) },
        isActive: true,
      },
      select: {
        id: true,
        hospitalId: true,
        patientId: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
      },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    // Consume the OTP only when the patient lookup also succeeds.
    await prisma.patientOTP.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    })

    const token = await createPatientToken({
      patientId: patient.id,
      hospitalId: patient.hospitalId,
      phone: patient.phone,
    })

    const response = NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        patientId: patient.patientId,
        name: `${patient.firstName} ${patient.lastName}`,
        phone: patient.phone,
        email: patient.email,
      },
    })

    return setPatientCookie(response, token)
  } catch (err: unknown) {
    console.error('Verify OTP error:', err)
    return NextResponse.json({ error: 'Vérification impossible' }, { status: 500 })
  }
}
