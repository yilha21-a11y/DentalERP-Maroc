import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { createWaitingRoomDisplayToken } from '@/lib/waiting-room-display-token'

export async function POST(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'RECEPTIONIST'])
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const token = await createWaitingRoomDisplayToken(hospitalId)
    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin

    return NextResponse.json({
      success: true,
      expiresInSeconds: 12 * 60 * 60,
      url: `${origin}/waiting-room-display?token=${encodeURIComponent(token)}`,
    })
  } catch (error) {
    console.error('Waiting room display token error:', error)
    return NextResponse.json(
      { error: 'Écran TV temporairement indisponible' },
      { status: 503 }
    )
  }
}
