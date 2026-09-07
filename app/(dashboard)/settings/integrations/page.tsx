'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { Calendar, Check, ExternalLink, Loader2, RefreshCcw, Unplug, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'

interface CalendarStatus {
  connected: boolean
  integration: {
    id: string
    provider: string
    calendarId: string | null
    syncEnabled: boolean
    lastSyncAt: string | null
    createdAt: string
  } | null
}

export default function IntegrationsPage() {
  const { toast } = useToast()
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()
  const searchParams = useSearchParams()
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success === 'connected') toast({ title: 'Google Calendar connecté avec succès' })
    else if (error) {
      const messages: Record<string, string> = {
        denied: 'Accès au calendrier refusé',
        missing_params: 'Paramètres Google manquants',
        invalid_state: 'Session invalide',
        token_exchange: 'Impossible de finaliser l’authentification Google',
      }
      toast({ variant: 'destructive', title: 'Échec de la connexion', description: messages[error] || 'Une erreur est survenue' })
    }
  }, [searchParams, toast])

  const fetchCalendarStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/integrations/google-calendar/sync')
      if (!res.ok) throw new Error()
      setCalendarStatus(await res.json())
    } catch {
      setCalendarStatus({ connected: false, integration: null })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCalendarStatus() }, [])

  const handleConnect = async () => {
    try {
      setConnecting(true)
      const res = await fetch('/api/integrations/google-calendar/auth')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Impossible de démarrer la connexion')
      window.location.href = data.authUrl
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message })
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/integrations/google-calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Synchronisation terminée', description: data.message })
      fetchCalendarStatus()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Échec de la synchronisation', description: err.message })
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    const ok = await confirm({
      title: 'Déconnecter Google Calendar ?',
      description: 'Les événements déjà synchronisés ne seront pas supprimés de Google.',
      confirmLabel: 'Oui, déconnecter',
    })
    if (!ok) return
    try {
      setDisconnecting(true)
      const res = await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Impossible de déconnecter Google Calendar')
      toast({ title: 'Google Calendar déconnecté' })
      setCalendarStatus({ connected: false, integration: null })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message })
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Intégrations</h1>
        <p className="text-muted-foreground">Connectez les services externes utilisés par le cabinet.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50"><Calendar className="h-6 w-6 text-blue-600" /></div>
              <div>
                <CardTitle>Google Calendar</CardTitle>
                <CardDescription>Synchronisez automatiquement les rendez-vous du cabinet.</CardDescription>
              </div>
            </div>
            {!loading && <Badge variant={calendarStatus?.connected ? 'default' : 'secondary'}>{calendarStatus?.connected ? 'Connecté' : 'Non connecté'}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Chargement…</div>
          ) : calendarStatus?.connected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Identifiant du calendrier</p><p className="font-medium">{calendarStatus.integration?.calendarId || 'principal'}</p></div>
                <div><p className="text-muted-foreground">Connecté depuis</p><p className="font-medium">{calendarStatus.integration?.createdAt ? format(new Date(calendarStatus.integration.createdAt), 'PPP') : '—'}</p></div>
                <div><p className="text-muted-foreground">Dernière synchronisation</p><p className="font-medium">{calendarStatus.integration?.lastSyncAt ? format(new Date(calendarStatus.integration.lastSyncAt), 'PPp') : 'Jamais'}</p></div>
                <div><p className="text-muted-foreground">Statut</p><p className="font-medium flex items-center gap-1"><Check className="h-4 w-4 text-green-600" />{calendarStatus.integration?.syncEnabled ? 'Synchronisation activée' : 'Synchronisation désactivée'}</p></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSync} disabled={syncing}>{syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}Synchroniser</Button>
                <Button variant="outline" onClick={handleDisconnect} disabled={disconnecting} className="text-destructive">{disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unplug className="h-4 w-4 mr-2" />}Déconnecter</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Connectez Google Calendar pour synchroniser automatiquement les créations et modifications de rendez-vous.</p>
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg"><AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" /><p className="text-xs text-amber-800">Les identifiants Google Calendar doivent être configurés par l’administrateur du serveur.</p></div>
              <Button onClick={handleConnect} disabled={connecting}>{connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}Connecter Google Calendar</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50"><Calendar className="h-6 w-6 text-muted-foreground" /></div><div><CardTitle className="text-muted-foreground">Microsoft Outlook Calendar</CardTitle><CardDescription>Bientôt disponible</CardDescription></div></div></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">L’intégration Outlook Calendar est prévue dans une prochaine version.</p></CardContent>
      </Card>
      {ConfirmDialogComponent}
    </div>
  )
}
