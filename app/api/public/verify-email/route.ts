import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const verifySchema = z.object({
  token: z.string().min(32).max(256),
})

async function rateLimit(request: Request) {
  return checkRateLimit(
    `verify-email:${getClientIp(request)}`,
    30,
    15 * 60 * 1000
  )
}

export async function POST(request: Request) {
  try {
    const rate = await rateLimit(request)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      )
    }

    const validated = verifySchema.safeParse(await request.json())
    if (!validated.success) {
      return NextResponse.json({ error: 'Jeton invalide' }, { status: 400 })
    }

    const hospital = await prisma.hospital.findFirst({
      where: {
        emailVerificationToken: validated.data.token,
        emailVerificationExpiry: { gt: new Date() },
      },
      select: { id: true, slug: true },
    })

    if (!hospital) {
      return NextResponse.json({ error: 'Jeton invalide ou expiré' }, { status: 400 })
    }

    await prisma.hospital.update({
      where: { id: hospital.id },
      data: {
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Adresse e-mail vérifiée. Vous pouvez maintenant vous connecter.',
      hospitalSlug: hospital.slug,
    })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ error: 'Vérification temporairement indisponible' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const rate = await rateLimit(request)
    if (!rate.allowed) {
      return NextResponse.json(
        { valid: false, error: 'Trop de tentatives' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      )
    }

    const token = new URL(request.url).searchParams.get('token')
    const validated = verifySchema.safeParse({ token })
    if (!validated.success) {
      return NextResponse.json({ valid: false, error: 'Jeton invalide' }, { status: 400 })
    }

    const hospital = await prisma.hospital.findFirst({
      where: {
        emailVerificationToken: validated.data.token,
        emailVerificationExpiry: { gt: new Date() },
      },
      select: { name: true },
    })

    if (!hospital) {
      return NextResponse.json({ valid: false, error: 'Jeton invalide ou expiré' }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      hospitalName: hospital.name,
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({ error: 'Vérification temporairement indisponible' }, { status: 500 })
  }
}
