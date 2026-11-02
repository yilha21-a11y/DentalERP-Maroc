import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { randomInt } from 'node:crypto'
import { z } from 'zod'
import { normalizeMoroccoPhone } from '@/lib/utils'

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'REF-'
  for (let i = 0; i < 8; i++) {
    code += chars[randomInt(0, chars.length)]
  }
  return code
}

const createReferralSchema = z.object({
  referrerPatientId: z.string().min(1),
  referredName: z.string().trim().min(2).max(150),
  referredPhone: z.string().trim().min(8).max(30),
  rewardType: z.string().trim().max(50).optional(),
  rewardValue: z.coerce.number().min(0).max(1000000).nullable().optional(),
})

// GET - List referrals
export async function GET(request: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole()
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))

    const where: any = { hospitalId }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { referredName: { contains: search } },
        { referredPhone: { contains: search } },
        { referralCode: { contains: search } },
      ]
    }

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.referral.count({ where }),
    ])

    // Fetch referrer patient names
    const referrerIds = [...new Set(referrals.map((r) => r.referrerPatientId))]
    const referrers = await prisma.patient.findMany({
      where: { id: { in: referrerIds } },
      select: { id: true, firstName: true, lastName: true, patientId: true },
    })
    const referrerMap = Object.fromEntries(referrers.map((p) => [p.id, p]))

    const enriched = referrals.map((r) => ({
      ...r,
      referrerPatient: referrerMap[r.referrerPatientId] || null,
    }))

    // Summary stats
    const [totalReferrals, converted, rewarded] = await Promise.all([
      prisma.referral.count({ where: { hospitalId } }),
      prisma.referral.count({ where: { hospitalId, status: 'CONVERTED' } }),
      prisma.referral.count({ where: { hospitalId, status: 'REWARDED' } }),
    ])

    return NextResponse.json({
      referrals: enriched,
      summary: {
        total: totalReferrals,
        converted,
        rewarded,
        conversionRate:
          totalReferrals > 0 ? (((converted + rewarded) / totalReferrals) * 100).toFixed(1) : '0',
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('Error fetching referrals:', err)
    return NextResponse.json({ error: 'Impossible de charger les parrainages' }, { status: 500 })
  }
}

// POST - Create referral
export async function POST(request: NextRequest) {
  const { error, hospitalId, session } = await requireAuthAndRole()
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (!['ADMIN', 'RECEPTIONIST'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 })
    }

    const parsed = createReferralSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données de parrainage invalides' }, { status: 400 })
    }
    const { referrerPatientId, referredName, rewardType, rewardValue } = parsed.data
    const referredPhone = normalizeMoroccoPhone(parsed.data.referredPhone)

    // Verify referrer patient
    const referrer = await prisma.patient.findUnique({
      where: { id: referrerPatientId, hospitalId },
    })
    if (!referrer) {
      return NextResponse.json({ error: 'Patient parrain introuvable' }, { status: 404 })
    }

    // Generate unique code
    let referralCode = generateReferralCode()
    let attempts = 0
    while (attempts < 5) {
      const existing = await prisma.referral.findUnique({ where: { referralCode } })
      if (!existing) break
      referralCode = generateReferralCode()
      attempts++
    }

    const referral = await prisma.referral.create({
      data: {
        hospitalId,
        referrerPatientId,
        referredName: referredName.trim(),
        referredPhone,
        referralCode,
        rewardType: rewardType || 'POINTS',
        rewardValue: rewardValue || null,
      },
    })

    return NextResponse.json(referral, { status: 201 })
  } catch (err) {
    console.error('Error creating referral:', err)
    return NextResponse.json({ error: 'Impossible de créer le parrainage' }, { status: 500 })
  }
}
