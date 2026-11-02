import { SignJWT, jwtVerify } from 'jose'

const ISSUER = 'dentalerp-maroc'
const AUDIENCE = 'waiting-room-display'

function getSecret(): Uint8Array {
  const secret = process.env.WAITING_ROOM_DISPLAY_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('WAITING_ROOM_DISPLAY_SECRET must be configured with at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

export async function createWaitingRoomDisplayToken(hospitalId: string): Promise<string> {
  return new SignJWT({ hospitalId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getSecret())
}

export async function verifyWaitingRoomDisplayToken(
  token: string
): Promise<{ hospitalId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    })

    if (typeof payload.hospitalId !== 'string' || !payload.hospitalId) return null
    return { hospitalId: payload.hospitalId }
  } catch {
    return null
  }
}
