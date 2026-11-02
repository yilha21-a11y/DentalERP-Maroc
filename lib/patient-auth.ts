import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac, randomInt, timingSafeEqual } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from './prisma'

const COOKIE_NAME = 'patient-portal-token'
const TOKEN_ISSUER = 'dentalerp-maroc'
const TOKEN_AUDIENCE = 'dentalerp-patient-portal'
/** Durée de vie du jeton portail (courte ; révocable via portalSessionVersion). */
const TOKEN_TTL_SECONDS = 4 * 60 * 60
const MIN_SECRET_LENGTH = 32

/**
 * Secret dédié au portail patient. Fail-closed : aucune valeur de secours,
 * erreur si absent ou trop court. Lu à la demande pour ne pas casser
 * `next build` ; l'erreur est levée dès la première requête au portail.
 */
export function getPatientPortalSecret(): Uint8Array {
  const secret = process.env.PATIENT_PORTAL_JWT_SECRET
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      'PATIENT_PORTAL_JWT_SECRET doit être défini et contenir au moins ' +
        MIN_SECRET_LENGTH +
        ' caractères'
    )
  }
  return new TextEncoder().encode(secret)
}

interface PatientTokenPayload {
  patientId: string
  hospitalId: string
  phone: string
  /** Version de session (révocation) */
  sv: number
}

/**
 * Generate a 6-digit OTP (CSPRNG)
 */
export function generateOTP(): string {
  return String(randomInt(100000, 1000000))
}

/**
 * Empreinte HMAC-SHA256 d'un OTP, liée à la clinique et au numéro.
 * Seule cette empreinte est stockée en base.
 */
export function hashOTP(hospitalId: string, phone: string, otp: string): string {
  return createHmac('sha256', getPatientPortalSecret())
    .update(hospitalId + ':' + phone + ':' + otp)
    .digest('hex')
}

/** Comparaison en temps constant de deux empreintes hexadécimales. */
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  if (ba.length === 0 || ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * Create a JWT for authenticated patient
 */
export async function createPatientToken(payload: PatientTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL_SECONDS + 's')
    .sign(getPatientPortalSecret())
}

/**
 * Verify and decode patient JWT
 */
export async function verifyPatientToken(token: string): Promise<PatientTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getPatientPortalSecret(), {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    })
    return payload as unknown as PatientTokenPayload
  } catch {
    return null
  }
}

/**
 * Révoque toutes les sessions portail d'un patient.
 */
export async function revokePatientSessions(patientId: string, hospitalId: string) {
  await prisma.patient.updateMany({
    where: { id: patientId, hospitalId },
    data: { portalSessionVersion: { increment: 1 } },
  })
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

  // Verify patient still exists and is active
  const patient = await prisma.patient.findFirst({
    where: {
      id: payload.patientId,
      hospitalId: payload.hospitalId,
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
      portalSessionVersion: true,
    },
  })

  if (!patient) return null
  // Session révoquée (déconnexion / changement de version)
  if (patient.portalSessionVersion !== payload.sv) return null

  const { portalSessionVersion: _sessionVersion, ...safePatient } = patient
  return safePatient
}

/**
 * Require authenticated patient — returns error response or patient context
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
 * Set patient auth cookie on response
 */
export function setPatientCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_TTL_SECONDS,
    path: '/',
  })
  return response
}

/**
 * Clear patient auth cookie
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
