import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const COOKIE_NAME = 'patient-portal-token'
const JWT_ISSUER = 'dentalerp-maroc'
const JWT_AUDIENCE = 'patient-portal'

interface PatientTokenPayload {
  patientId: string
  hospitalId: string
  phone: string
}

function getPatientJwtSecret(): Uint8Array {
  const secret = process.env.PATIENT_JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('PATIENT_JWT_SECRET must be configured with at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
export function generateOTP(): string {
  return String(randomInt(100000, 1000000))
}

/**
 * Store only a one-way hash of OTP values.
 */
export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 12)
}

export async function verifyOTPHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}

/**
 * Create a JWT for an authenticated patient.
 */
export async function createPatientToken(payload: PatientTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getPatientJwtSecret())
}

/**
 * Verify and decode a patient JWT.
 */
async function verifyPatientToken(token: string): Promise<PatientTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getPatientJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    if (
      typeof payload.patientId !== 'string' ||
      typeof payload.hospitalId !== 'string' ||
      typeof payload.phone !== 'string'
    ) {
      return null
    }

    return {
      patientId: payload.patientId,
      hospitalId: payload.hospitalId,
      phone: payload.phone,
    }
  } catch {
    return null
  }
}

/**
 * Get authenticated patient from request cookies.
 * Returns patient context or null.
 */
export async function getAuthenticatedPatient(req?: NextRequest) {
  let token: string | undefined

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value
  } else {
    const cookieStore = await cookies()
    token = cookieStore.get(COOKIE_NAME)?.value
  }

  if (!token) return null

  const payload = await verifyPatientToken(token)
  if (!payload) return null

  // Verify patient still exists and is active.
  const patient = await prisma.patient.findFirst({
    where: {
      id: payload.patientId,
      hospitalId: payload.hospitalId,
      phone: payload.phone,
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
    },
  })

  if (!patient) return null

  return patient
}

/**
 * Require authenticated patient — returns error response or patient context.
 */
export async function requirePatientAuth(req?: NextRequest) {
  const patient = await getAuthenticatedPatient(req)

  if (!patient) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      patient: null,
    }
  }

  return { error: null, patient }
}

/**
 * Set patient auth cookie on response.
 */
export function setPatientCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })
  return response
}

/**
 * Clear patient auth cookie.
 */
export function clearPatientCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}

export { COOKIE_NAME }
