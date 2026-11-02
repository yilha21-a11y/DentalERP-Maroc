import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateUniqueSlug, generateToken, PLAN_LIMITS } from '@/lib/api-helpers'
import { Plan, Role } from '@prisma/client'
import { sendVerificationEmail } from '@/lib/email-helpers'
import { normalizeMoroccoPhone } from '@/lib/services/whatsapp.service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const signupSchema = z.object({
  hospitalName: z.string().trim().min(2).max(150),
  adminName: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(30),
  password: z.string().min(8).max(200),
})

export async function POST(request: Request) {
  try {
    const validated = signupSchema.safeParse(await request.json())
    if (!validated.success) {
      return NextResponse.json({ error: 'Données d’inscription invalides' }, { status: 400 })
    }

    const hospitalName = validated.data.hospitalName
    const adminName = validated.data.adminName
    const email = validated.data.email.toLowerCase()
    const phone = `+${normalizeMoroccoPhone(validated.data.phone)}`
    const password = validated.data.password

    const rate = await checkRateLimit(
      `signup:${getClientIp(request)}:${email}`,
      5,
      60 * 60 * 1000
    )
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    // Neutral response prevents account enumeration.
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message:
          'Si cette adresse peut être utilisée, un e-mail de vérification sera envoyé.',
      })
    }

    const slug = await generateUniqueSlug(hospitalName)
    const hashedPassword = await bcrypt.hash(password, 12)
    const verificationToken = generateToken(48)
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const result = await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({
        data: {
          name: hospitalName,
          slug,
          email,
          phone,
          locale: 'fr-MA',
          country: 'MA',
          currency: 'MAD',
          timezone: 'Africa/Casablanca',
          plan: Plan.FREE,
          isActive: true,
          onboardingCompleted: false,
          patientLimit: PLAN_LIMITS.FREE.patientLimit,
          staffLimit: PLAN_LIMITS.FREE.staffLimit,
          storageLimitMb: PLAN_LIMITS.FREE.storageLimitMb,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry,
        },
      })

      const nameParts = adminName.split(/\s+/).filter(Boolean)
      await tx.user.create({
        data: {
          email,
          name: adminName,
          password: hashedPassword,
          phone,
          role: Role.ADMIN,
          isActive: true,
          isHospitalAdmin: true,
          hospitalId: hospital.id,
          locale: 'fr-MA',
          staff: {
            create: {
              employeeId: `EMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
              firstName: nameParts[0] || adminName,
              lastName: nameParts.slice(1).join(' '),
              email,
              phone,
              hospitalId: hospital.id,
            },
          },
        },
      })

      return { hospitalId: hospital.id }
    })

    const emailSent = await sendVerificationEmail({
      to: email,
      userName: adminName,
      hospitalName,
      token: verificationToken,
    })

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Compte créé. Consultez votre e-mail pour vérifier votre adresse.'
        : 'Compte créé, mais l’e-mail de vérification n’a pas pu être envoyé. Vous pourrez demander un nouvel envoi.',
      hospitalId: result.hospitalId,
      emailSent,
      ...(process.env.NODE_ENV === 'development' &&
        process.env.EXPOSE_DEV_VERIFICATION_TOKEN === 'true' && {
          verificationToken,
        }),
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Impossible de créer le compte pour le moment' },
      { status: 500 }
    )
  }
}
