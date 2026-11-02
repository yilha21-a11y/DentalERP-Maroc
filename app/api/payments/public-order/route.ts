import { NextResponse } from 'next/server'

/**
 * Désactivé volontairement : les passerelles historiques de ce dépôt ne sont
 * pas adaptées au Maroc. Cette route ne doit accepter aucun montant fourni par
 * un navigateur tant qu'un prestataire marocain n'est pas implémenté.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Le paiement en ligne est temporairement indisponible.',
      code: 'ONLINE_PAYMENT_NOT_CONFIGURED_MA',
    },
    { status: 410 }
  )
}
