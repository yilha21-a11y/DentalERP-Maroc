import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { SignJWT } from 'jose'
import { MOBILE_TOKEN_AUDIENCE, MOBILE_TOKEN_ISSUER } from '@/lib/api-helpers'
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/security/rate-limit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Mobile-specific login endpoint that returns a JWT token directly
// instead of setting cookies (which don't work well in native apps)
export async function POST(req: NextRequest) {
  try {
    const ipLimit = rateLimit('mobile-login-ip:' + getClientIp(req), 20, 15 * 60 * 1000)
    if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfterSeconds)

    const body = await req.json()
    const validated = loginSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid email or password format' }, { status: 400 })
    }

    const { email, password } = validated.data

    // Limite par compte pour freiner le bourrage d'identifiants distribué
    const emailLimit = rateLimit('mobile-login-email:' + email.toLowerCase(), 10, 15 * 60 * 1000)
    if (!emailLimit.allowed) return tooManyRequests(emailLimit.retryAfterSeconds)

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        staff: true,
        hospital: true,
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!user.hospital || !user.hospital.isActive) {
      return NextResponse.json({ error: 'Your clinic account is inactive' }, { status: 401 })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create JWT token using jose directly (avoids NextAuth encode() salt issues)
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('Mobile auth: NEXTAUTH_SECRET manquant')
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
    }
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      staffId: user.staff?.id,
      hospitalId: user.hospitalId,
      isHospitalAdmin: user.isHospitalAdmin,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(MOBILE_TOKEN_ISSUER)
      .setAudience(MOBILE_TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(secret)

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hospitalId: user.hospitalId,
        hospitalName: user.hospital.name,
        staffId: user.staff?.id,
        image: user.image,
      },
    })
  } catch (error) {
    console.error('Mobile auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

// Handle CORS preflight.
// L'application mobile native n'utilise pas CORS ; `*` n'est jamais combiné à des
// credentials ici (jeton dans le corps de la réponse, pas de cookie).
// La liste d'origines configurable est traitée dans le groupe 3.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
