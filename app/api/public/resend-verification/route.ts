import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/api-helpers'
import { sendVerificationEmail } from '@/lib/email-helpers'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().trim().email().max(254),
})

const genericMessage =
  'Si cette adresse correspond à un compte en attente, un e-mail de vérification sera envoyé.'

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: true, message: genericMessage })
    }

    const email = parsed.data.email.toLowerCase()
    const rate = await checkRateLimit(
      `resend-verification:${getClientIp(request)}:${email}`,
      5,
      60 * 60 * 1000
    )

    if (!rate.allowed) {
      return NextResponse.json(
        { success: true, message: genericMessage },
        { headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      )
    }

    const hospital = await prisma.hospital.findFirst({
      where: {
        email,
        emailVerificationToken: { not: null },
      },
      select: { id: true, name: true },
    })

    if (!hospital) {
      return NextResponse.json({ success: true, message: genericMessage })
    }

    const token = generateToken(48)
    await prisma.hospital.update({
      where: { id: hospital.id },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await sendVerificationEmail({
      to: email,
      userName: hospital.name,
      hospitalName: hospital.name,
      token,
    })

    return NextResponse.json({ success: true, message: genericMessage })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ success: true, message: genericMessage })
  }
}
