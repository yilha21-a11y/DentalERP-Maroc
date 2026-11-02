import { NextResponse } from 'next/server'

/**
 * Désactivé avec les anciennes passerelles de paiement. Aucun identifiant de
 * transaction fourni par le client n'est accepté tant qu'un flux marocain
 * vérifié côté serveur n'est pas disponible.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'La vérification de paiement en ligne n’est pas disponible.',
      code: 'ONLINE_PAYMENT_NOT_CONFIGURED_MA',
    },
    { status: 410 }
  )
}
