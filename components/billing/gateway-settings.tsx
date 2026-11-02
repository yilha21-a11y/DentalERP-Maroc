'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, ShieldCheck } from 'lucide-react'

export function GatewaySettings() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Paiement en ligne
            </CardTitle>
            <CardDescription>
              Configuration des paiements électroniques de DentalERP Maroc.
            </CardDescription>
          </div>
          <Badge variant="secondary">Désactivé</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-2 text-sm">
            <p className="font-medium">
              Les anciennes passerelles du projet d’origine ont été désactivées.
            </p>
            <p className="text-muted-foreground">
              Le cabinet peut continuer à enregistrer les règlements en espèces, par carte au
              terminal, par virement ou par chèque. Le paiement en ligne sera réactivé uniquement
              après intégration et validation d’un prestataire compatible avec le Maroc.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
