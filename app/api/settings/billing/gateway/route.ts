import { NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'

const disabledConfig = {
  provider: null,
  isEnabled: false,
  isLiveMode: false,
  country: 'MA',
  currency: 'MAD',
  message:
    'Les anciennes passerelles du projet d’origine sont désactivées. Une passerelle marocaine devra être intégrée avant d’activer le paiement en ligne.',
}

export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  return NextResponse.json({ config: disabledConfig })
}

export async function PUT() {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  return NextResponse.json(
    {
      error:
        'Configuration de paiement en ligne désactivée jusqu’à l’intégration d’un prestataire marocain.',
      code: 'ONLINE_PAYMENT_NOT_CONFIGURED_MA',
    },
    { status: 410 }
  )
}
