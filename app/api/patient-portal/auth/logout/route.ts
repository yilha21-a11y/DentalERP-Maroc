import { NextRequest, NextResponse } from 'next/server'
import {
  COOKIE_NAME,
  clearPatientCookie,
  revokePatientSessions,
  verifyPatientToken,
} from '@/lib/patient-auth'

/**
 * POST: Révoque les sessions du patient (version de session) et efface le cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value
    const payload = token ? await verifyPatientToken(token) : null
    if (payload) {
      await revokePatientSessions(payload.patientId, payload.hospitalId)
    }
  } catch (err) {
    console.error('Patient logout revoke error:', err)
  }
  return clearPatientCookie(NextResponse.json({ success: true }))
}
