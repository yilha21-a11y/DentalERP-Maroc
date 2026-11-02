import { NextRequest, NextResponse } from 'next/server'
import { communicationTriggersService } from '@/lib/services/communication-triggers.service'
import { requireCronAuth } from '@/lib/cron-auth'

// POST /api/communications/triggers - Run communication triggers
// This endpoint should be called by a cron job (e.g., every hour)
export async function POST(req: NextRequest) {
  try {
    const authError = requireCronAuth(req)
    if (authError) return authError

    // Run all automated communication triggers
    await communicationTriggersService.runAllTriggers()

    return NextResponse.json({
      success: true,
      message: 'Communication triggers executed successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Communication triggers error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run communication triggers' },
      { status: 500 }
    )
  }
}

// GET /api/communications/triggers - Manual trigger (for testing)
export async function GET(req: NextRequest) {
  try {
    // Only allow in development or with admin authentication
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Manual triggers not allowed in production' },
        { status: 403 }
      )
    }

    await communicationTriggersService.runAllTriggers()

    return NextResponse.json({
      success: true,
      message: 'Communication triggers executed successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Communication triggers error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run communication triggers' },
      { status: 500 }
    )
  }
}
