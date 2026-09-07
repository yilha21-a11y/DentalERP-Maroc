'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type QueueItem = {
  id: string
  status: string
  roomLabel: string | null
  firstName: string
  lastInitial: string
}

function WaitingRoomDisplayContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [items, setItems] = useState<QueueItem[]>([])
  const [now, setNow] = useState(new Date())
  const [soundEnabled, setSoundEnabled] = useState(false)
  const previousSignature = useRef<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const playChime = () => {
    if (!soundEnabled) return

    try {
      const AudioContextClass = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return

      const ctx = audioContextRef.current || new AudioContextClass()
      audioContextRef.current = ctx

      if (ctx.state === 'suspended') {
        void ctx.resume()
      }

      const gain = ctx.createGain()
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65)

      const firstTone = ctx.createOscillator()
      firstTone.type = 'sine'
      firstTone.frequency.setValueAtTime(740, ctx.currentTime)
      firstTone.connect(gain)
      firstTone.start(ctx.currentTime)
      firstTone.stop(ctx.currentTime + 0.28)

      const secondTone = ctx.createOscillator()
      secondTone.type = 'sine'
      secondTone.frequency.setValueAtTime(988, ctx.currentTime + 0.3)
      secondTone.connect(gain)
      secondTone.start(ctx.currentTime + 0.3)
      secondTone.stop(ctx.currentTime + 0.65)
    } catch {
      // Le son est optionnel : l'affichage continue même si le navigateur le bloque.
    }
  }

  const enableSound = async () => {
    try {
      const AudioContextClass = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        const ctx = audioContextRef.current || new AudioContextClass()
        audioContextRef.current = ctx
        await ctx.resume()
      }
      setSoundEnabled(true)
    } catch {
      setSoundEnabled(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      const endpoint = token ? `/api/waiting-room?token=${encodeURIComponent(token)}` : '/api/waiting-room'
      const res = await fetch(endpoint, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        const nextItems: QueueItem[] = json.data || []
        const signature = nextItems
          .map((item) => `${item.id}:${item.status}:${item.roomLabel || ''}`)
          .sort()
          .join('|')

        if (previousSignature.current !== null && previousSignature.current !== signature) {
          playChime()
        }

        previousSignature.current = signature
        setItems(nextItems)
      }
    }

    load()
    const q = setInterval(load, 5000)
    const c = setInterval(() => setNow(new Date()), 1000)
    return () => {
      clearInterval(q)
      clearInterval(c)
    }
  }, [token, soundEnabled])

  const current = items.find((x) => x.status === 'CALLED' || x.status === 'IN_CONSULTATION')
  const waiting = items.filter((x) => x.status === 'WAITING').slice(0, 8)

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <header className="mb-8 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">Salle d’attente</h1>
          <p className="mt-2 text-xl text-slate-500">Veuillez patienter, nous allons vous appeler.</p>
        </div>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={enableSound}
            className={`rounded-xl px-4 py-2 text-base font-semibold ${soundEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
          >
            {soundEnabled ? '🔊 Son activé' : '🔇 Activer le son'}
          </button>
          <div className="text-right text-2xl font-semibold">
            {now.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
          </div>
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

export default function WaitingRoomDisplayPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8"><p className="text-2xl text-slate-500">Chargement de la salle d’attente…</p></main>}>
      <WaitingRoomDisplayContent />
    </Suspense>
  )
}
