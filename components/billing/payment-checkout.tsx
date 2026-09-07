'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CreditCard } from 'lucide-react'

interface PaymentCheckoutProps {
  invoiceId: string
  amount: number
  invoiceNo: string
  patientName: string
  onSuccess?: () => void
  onClose?: () => void
  open?: boolean
  trigger?: React.ReactNode
}

export function PaymentCheckout({
  amount,
  invoiceNo,
  patientName,
  onClose,
  open: controlledOpen,
  trigger,
}: PaymentCheckoutProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen

  const setOpen = (value: boolean) => {
    setInternalOpen(value)
    if (!value) onClose?.()
  }

  const formattedAmount = new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(amount)

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <CreditCard className="mr-2 h-4 w-4" />
          Paiement en ligne
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Paiement en ligne indisponible</DialogTitle>
            <DialogDescription>
              Facture {invoiceNo} — {patientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Montant</p>
              <p className="text-2xl font-semibold">{formattedAmount}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Les anciens prestataires de paiement destinés au marché indien ont été désactivés dans DentalERP Maroc.
              Utilisez l’encaissement à la réception en espèces, carte, virement, chèque ou autre moyen configuré.
            </p>
            <Button className="w-full" onClick={() => setOpen(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
