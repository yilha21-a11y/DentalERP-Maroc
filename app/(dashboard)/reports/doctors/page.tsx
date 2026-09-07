'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, TrendingUp, WalletCards, AlertCircle, Clock3 } from 'lucide-react'

type DoctorRow = {
  doctorId: string
  doctorName: string
  appointments: number | string
  completedAppointments: number | string
  noShows: number | string
  patientsSeen: number | string
  newPatients: number | string
  generatedRevenue: number | string
  collectedRevenue: number | string
  outstanding: number | string
  avgTreatmentMinutes: number | string
  treatmentCount: number | string
  avgRevenuePerPatient: number | string
  noShowRate: number | string
}

const money = (v: number | string) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(Number(v || 0))

export default function DoctorReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [rows, setRows] = useState<DoctorRow[]>([])
  const [scope, setScope] = useState<'own'|'all'>('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/reports/doctors?month=${encodeURIComponent(month)}`, { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      setRows(json.data || [])
      setScope(json.scope || 'all')
    }
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  const totals = useMemo(() => rows.reduce((a, r) => ({
    generated: a.generated + Number(r.generatedRevenue || 0),
    collected: a.collected + Number(r.collectedRevenue || 0),
    outstanding: a.outstanding + Number(r.outstanding || 0),
    patients: a.patients + Number(r.patientsSeen || 0),
  }), { generated: 0, collected: 0, outstanding: 0, patients: 0 }), [rows])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Statistiques dentistes</h1>
          <p className="text-muted-foreground">Performance mensuelle clinique et financière.</p>
        </div>
        <div><p className="mb-1 text-xs text-muted-foreground">Mois</p><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4" />Généré</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{money(totals.generated)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><WalletCards className="h-4 w-4" />Encaissé</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{money(totals.collected)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4" />Reste à encaisser</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{money(totals.outstanding)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" />Patients vus</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.patients}</CardContent></Card>
      </div>

      {scope === 'own' && <Badge variant="outline">Vue personnelle du dentiste</Badge>}
      {loading ? <p>Chargement…</p> : (
        <div className="space-y-4">
          {rows.map((r) => (
            <Card key={r.doctorId}>
              <CardHeader><CardTitle>Dr {r.doctorName}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  <Metric label="Patients" value={String(r.patientsSeen)} sub={`${r.newPatients} nouveaux`} />
                  <Metric label="Rendez-vous" value={String(r.appointments)} sub={`${r.completedAppointments} terminés`} />
                  <Metric label="Actes" value={String(r.treatmentCount)} sub={`${Number(r.avgTreatmentMinutes || 0).toFixed(0)} min en moyenne`} icon={<Clock3 className="h-3 w-3" />} />
                  <Metric label="Chiffre généré" value={money(r.generatedRevenue)} sub={`${money(r.avgRevenuePerPatient)} / patient`} />
                  <Metric label="Encaissé" value={money(r.collectedRevenue)} sub={`${money(r.outstanding)} restant`} />
                </div>
                <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                  <span>Absences : {r.noShows}</span>
                  <span>Taux no-show : {Number(r.noShowRate || 0).toFixed(1)} %</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {!rows.length && <p className="text-muted-foreground">Aucune donnée pour ce mois.</p>}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p>{sub && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{icon}{sub}</p>}</div>
}
