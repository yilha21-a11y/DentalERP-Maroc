'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Receipt, RefreshCw } from 'lucide-react'

type Charge = {
  id: string
  patientName: string
  doctorName: string
  amount: number | string
  discount: number | string
  amountPaid: number | string
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED'
  notes: string | null
  sentAt: string
}

const money = (value: number | string) => new Intl.NumberFormat('fr-MA', {
  style: 'currency', currency: 'MAD', maximumFractionDigits: 2,
}).format(Number(value || 0))

export default function ReceptionChargesPage() {
  const [charges, setCharges] = useState<Charge[]>([])
  const [payments, setPayments] = useState<Record<string,string>>({})
  const [discounts, setDiscounts] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/reception-charges', { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      setCharges(json.data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const collect = async (id: string) => {
    const payment = Number(payments[id] || 0)
    const discount = Number(discounts[id] || 0)
    if (payment <= 0 && discount <= 0) return
    const res = await fetch('/api/reception-charges', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, payment, discount }),
    })
    if (res.ok) {
      setPayments((x) => ({ ...x, [id]: '' }))
      setDiscounts((x) => ({ ...x, [id]: '' }))
      load()
    }
  }

  const pendingTotal = charges
    .filter((c) => c.status === 'PENDING' || c.status === 'PARTIAL')
    .reduce((sum, c) => sum + Math.max(0, Number(c.amount) - Number(c.amountPaid) - Number(c.discount)), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Encaissements réception</h1>
          <p className="text-muted-foreground">Montants envoyés par les dentistes après les traitements.</p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">À encaisser</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{money(pendingTotal)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Dossiers ouverts</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{charges.filter((c) => ['PENDING','PARTIAL'].includes(c.status)).length}</CardContent></Card>
      </div>

      {loading ? <p>Chargement…</p> : (
        <div className="space-y-3">
          {charges.map((charge) => {
            const due = Math.max(0, Number(charge.amount) - Number(charge.amountPaid) - Number(charge.discount))
            return (
              <Card key={charge.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-64">
                      <div className="flex items-center gap-2"><Receipt className="h-4 w-4" /><span className="font-semibold">{charge.patientName}</span><Badge variant="outline">{charge.status}</Badge></div>
                      <p className="text-sm text-muted-foreground">Dr {charge.doctorName}</p>
                      {charge.notes && <p className="mt-1 text-sm">{charge.notes}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><p className="text-muted-foreground">Montant</p><p className="font-semibold">{money(charge.amount)}</p></div>
                      <div><p className="text-muted-foreground">Payé</p><p className="font-semibold">{money(charge.amountPaid)}</p></div>
                      <div><p className="text-muted-foreground">Reste</p><p className="font-semibold">{money(due)}</p></div>
                    </div>

                    {charge.status !== 'PAID' && charge.status !== 'CANCELLED' && (
                      <div className="flex flex-wrap items-end gap-2">
                        <div><p className="mb-1 text-xs text-muted-foreground">Paiement</p><Input className="w-28" type="number" min="0" step="0.01" value={payments[charge.id] || ''} onChange={(e) => setPayments((x) => ({...x,[charge.id]: e.target.value}))} /></div>
                        <div><p className="mb-1 text-xs text-muted-foreground">Remise</p><Input className="w-28" type="number" min="0" step="0.01" value={discounts[charge.id] || ''} onChange={(e) => setDiscounts((x) => ({...x,[charge.id]: e.target.value}))} /></div>
                        <Button onClick={() => collect(charge.id)}>Encaisser</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
