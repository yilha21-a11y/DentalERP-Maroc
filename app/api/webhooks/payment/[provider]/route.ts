import { NextResponse } from 'next/server'

/**
 * Les webhooks des anciennes passerelles étrangères sont désactivés.
 * Une future intégration marocaine devra vérifier la signature AVANT toute
 * lecture métier et traiter les événements de façon idempotente.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Webhook de paiement non configuré pour DentalERP Maroc.',
      code: 'ONLINE_PAYMENT_NOT_CONFIGURED_MA',
    },
    { status: 410 }
  )
}
