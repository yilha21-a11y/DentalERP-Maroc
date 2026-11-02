/**
 * POST /api/cron/cleanup
 *
 * Data-retention cron job (Phase 6.2).
 * Deletes AI conversations and skill executions older than 90 days.
 * Removes expired AIInsight records.
 *
 * Secured via CRON_SECRET env var (Bearer token).
 * Schedule: daily according to the deployment scheduler.
 *
 * curl -X POST https://<host>/api/cron/cleanup \
 *   -H "Authorization: Bearer <CRON_SECRET>"
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCronAuth } from '@/lib/cron-auth'

const RETENTION_DAYS = 90

export async function POST(req: NextRequest) {
  const authError = requireCronAuth(req)
  if (authError) return authError

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  const [conversations, executions, expiredInsights] = await Promise.all([
    prisma.aIConversation.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.aISkillExecution.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.aIInsight.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ])

  return NextResponse.json({
    success: true,
    retentionDays: RETENTION_DAYS,
    cutoffDate: cutoff.toISOString(),
    deleted: {
      conversations: conversations.count,
      executions: executions.count,
      expiredInsights: expiredInsights.count,
    },
  })
}
