import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { SignJWT } from 'jose'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
})

const MOBILE_ISSUER = 'dentalerp-maroc'
const MOBILE_AUDIENCE = 'mobile-api'

function getMobileSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be configured with at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

export async function POST(req: NextRequest) {
  try {
    const validated = loginSchema.safeParse(await req.json())
    if (!validated.success) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 400 })
    }

    const email = validated.data.email.trim().toLowerCase()
    const { password } = validated.data

    const user = await prisma.user.findUnique({
      where: { email },
      include: { staff: true, hospital: true },
    })

    if (!user || !user.isActive || !user.hospital?.isActive) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    const token = await new SignJWT({
      email: user.email,
      name: user.name,
      role: user.role,
      staffId: user.staff?.id,
      hospitalId: user.hospitalId,
      isHospitalAdmin: user.isHospitalAdmin,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer(MOBILE_ISSUER)
      .setAudience(MOBILE_AUDIENCE)
      .setIssuedAt()
      .setJti(crypto.randomUUID())
      .setExpirationTime('8h')
      .sign(getMobileSecret())

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
    return NextResponse.json({ error: 'Authentification indisponible' }, { status: 500 })
  }
}
