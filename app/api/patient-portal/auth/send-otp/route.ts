import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, hashOTP } from '@/lib/patient-auth'
import { moroccoPhoneVariants, normalizeMoroccoE164 } from '@/lib/phone'
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/security/rate-limit'
import { getOtpSender } from '@/lib/services/otp-sender'

const OTP_TTL_MINUTES = 5
const PER_PHONE_LIMIT = 5 // par 10 minutes
const PER_IP_LIMIT = 20 // par 10 minutes
const WINDOW_MS = 10 * 60 * 1000

/** Réponse neutre : identique que le patient / la clinique existent ou non. */
function neutralResponse() {
  return NextResponse.json({
    success: true,
    message: 'Si ce numéro est enregistré, un code de vérification vient d’être envoyé.',
  })
}

/**
 * POST: Envoie un OTP au numéro du patient pour la connexion au portail.
 * Body: { phone, hospitalSlug }
 */
export async function POST(req: NextRequest) {
  try {
    const sender = getOtpSender()
    if (!sender.isConfigured()) {
      // Erreur de configuration globale : identique pour toutes les requêtes.
      console.error('Send OTP: aucun fournisseur OTP configuré')
      return NextResponse.json(
        { error: 'Le service de vérification est temporairement indisponible.' },
        { status: 503 }
      )
    }

    const ip = getClientIp(req)
    const memLimit = rateLimit('otp-send-ip:' + ip, PER_IP_LIMIT, WINDOW_MS)
    if (!memLimit.allowed) return tooManyRequests(memLimit.retryAfterSeconds)

    let body: { phone?: unknown; hospitalSlug?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }
    if (typeof body.phone !== 'string' || typeof body.hospitalSlug !== 'string') {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    const phone = normalizeMoroccoE164(body.phone)
    if (!phone) return neutralResponse()

    const since = new Date(Date.now() - WINDOW_MS)

    // Limite par IP persistée en base (en plus de la limite mémoire)
    const ipCount = await prisma.patientOTP.count({
      where: { ipAddress: ip, createdAt: { gte: since } },
    })
    if (ipCount >= PER_IP_LIMIT) return tooManyRequests(600)

    const hospital = await prisma.hospital.findUnique({
      where: { slug: body.hospitalSlug },
      select: { id: true, patientPortalEnabled: true, isActive: true },
    })
    if (!hospital || !hospital.patientPortalEnabled || !hospital.isActive) {
      return neutralResponse()
    }

    const patient = await prisma.patient.findFirst({
      where: { hospitalId: hospital.id, phone: { in: moroccoPhoneVariants(phone) }, isActive: true },
      select: { id: true },
    })
    if (!patient) return neutralResponse()

    // Limite par numéro : au-delà, on n'envoie rien mais la réponse reste neutre.
    const phoneCount = await prisma.patientOTP.count({
      where: { hospitalId: hospital.id, phone, createdAt: { gte: since } },
    })
    if (phoneCount >= PER_PHONE_LIMIT) return neutralResponse()

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)

    // Invalide les anciens OTP puis crée le nouveau, atomiquement.
    const record = await prisma.$transaction(async (tx) => {
      await tx.patientOTP.updateMany({
        where: { hospitalId: hospital.id, phone, verified: false, expiresAt: { gt: new Date() } },
        data: { expiresAt: new Date() },
      })
      return tx.patientOTP.create({
        data: {
          hospitalId: hospital.id,
          phone,
          otpHash: hashOTP(hospital.id, phone, otp),
          ipAddress: ip,
          expiresAt,
        },
        select: { id: true },
      })
    })

    try {
      await sender.send({
        to: phone,
        code: otp,
        hospitalId: hospital.id,
        ttlMinutes: OTP_TTL_MINUTES,
      })
    } catch (sendErr) {
      // Ne jamais journaliser le code ; l'OTP non livré est invalidé.
      console.error('Send OTP: échec de livraison', (sendErr as Error).name)
      await prisma.patientOTP.update({
        where: { id: record.id },
        data: { expiresAt: new Date() },
      })
    }

    return neutralResponse()
  } catch (err: unknown) {
    console.error('Send OTP error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Impossible d’envoyer le code.' }, { status: 500 })
  }
}
