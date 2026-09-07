import { NextResponse } from 'next/server'
import { getAuthenticatedHospital } from '@/lib/api-helpers'

/**
 * Online card checkout from the upstream project used India-specific providers
 * (Razorpay, PhonePe and Paytm). It is intentionally disabled in DentalERP Maroc
 * until a Moroccan payment provider is selected and implemented.
 *
 * Reception payments in MAD remain available through the billing/reception flow.
 */
export async function POST() {
  const { error, user, hospitalId } = await getAuthenticatedHospital()
  if (error || !user || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  return NextResponse.json(
    {
      error: 'Le paiement en ligne est désactivé dans DentalERP Maroc. Utilisez l’encaissement à la réception (espèces, carte, virement ou chèque).',
      code: 'ONLINE_PAYMENT_NOT_CONFIGURED_MA',
    },
    { status: 410 }
  )
}
