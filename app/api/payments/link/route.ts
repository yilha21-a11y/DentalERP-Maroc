import { NextResponse } from 'next/server'
import { getAuthenticatedHospital } from '@/lib/api-helpers'

/**
 * Les anciennes passerelles de paiement du projet d'origine ne sont pas
 * compatibles avec DentalERP Maroc. La génération de liens de paiement en
 * ligne reste désactivée tant qu'un prestataire marocain n'est pas intégré.
 */
export async function POST() {
  const { error, user, hospitalId } = await getAuthenticatedHospital()
  if (error || !user || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  return NextResponse.json(
    {
      error:
        'Le paiement en ligne n’est pas encore configuré pour DentalERP Maroc. Utilisez l’encaissement à la réception.',
      code: 'ONLINE_PAYMENT_NOT_CONFIGURED_MA',
    },
    { status: 410 }
  )
}
