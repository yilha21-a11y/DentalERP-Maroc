'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MessageSquare, Plus, Send, Users, AlertTriangle } from 'lucide-react'

type Conversation = {
  id: string
  name: string | null
  isGroup: boolean
  isBroadcast: boolean
  memberNames: string | null
  lastMessage: string
  lastMessageAt: string
  unreadCount: number | string
}

type Message = {
  id: string
  body: string
  senderId: string
  senderName: string
  createdAt: string
  isUrgent: boolean
  attachmentUrl?: string | null
}

type Staff = {
  id: string
  firstName: string
  lastName: string
  user: { id: string; role: string; isActive: boolean; email: string }
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [staff, setStaff] = useState<Staff[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [conversationName, setConversationName] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/internal-messages', { cache: 'no-store' })
    if (!res.ok) return
    const json = await res.json()
    const rows = json.data || []
    setConversations(rows)
    if (!activeId && rows[0]?.id) setActiveId(rows[0].id)
  }, [activeId])

  const loadMessages = useCallback(async () => {
    if (!activeId) { setMessages([]); return }
    const res = await fetch(`/api/internal-messages?conversationId=${encodeURIComponent(activeId)}`, { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      setMessages(json.data || [])
    }
  }, [activeId])

  useEffect(() => {
    loadConversations()
    fetch('/api/staff?all=true').then((r) => r.ok ? r.json() : null).then((j) => setStaff(j?.staff || []))
    const timer = setInterval(loadConversations, 5000)
    return () => clearInterval(timer)
  }, [loadConversations])

  useEffect(() => {
    loadMessages()
    const timer = setInterval(loadMessages, 3000)
    return () => clearInterval(timer)
  }, [loadMessages])

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId])

  const send = async () => {
    const body = text.trim()
    if (!activeId || !body) return
    const res = await fetch('/api/internal-messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: activeId, message: body, isUrgent: urgent }),
    })
    if (res.ok) {
      setText('')
      setUrgent(false)
      loadMessages()
      loadConversations()
    }
  }

  const createConversation = async (broadcast = false) => {
    setError('')
    const res = await fetch('/api/internal-messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createConversation',
        participantIds: selected,
        name: conversationName.trim() || null,
        isBroadcast: broadcast,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error || 'Impossible de créer la conversation'); return }
    setSelected([])
    setConversationName('')
    setDialogOpen(false)
    setActiveId(json.conversationId)
    loadConversations()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages internes</h1>
          <p className="text-muted-foreground">Discussions entre dentistes, réception, assistants et administration.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nouvelle conversation</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nouvelle conversation</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Nom du groupe (optionnel)" value={conversationName} onChange={(e) => setConversationName(e.target.value)} />
              <div className="max-h-64 space-y-2 overflow-auto rounded-md border p-3">
                {staff.filter((s) => s.user?.isActive).map((s) => {
                  const checked = selected.includes(s.user.id)
                  return (
                    <label key={s.user.id} className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-muted">
                      <Checkbox checked={checked} onCheckedChange={(v) => setSelected((prev) => v ? [...prev, s.user.id] : prev.filter((id) => id !== s.user.id))} />
                      <span className="flex-1">{s.firstName} {s.lastName}</span>
                      <Badge variant="outline">{s.user.role}</Badge>
                    </label>
                  )
                })}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => createConversation(false)}><Users className="mr-2 h-4 w-4" />Créer</Button>
                <Button variant="outline" onClick={() => createConversation(true)}>Diffuser à tous</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid min-h-[650px] gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-lg">Conversations</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-2 pt-0">
            {conversations.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucune conversation.</p>}
            {conversations.map((c) => (
              <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full rounded-lg p-3 text-left ${activeId === c.id ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name || c.memberNames || 'Conversation'}</span>
                  {Number(c.unreadCount) > 0 && <Badge>{c.unreadCount}</Badge>}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{c.lastMessage || 'Aucun message'}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex min-h-[650px] flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              {active?.isBroadcast && <Users className="h-4 w-4" />}
              {active ? (active.name || active.memberNames || 'Conversation') : 'Sélectionnez une conversation'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-0">
            <div className="flex-1 space-y-3 overflow-auto p-4">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-xl border p-3 ${m.isUrgent ? 'border-amber-400 bg-amber-50' : 'bg-background'}`}>
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{m.senderName}</span>
                    {m.isUrgent && <span className="flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" />Urgent</span>}
                    <span>{new Date(m.createdAt).toLocaleString('fr-MA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  {m.attachmentUrl && <a className="mt-2 block text-sm text-primary underline" href={m.attachmentUrl} target="_blank" rel="noreferrer">Pièce jointe</a>}
                </div>
              ))}
            </div>
            {activeId && (
              <div className="border-t p-4">
                <Textarea placeholder="Écrire un message…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={urgent} onCheckedChange={(v) => setUrgent(Boolean(v))} />Message urgent</label>
                  <Button onClick={send} disabled={!text.trim()}><Send className="mr-2 h-4 w-4" />Envoyer</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
