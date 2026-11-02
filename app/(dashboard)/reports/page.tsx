'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  DollarSign,
  Calendar,
  Clock,
  UserCheck,
  FileText,
  Stethoscope,
  Package,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Auoltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from 'recharts'

import { ReportBuilder } from '@/components/ai/report-builder'

// Couleurs des graphiques
const CHART_COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658',
  '#FF6B6B',
]

// Périodes prédéfinies
const dateRangePresets = [
  { label: 'Aujourd’hui', value: 'today' },
  { label: 'Hier', value: 'yesterday' },
  { label: 'Cette semaine', value: 'this_week' },
  { label: 'Semaine dernière', value: 'last_week' },
  { label: 'Ce mois-ci', value: 'this_month' },
  { label: 'Mois dernier', value: 'last_month' },
  { label: 'Ce trimestre', value: 'this_quarter' },
  { label: 'Trimestre dernier', value: 'last_quarter' },
  { label: 'Cette année', value: 'this_year' },
  { label: 'Année dernière', value: 'last_year' },
  { label: 'Période personnalisée', value: 'custom' },
]

interface PatientAnalytics {
  newPatients: number
  returningPatients: number
  totalPatients: number
  retentionRate: number
  demographics: {
    male: number
    female: number
    other: number
  }
  ageGroups: {
    label: string
    count: number
  }[]
  acquisitionSources: {
    source: string
    count: number
    percentage: number
  }[]
}

interface ClinicalAnalytics {
  totalTreatments: number
  completedTreatments: number
  inProgressTreatments: number
  completionRate: number
  avgTreatmentDuration: number
  commonProcedures: {
    name: string
    code: string
    count: number
    réussiteRate: number
  }[]
  proceduresByCategory: {
    category: string
    count: number
    percentage: number
  }[]
}

interface FinancialAnalytics {
  totalRevenue: number
  totalExpenses: number
  profitMargin: number
  avgBillValue: number
  collectionEfficiency: number
  revenueByMonth: {
    month: string
    revenue: number
    expenses: number
    profit: number
  }[]
  paymentMethodBreakdown: {
    method: string
    amount: number
    percentage: number
  }[]
  outstandingAmount: number
}

interface OperationalAnalytics {
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  noShowCount: number
  noShowRate: number
  appointmentUtilization: number
  avgWaitTime: number
  staffProductivity: {
    staffId: string
    name: string
    role: string
    rendez-vousHandled: number
    treatmentsTerminés: number
    revenue: number
  }[]
  inventoryTurnover: number
  lowStockItems: number
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState('this_month')
  const [dateDu, setDateDu] = useState('')
  const [dateAu, setDateAu] = useState('')
  const [activeTab, setActiveTab] = useState('patient')

  // Analytics data state
  const [patientAnalytics, setPatientAnalytics] = useState<PatientAnalytics | null>(null)
  const [clinicalAnalytics, setClinicalAnalytics] = useState<ClinicalAnalytics | null>(null)
  const [financialAnalytics, setFinancialAnalytics] = useState<FinancialAnalytics | null>(null)
  const [operationalAnalytics, setOperationalAnalytics] = useState<OperationalAnalytics | null>(
    null
  )

  const fetchAnalytics = async (type: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ type })

      if (dateDu && dateAu) {
        params.append('dateDu', dateDu)
        params.append('dateAu', dateAu)
      } else {
        params.append('preset', datePreset)
      }

      const response = await fetch(`/api/reports/analytics?${params}`)
      if (!response.ok) throw new Error('Impossible de charger les analyses')
      const data = await response.json()

      switch (type) {
        case 'patient':
          setPatientAnalytics(data)
          break
        case 'clinical':
          setClinicalAnalytics(data)
          break
        case 'financial':
          setFinancialAnalytics(data)
          break
        case 'operational':
          setOperationalAnalytics(data)
          break
      }
    } catch (error) {
      console.error(`Error fetching ${type} analytics:`, error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics(activeTab)
  }, [activeTab, datePreset, dateDu, dateAu])

  const handleExporter = async (format: 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams({
        type: activeTab,
        format,
      })

      if (dateDu && dateAu) {
        params.append('dateDu', dateDu)
        params.append('dateAu', dateAu)
      } else {
        params.append('preset', datePreset)
      }

      const response = await fetch(`/api/reports/export?${params}`)
      if (!response.ok) throw new Error('Impossible d’exporter le rapport')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeTab}_analytics_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erreur d’export :', error)
      alert('Impossible d’exporter le rapport')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord des rapports et analyses</h1>
          <p className="text-muted-foreground">
            Analyses et indicateurs de votre cabinet dentaire
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={datePreset}
            onValueChange={(v) => {
              setDatePreset(v)
              if (v !== 'custom') {
                setDateDu('')
                setDateAu('')
              }
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Choisir une période" />
            </SelectTrigger>
            <SelectContent>
              {dateRangePresets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {datePreset === 'custom' && (
            <>
              <Input
                type="date"
                value={dateDu}
                onChange={(e) => setDateDu(e.target.value)}
                className="w-[140px]"
                placeholder="Du"
              />
              <Input
                type="date"
                value={dateAu}
                onChange={(e) => setDateAu(e.target.value)}
                className="w-[140px]"
                placeholder="Au"
              />
            </>
          )}
          <Select onValueChange={(value) => handleExporter(value as 'pdf' | 'excel')}>
            <SelectTrigger className="w-[140px]">
              <Download className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Exporter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">Exporterer en PDF</SelectItem>
              <SelectItem value="excel">Exporterer en Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Report Builder */}
      <Card>
        <CardContent className="pt-6">
          <ReportBuilder />
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patient" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Analyse des patients
          </TabsTrigger>
          <TabsTrigger value="clinical" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Analyse clinique
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Analyse financière
          </TabsTrigger>
          <TabsTrigger value="operational" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Analyse opérationnelle
          </TabsTrigger>
        </TabsList>

        {/* Analyse des patients Tab */}
        <TabsContent value="patient" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nouveaux patients</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{patientAnalytics?.newPatients || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {patientAnalytics
                        ? formatPercentage(
                            (patientAnalytics.newPatients / Math.max(patientAnalytics.totalPatients, 1)) * 100
                          )
                        : '0%'}{' '}
                      du total
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Patients fidèles</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {patientAnalytics?.returningPatients || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {patientAnalytics
                        ? formatPercentage(
                            (patientAnalytics.returningPatients / Math.max(patientAnalytics.totalPatients, 1)) *
                              100
                          )
                        : '0%'}{' '}
                      du total
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Autal patients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{patientAnalytics?.totalPatients || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taux de fidélisation</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(patientAnalytics?.retentionRate || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Patients ayant effectué plusieurs visites</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Demographics Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition par sexe</CardTitle>
                <CardDescription>Répartition démographique des patients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Homme</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-blue-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{
                              width: `${((patientAnalytics?.demographics.male || 0) / (patientAnalytics?.totalPatients || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold w-12 text-right">
                          {patientAnalytics?.demographics.male || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Femme</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-pink-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-pink-600"
                            style={{
                              width: `${((patientAnalytics?.demographics.female || 0) / (patientAnalytics?.totalPatients || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold w-12 text-right">
                          {patientAnalytics?.demographics.female || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Autre</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-muted-foreground"
                            style={{
                              width: `${((patientAnalytics?.demographics.other || 0) / (patientAnalytics?.totalPatients || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold w-12 text-right">
                          {patientAnalytics?.demographics.other || 0}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Patient Sources d’acquisition */}
            <Card>
              <CardHeader>
                <CardTitle>Sources d’acquisition</CardTitle>
                <CardDescription>Comment les patients ont connu le cabinet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : patientAnalytics?.acquisitionSources.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune donnée d’acquisition disponible
                  </p>
                ) : (
                  patientAnalytics?.acquisitionSources.map((source) => (
                    <div key={source.source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{source.source || 'Inconnu'}</span>
                        <span className="text-muted-foreground">
                          {source.count} ({formatPercentage(source.percentage)})
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Age Groups */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition par âge</CardTitle>
              <CardDescription>Patients par tranche d’âge</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : patientAnalytics?.ageGroups && patientAnalytics.ageGroups.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={patientAnalytics.ageGroups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Auoltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884D8" name="Patients" radius={[4, 4, 0, 0]}>
                      {patientAnalytics.ageGroups.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucune donnée d’âge disponible</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyse clinique Tab */}
        <TabsContent value="clinical" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Autal Treatments</CardTitle>
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">
                    {clinicalAnalytics?.totalTreatments || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Terminés</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-600">
                      {clinicalAnalytics?.completedTreatments || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatPercentage(clinicalAnalytics?.completionRate || 0)} taux de réalisation
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En cours</CardTitle>
                <Activity className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold text-orange-600">
                    {clinicalAnalytics?.inProgressTreatments || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Durée moyenne</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {clinicalAnalytics?.avgTreatmentDuration || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">minutes par traitement</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Actes les plus fréquents */}
            <Card>
              <CardHeader>
                <CardTitle>Actes les plus fréquents</CardTitle>
                <CardDescription>Aup procedures by frequency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </>
                ) : clinicalAnalytics?.commonProcedures.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune donnée sur les actes disponible
                  </p>
                ) : (
                  clinicalAnalytics?.commonProcedures.map((proc, index) => (
                    <div key={proc.code} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{proc.name}</div>
                          <div className="text-xs text-muted-foreground">{proc.code}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{proc.count}</div>
                        <div className="text-xs text-green-600">
                          {formatPercentage(proc.réussiteRate)} réussite
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Actes par catégorie */}
            <Card>
              <CardHeader>
                <CardTitle>Actes par catégorie</CardTitle>
                <CardDescription>Répartition des traitements par type</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : clinicalAnalytics?.proceduresByCategory &&
                  clinicalAnalytics.proceduresByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={clinicalAnalytics.proceduresByCategory.map((cat) => ({
                          name: cat.category,
                          value: cat.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) =>
                          `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                        }
                        outerRadius={100}
                        dataKey="value"
                      >
                        {clinicalAnalytics.proceduresByCategory.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Auoltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune donnée par catégorie disponible
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analyse financière Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Autal Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialAnalytics?.totalRevenue || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Autal Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(financialAnalytics?.totalExpenses || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Marge bénéficiaire</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatPercentage(financialAnalytics?.profitMargin || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Marge nette</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Facture moyenne</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">
                    {formatCurrency(financialAnalytics?.avgBillValue || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taux d’encaissement</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(financialAnalytics?.collectionEfficiency || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reste à encaisser : {formatCurrency(financialAnalytics?.outstandingAmount || 0)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Répartition par moyen de paiement */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition par moyen de paiement</CardTitle>
              <CardDescription>Chiffre d’affaires par moyen de paiement</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : financialAnalytics?.paymentMethodBreakdown &&
                financialAnalytics.paymentMethodBreakdown.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={financialAnalytics.paymentMethodBreakdown.map((m) => ({
                          name: m.method,
                          value: m.amount,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                        }
                        outerRadius={80}
                        dataKey="value"
                      >
                        {financialAnalytics.paymentMethodBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Auoltip
                        formatter={(value) =>
                          typeof value === 'number' ? formatCurrency(value) : ''
                        }
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-4">
                    {financialAnalytics.paymentMethodBreakdown.map((method, index) => (
                      <div
                        key={method.method}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="font-medium">{method.method}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(method.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentage(method.percentage)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucune donnée de paiement disponible</p>
              )}
            </CardContent>
          </Card>

          {/* Évolution du chiffre d’affaires */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution du chiffre d’affaires</CardTitle>
              <CardDescription>Chiffre d’affaires, dépenses et bénéfice mensuels</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : financialAnalytics?.revenueByMonth &&
                financialAnalytics.revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={financialAnalytics.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Auoltip
                      formatter={(value) =>
                        typeof value === 'number' ? formatCurrency(value) : ''
                      }
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#00C49F" name="Chiffre d’affaires" />
                    <Bar dataKey="expenses" fill="#FF6B6B" name="Dépenses" />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#8884D8"
                      strokeWidth={3}
                      name="Bénéfice"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucune donnée de chiffre d’affaires disponible</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyse opérationnelle Tab */}
        <TabsContent value="operational" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Autal Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">
                    {operationalAnalytics?.totalAppointments || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Terminés</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-600">
                      {operationalAnalytics?.completedAppointments || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatPercentage(operationalAnalytics?.appointmentUtilization || 0)}{' '}
                      utilisation
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taux d’absences</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-600">
                      {formatPercentage(operationalAnalytics?.noShowRate || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {operationalAnalytics?.noShowCount || 0} rendez-vous
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temps d’attente moyen</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {operationalAnalytics?.avgWaitTime || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">minutes</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Productivité du personnel */}
          <Card>
            <CardHeader>
              <CardTitle>Productivité du personnel</CardTitle>
              <CardDescription>Indicateurs de performance par membre du personnel</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {operationalAnalytics?.staffProductivity.map((staff) => (
                    <div
                      key={staff.staffId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{staff.name}</div>
                        <div className="text-sm text-muted-foreground">{staff.role}</div>
                      </div>
                      <div className="flex gap-8 text-center">
                        <div>
                          <div className="text-sm text-muted-foreground">Rendez-vous</div>
                          <div className="text-xl font-bold">{staff.rendez-vousHandled}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Traitements</div>
                          <div className="text-xl font-bold">{staff.treatmentsTerminés}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Chiffre d’affaires</div>
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(staff.revenue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rotation du stock</CardTitle>
                <CardDescription>Vitesse d’utilisation du stock</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">
                      {operationalAnalytics?.inventoryTurnover?.toFixed(2) || '0.00'}x
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Taux moyen de rotation par période
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alerte stock faible</CardTitle>
                <CardDescription>Articles à recommander</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-orange-600">
                      {operationalAnalytics?.lowStockItems || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Articles sous le seuil de réapprovisionnement</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
