'use client'

import { useEffect, useState } from 'react'

type QueueItem = {
  id: string
  status: string
  roomLabel: string | null
  firstName: string
  lastInitial: string
}

export default function WaitingRoomDisplayPage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/waiting-room', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setItems(json.data || [])
      }
    }
    load()
    const q = setInterval(load, 5000)
    const c = setInterval(() => setNow(new Date()), 1000)
    return () => { clearInterval(q); clearInterval(c) }
  }, [])

  const current = items.find((x) => x.status === 'CALLED' || x.status === 'IN_CONSULTATION')
  const waiting = items.filter((x) => x.status === 'WAITING').slice(0, 8)

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Salle d’attente</h1>
          <p className="mt-2 text-xl text-slate-500">Veuillez patienter, nous allons vous appeler.</p>
        </div>
        <div className="text-right text-2xl font-semibold">
          {now.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      <section className="mb-10 rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-lg font-semibold uppercase tracking-wide text-slate-500">Actuellement</p>
        {current ? (
          <div className="mt-4 flex items-end justify-between gap-8">
            <div className="text-6xl font-bold">{current.firstName} {current.lastInitial}.</div>
            <div className="text-right">
              <div className="text-3xl font-semibold">{current.status === 'CALLED' ? 'Veuillez vous présenter' : 'En consultation'}</div>
              {current.roomLabel && <div className="mt-2 text-4xl font-bold">{current.roomLabel}</div>}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-3xl text-slate-500">Aucun patient appelé pour le moment.</p>
        )}
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-3xl font-bold">Prochains patients</h2>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {waiting.length ? waiting.map((item) => (
            <div key={item.id} className="rounded-2xl border p-5 text-3xl font-semibold">
              {item.firstName} {item.lastInitial}. <span className="float-right text-xl font-normal text-slate-500">En attente</span>
            </div>
          )) : <p className="text-2xl text-slate-500">Aucun patient en attente.</p>}
        </div>
      </section>

      <footer className="mt-10 text-center text-lg text-slate-500">Votre santé dentaire, notre priorité.</footer>
    </main>
  )
}
