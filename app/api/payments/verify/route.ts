import { NextResponse } from 'next/server'
import { getAuthenticatedHospital } from '@/lib/api-helpers'

export async function POST() {
  const { error, user, hospitalId } = await getAuthenticatedHospital()
  if (error || !user || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  return NextResponse.json(
    {
      error: 'Le paiement en ligne est désactivé dans DentalERP Maroc.',
      code: 'ONLINE_PAYMENT_NOT_CONFIGURED_MA',
    },
    { status: 410 }
  )
}
