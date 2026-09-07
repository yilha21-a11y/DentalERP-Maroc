'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PhoneCall, Play, CheckCircle2, Clock3, Monitor } from 'lucide-react'

type QueueItem = {
  id: string
  appointmentId: string
  status: 'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED'
  roomLabel: string | null
  arrivedAt: string
  firstName: string
  lastInitial: string
  doctorFirstName: string
  doctorLastName: string
}

const labels: Record<QueueItem['status'], string> = {
  WAITING: 'En attente',
  CALLED: 'Appelé',
  IN_CONSULTATION: 'En consultation',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
}

export default function WaitingRoomManagementPage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [rooms, setRooms] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/waiting-room', { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      setItems(json.data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load])

  const update = async (item: QueueItem, status: QueueItem['status']) => {
    await fetch('/api/waiting-room', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status, roomLabel: rooms[item.id] || item.roomLabel }),
    })
    load()
  }

  const waiting = items.filter((x) => x.status === 'WAITING')
  const active = items.filter((x) => x.status === 'CALLED' || x.status === 'IN_CONSULTATION')
  const completed = items.filter((x) => x.status === 'COMPLETED')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salle d’attente</h1>
          <p className="text-muted-foreground">Gestion en temps réel de l’accueil jusqu’à la consultation.</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/waiting-room-display" target="_blank" rel="noreferrer"><Monitor className="mr-2 h-4 w-4" />Écran TV</a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">En attente</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{waiting.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Appelés / en consultation</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{active.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Terminés aujourd’hui</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{completed.length}</CardContent></Card>
      </div>

      {loading ? <p>Chargement…</p> : (
        <div className="space-y-3">
          {items.filter((x) => x.status !== 'CANCELLED').map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-56">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{item.firstName} {item.lastInitial}.</span>
                    <Badge variant="outline">{labels[item.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Dr {item.doctorFirstName} {item.doctorLastName}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />Arrivé à {new Date(item.arrivedAt).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                <Input
                  className="w-36"
                  placeholder="Salle 1"
                  value={rooms[item.id] ?? item.roomLabel ?? ''}
                  onChange={(e) => setRooms((r) => ({ ...r, [item.id]: e.target.value }))}
                />

                <div className="flex flex-wrap gap-2">
                  {item.status === 'WAITING' && <Button onClick={() => update(item, 'CALLED')}><PhoneCall className="mr-2 h-4 w-4" />Appeler</Button>}
                  {item.status === 'CALLED' && <Button onClick={() => update(item, 'IN_CONSULTATION')}><Play className="mr-2 h-4 w-4" />En consultation</Button>}
                  {item.status === 'IN_CONSULTATION' && <Button onClick={() => update(item, 'COMPLETED')}><CheckCircle2 className="mr-2 h-4 w-4" />Terminer</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
