'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Building2, CheckCircle, Clock, CreditCard, Mail, Phone } from 'lucide-react'
import { formatCurrency as formatAmount } from '@/lib/i18n/format'

interface PayPageProps {
  token: string
  locale: string
  currency: string
  hospital: {
    name: string
    logo: string | null
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    state: string | null
  }
  invoice: {
    id: string
    invoiceNo: string
    totalAmount: number
    paidAmount: number
    balanceAmount: number
  }
  patient: {
    name: string
    phone: string
  }
  amount: number
  isExpired: boolean
  isUsed: boolean
  isPaid: boolean
}

export function PayPage({
  locale,
  currency,
  hospital,
  invoice,
  patient,
  amount,
  isExpired,
  isUsed,
  isPaid,
}: PayPageProps) {
  const formatCurrency = (val: number) =>
    formatAmount(val, { locale, currency, minimumFractionDigits: 0 })

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          {hospital.logo ? (
            <img
              src={hospital.logo}
              alt={hospital.name}
              className="h-16 w-16 rounded-lg object-cover mx-auto mb-2"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <CardTitle className="text-xl">{hospital.name}</CardTitle>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            {hospital.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {hospital.phone}</span>}
            {hospital.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {hospital.email}</span>}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isExpired && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <Clock className="h-4 w-4" />
              Ce lien de paiement a expiré.
            </div>
          )}
          {isUsed && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <CheckCircle className="h-4 w-4" />
              Ce lien a déjà été utilisé.
            </div>
          )}
          {isPaid && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle className="h-4 w-4" />
              Cette facture est entièrement réglée.
            </div>
          )}

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Facture</span><span className="font-medium">{invoice.invoiceNo}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Patient</span><span>{patient.name}</span></div>
            <Separator />
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Montant total</span><span>{formatCurrency(invoice.totalAmount)}</span></div>
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between text-sm text-green-700"><span>Déjà réglé</span><span>{formatCurrency(invoice.paidAmount)}</span></div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold"><span>Reste à payer</span><span className="text-lg">{formatCurrency(amount)}</span></div>
          </div>

          {!isPaid && (
            <div className="rounded-lg border border-dashed p-4">
              <div className="mb-2 flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4" /> Paiement en ligne indisponible</div>
              <p className="text-sm text-muted-foreground">
                Le paiement en ligne est désactivé jusqu’à l’intégration d’une passerelle compatible avec le Maroc. Contactez le cabinet pour régler par un moyen disponible.
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <Badge variant="secondary">Devise : {currency}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
