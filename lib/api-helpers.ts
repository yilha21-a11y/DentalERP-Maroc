import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { jwtVerify } from 'jose'
import { auth } from './auth'
import { prisma } from './prisma'

/**
 * Verify a mobile Bearer token (JWT signed with NEXTAUTH_SECRET via jose).
 * Returns the decoded user payload or null.
 */
async function verifyMobileToken(): Promise<any | null> {
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null

    const token = authHeader.slice(7)
    const configuredSecret = process.env.NEXTAUTH_SECRET
    if (!configuredSecret || configuredSecret.length < 32) return null

    const secret = new TextEncoder().encode(configuredSecret)
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'dentalerp-maroc',
      audience: 'mobile-api',
    })

    if (typeof payload.sub !== 'string' || typeof payload.hospitalId !== 'string') return null

    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        hospitalId: payload.hospitalId,
        isActive: true,
        hospital: { isActive: true },
      },
      include: { staff: true },
    })
    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      staffId: user.staff?.id,
      hospitalId: user.hospitalId,
      isHospitalAdmin: user.isHospitalAdmin,
    }
  } catch {
    return null
  }
}

/**
 * Get authenticated user's hospital context for API routes.
 * Supports both NextAuth session cookies (web) and Bearer tokens (mobile).
 */
export async function getAuthenticatedHospital() {
  // Try NextAuth session first (web)
  const session = await auth()

  if (session?.user?.id && session.user.hospitalId) {
    const currentUser = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        hospitalId: session.user.hospitalId,
        isActive: true,
        hospital: { isActive: true },
      },
      include: { staff: true },
    })

    if (currentUser) {
      return {
        error: null,
        user: {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role,
          staffId: currentUser.staff?.id,
          hospitalId: currentUser.hospitalId,
          isHospitalAdmin: currentUser.isHospitalAdmin,
        },
        hospitalId: currentUser.hospitalId,
      }
    }
  }

  // Fallback: try mobile Bearer token
  const mobileUser = await verifyMobileToken()
  if (mobileUser) {
    return {
      error: null,
      user: mobileUser,
      hospitalId: mobileUser.hospitalId,
    }
  }

  return {
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    user: null,
    hospitalId: null,
  }
}

/**
 * Check if the user has one of the required roles.
 * Returns a 403 response if not authorized.
 */
export function requireRole(userRole: string, allowedRoles: string[]) {
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/**
 * Combined auth check: verifies authentication and role access.
 * Use in API route handlers for consistent auth + role checking.
 */
export async function requireAuthAndRole(allowedRoles?: string[]) {
  const { error, user, hospitalId } = await getAuthenticatedHospital()

  if (error || !user || !hospitalId) {
    return {
      error: error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      hospitalId: null,
      session: null,
    }
  }

  if (allowedRoles) {
    const roleError = requireRole(user.role, allowedRoles)
    if (roleError) {
      return { error: roleError, user: null, hospitalId: null, session: null }
    }
  }

  return { error: null, user, hospitalId, session: { user } }
}

/**
 * Plan limits configuration
 */
export const PLAN_LIMITS = {
  FREE: {
    patientLimit: 100,
    staffLimit: 3,
    storageLimitMb: 500,
  },
  PROFESSIONAL: {
    patientLimit: -1, // Unlimited
    staffLimit: -1,
    storageLimitMb: -1,
  },
  ENTERPRISE: {
    patientLimit: -1,
    staffLimit: -1,
    storageLimitMb: -1,
  },
  SELF_HOSTED: {
    patientLimit: -1,
    staffLimit: -1,
    storageLimitMb: -1,
  },
}

/**
 * Get hospital with plan limits
 */
export async function getHospitalWithLimits(hospitalId: string) {
  return prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      patientLimit: true,
      staffLimit: true,
      storageLimitMb: true,
      isActive: true,
      onboardingCompleted: true,
    },
  })
}

/**
 * Check if hospital has reached patient limit
 */
export async function checkPatientLimit(
  hospitalId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  const hospital = await getHospitalWithLimits(hospitalId)

  if (!hospital) {
    return { allowed: false, current: 0, max: 0 }
  }

  // -1 means unlimited
  if (hospital.patientLimit === -1) {
    return { allowed: true, current: 0, max: -1 }
  }

  const currentPatients = await prisma.patient.count({
    where: { hospitalId },
  })

  return {
    allowed: currentPatients < hospital.patientLimit,
    current: currentPatients,
    max: hospital.patientLimit,
  }
}

/**
 * Check if hospital has reached staff limit
 */
export async function checkStaffLimit(
  hospitalId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  const hospital = await getHospitalWithLimits(hospitalId)

  if (!hospital) {
    return { allowed: false, current: 0, max: 0 }
  }

  // -1 means unlimited
  if (hospital.staffLimit === -1) {
    return { allowed: true, current: 0, max: -1 }
  }

  const currentStaff = await prisma.user.count({
    where: { hospitalId, isActive: true },
  })

  return {
    allowed: currentStaff < hospital.staffLimit,
    current: currentStaff,
    max: hospital.staffLimit,
  }
}

/**
 * Generate a unique slug from hospital name
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  let slug = baseSlug
  let counter = 1

  while (await prisma.hospital.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}

/**
 * Generate a random token for email verification or password reset
 */
export function generateToken(length = 32): string {
  if (!Number.isInteger(length) || length < 16 || length > 256) {
    throw new Error('Token length must be an integer between 16 and 256')
  }
  return randomBytes(Math.ceil(length * 0.75))
    .toString('base64url')
    .slice(0, length)
}
