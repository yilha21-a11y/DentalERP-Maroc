import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPatientToken, hashOTP, safeEqualHex, setPatientCookie } from '@/lib/patient-auth'
import { moroccoPhoneVariants, normalizeMoroccoE164 } from '@/lib/phone'
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/security/rate-limit'

const MAX_ATTEMPTS = 3

function invalidCode() {
  return NextResponse.json({ error: 'Code invalide ou expiré.' }, { status: 400 })
}

/**
 * POST: Vérifie l'OTP et pose le JWT dans un cookie httpOnly.
 * Body: { phone, otp, hospitalSlug }
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const ipLimit = rateLimit('otp-verify-ip:' + ip, 30, 10 * 60 * 1000)
    if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfterSeconds)

    let body: { phone?: unknown; otp?: unknown; hospitalSlug?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }
    if (
      typeof body.phone !== 'string' ||
      typeof body.otp !== 'string' ||
      typeof body.hospitalSlug !== 'string' ||
      !/^\d{6}$/.test(body.otp)
    ) {
      return invalidCode()
    }

    const phone = normalizeMoroccoE164(body.phone)
    if (!phone) return invalidCode()

    const hospital = await prisma.hospital.findUnique({
      where: { slug: body.hospitalSlug },
      select: { id: true },
    })
    if (!hospital) return invalidCode()

    const submittedHash = hashOTP(hospital.id, phone, body.otp)

    // Vérification + consommation atomiques.
    const outcome = await prisma.$transaction(async (tx) => {
      const record = await tx.patientOTP.findFirst({
        where: {
          hospitalId: hospital.id,
          phone,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (!record || record.attempts >= MAX_ATTEMPTS) return 'invalid' as const

      if (!safeEqualHex(record.otpHash, submittedHash)) {
        await tx.patientOTP.update({
          where: { id: record.id },
          data: { attempts: { increment: 1 } },
        })
        return 'invalid' as const
      }

      // Consommation conditionnelle : un seul appel concurrent peut réussir.
      const consumed = await tx.patientOTP.updateMany({
        where: {
          id: record.id,
          verified: false,
          attempts: { lt: MAX_ATTEMPTS },
          expiresAt: { gt: new Date() },
        },
        data: { verified: true },
      })
      return consumed.count === 1 ? ('ok' as const) : ('invalid' as const)
    })

    if (outcome !== 'ok') return invalidCode()

    const patient = await prisma.patient.findFirst({
      where: {
        hospitalId: hospital.id,
        phone: { in: moroccoPhoneVariants(phone) },
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
        portalSessionVersion: true,
      },
    })
    if (!patient) return invalidCode()

    const token = await createPatientToken({
      patientId: patient.id,
      hospitalId: patient.hospitalId,
      phone: patient.phone,
      sv: patient.portalSessionVersion,
    })

    const response = NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        patientId: patient.patientId,
        name: patient.firstName + ' ' + patient.lastName,
        phone: patient.phone,
        email: patient.email,
      },
    })

    return setPatientCookie(response, token)
  } catch (err: unknown) {
    console.error('Verify OTP error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Vérification impossible.' }, { status: 500 })
  }
}
