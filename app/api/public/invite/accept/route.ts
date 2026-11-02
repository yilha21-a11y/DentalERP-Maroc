import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { StaffInviteStatus } from '@prisma/client'
import { normalizeMoroccoPhone } from '@/lib/services/whatsapp.service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const acceptInviteSchema = z.object({
  token: z.string().min(16).max(256),
  password: z.string().min(8).max(200),
  phone: z.string().trim().min(8).max(30),
})

const tokenSchema = z.string().min(16).max(256)

export async function POST(request: Request) {
  try {
    const validated = acceptInviteSchema.safeParse(await request.json())
    if (!validated.success) {
      return NextResponse.json({ error: 'Données d’invitation invalides' }, { status: 400 })
    }

    const rate = await checkRateLimit(
      `invite-accept:${getClientIp(request)}`,
      20,
      15 * 60 * 1000
    )
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      )
    }

    const { token, password } = validated.data
    const phone = `+${normalizeMoroccoPhone(validated.data.phone)}`

    const invite = await prisma.staffInvite.findUnique({
      where: { token },
      include: {
        hospital: {
          select: { id: true, name: true, isActive: true },
        },
      },
    })

    if (
      !invite ||
      invite.status !== StaffInviteStatus.PENDING ||
      new Date() > invite.expiresAt ||
      !invite.hospital.isActive
    ) {
      if (
        invite &&
        invite.status === StaffInviteStatus.PENDING &&
        new Date() > invite.expiresAt
      ) {
        await prisma.staffInvite.update({
          where: { id: invite.id },
          data: { status: StaffInviteStatus.EXPIRED },
        })
      }
      return NextResponse.json({ error: 'Invitation invalide ou expirée' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    })
    if (existingUser) {
      return NextResponse.json({ error: 'Cette invitation ne peut plus être utilisée' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const employeeId = `EMP-${randomBytes(4).toString('hex').toUpperCase()}`
    const displayName = invite.name ?? invite.email.split('@')[0]
    const nameParts = displayName.split(/\s+/).filter(Boolean)

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          email: invite.email.toLowerCase(),
          name: displayName,
          password: hashedPassword,
          phone,
          role: invite.role,
          isActive: true,
          isHospitalAdmin: false,
          hospitalId: invite.hospitalId,
          locale: 'fr-MA',
          staff: {
            create: {
              employeeId,
              firstName: nameParts[0] || displayName,
              lastName: nameParts.slice(1).join(' '),
              email: invite.email.toLowerCase(),
              phone,
              hospitalId: invite.hospitalId,
            },
          },
        },
      })

      await tx.staffInvite.update({
        where: { id: invite.id },
        data: { status: StaffInviteStatus.ACCEPTED },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Compte créé. Vous pouvez maintenant vous connecter.',
      hospitalName: invite.hospital.name,
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Impossible d’accepter l’invitation' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const rate = await checkRateLimit(
      `invite-check:${getClientIp(request)}`,
      60,
      15 * 60 * 1000
    )
    if (!rate.allowed) {
      return NextResponse.json(
        { valid: false, error: 'Trop de tentatives' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      )
    }

    const token = new URL(request.url).searchParams.get('token')
    const parsed = tokenSchema.safeParse(token)
    if (!parsed.success) {
      return NextResponse.json({ valid: false, error: 'Invitation invalide' }, { status: 400 })
    }

    const invite = await prisma.staffInvite.findUnique({
      where: { token: parsed.data },
      include: {
        hospital: {
          select: { name: true, isActive: true },
        },
      },
    })

    if (
      !invite ||
      invite.status !== StaffInviteStatus.PENDING ||
      new Date() > invite.expiresAt ||
      !invite.hospital.isActive
    ) {
      return NextResponse.json({ valid: false, error: 'Invitation invalide ou expirée' }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      invite: {
        email: invite.email,
        name: invite.name,
        role: invite.role,
        hospitalName: invite.hospital.name,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (error) {
    console.error('Validate invite error:', error)
    return NextResponse.json({ error: 'Vérification de l’invitation impossible' }, { status: 500 })
  }
}
