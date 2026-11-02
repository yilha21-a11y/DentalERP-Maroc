import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import { prisma } from './prisma'
import { z } from 'zod'
import { checkRateLimit, getClientIp } from './rate-limit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
})

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials, request) {
        const validated = loginSchema.safeParse(credentials)

        if (!validated.success) return null

        const email = validated.data.email.trim().toLowerCase()
        const { password } = validated.data

        const rate = await checkRateLimit(
          `web-login:${getClientIp(request)}:${email}`,
          10,
          15 * 60 * 1000
        )
        if (!rate.allowed) return null

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            staff: true,
            hospital: true,
          },
        })

        if (!user || !user.isActive) return null

        // New clinic registrations must verify their email before login.
        if (
          !user.hospital ||
          !user.hospital.isActive ||
          user.hospital.emailVerificationToken !== null
        ) return null

        const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          staffId: user.staff?.id,
          hospitalId: user.hospitalId,
          isHospitalAdmin: user.isHospitalAdmin,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
})

// Helper function to get current user
export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

// Helper function to check if user has required role
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole)
}

// Role hierarchy for permission checking
export const roleHierarchy: Record<string, number> = {
  ADMIN: 5,
  DOCTOR: 4,
  ACCOUNTANT: 3,
  RECEPTIONIST: 2,
  LAB_TECH: 1,
}

export function hasMinimumRole(userRole: string, minimumRole: string): boolean {
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[minimumRole] || 0)
}
