import { NextRequest, NextResponse } from 'next/server'
import { clearPatientCookie, requirePatientAuth } from '@/lib/patient-auth'
import { prisma } from '@/lib/prisma'

/**
 * POST: revoke current patient portal tokens and clear the cookie.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePatientAuth(req)

  if (auth.patient) {
    await prisma.patient.updateMany({
      where: {
        id: auth.patient.id,
        hospitalId: auth.patient.hospitalId,
        isActive: true,
      },
      data: {
        portalAuthVersion: { increment: 1 },
      },
    })
  }

  const response = NextResponse.json({ success: true })
  return clearPatientCookie(response)
}
