'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

const roleLabels: Record<string,string> = {
  DOCTOR: 'Dentiste', ASSISTANT: 'Assistant(e)', RECEPTIONIST: 'Réception', ACCOUNTANT: 'Comptable', LAB_TECH: 'Stock / laboratoire',
}
const permissionLabels: Record<string,string> = {
  'patients.view': 'Voir les patients',
  'patients.edit': 'Modifier les patients',
  'clinical.view': 'Voir le dossier clinique',
  'clinical.edit': 'Modifier le dossier clinique',
  'appointments.manage': 'Gérer les rendez-vous',
  'queue.manage': 'Gérer la salle d’attente',
  'billing.view': 'Voir la facturation',
  'billing.collect': 'Encaisser les paiements',
  'billing.discount': 'Accorder une remise',
  'reports.own': 'Voir ses statistiques',
  'reports.all_doctors': 'Voir les statistiques de tous les dentistes',
  'staff.manage': 'Gérer le personnel',
  'settings.manage': 'Modifier les paramètres',
  'inventory.manage': 'Gérer le stock',
  'lab.manage': 'Gérer le laboratoire',
  'messages.use': 'Utiliser la messagerie',
  'messages.broadcast': 'Diffuser à tout le personnel',
  'export.data': 'Exporter les données',
  'delete.records': 'Supprimer des dossiers',
}

type PermissionData = Record<string,Record<string,boolean>>

export default function PermissionsPage() {
  const [roles, setRoles] = useState<string[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [data, setData] = useState<PermissionData>({})
  const [saving, setSaving] = useState('')

  useEffect(() => {
    fetch('/api/settings/permissions', { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) return
      const json = await r.json()
      setRoles(json.roles || [])
      setPermissions(json.permissions || [])
      setData(json.data || {})
    })
  }, [])

  const toggle = async (role: string, permission: string, allowed: boolean) => {
    const key = `${role}:${permission}`
    setSaving(key)
    setData((prev) => ({ ...prev, [role]: { ...prev[role], [permission]: allowed } }))
    const res = await fetch('/api/settings/permissions', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, permission, allowed }),
    })
    if (!res.ok) {
      setData((prev) => ({ ...prev, [role]: { ...prev[role], [permission]: !allowed } }))
    }
    setSaving('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rôles et permissions</h1>
        <p className="text-muted-foreground">L’administrateur contrôle précisément les accès de chaque rôle.</p>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4 text-sm">Le rôle <strong>Administrateur</strong> conserve toujours tous les droits. Les changements ci-dessous sont appliqués côté serveur, pas seulement dans le menu.</CardContent>
      </Card>

      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role}>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg">{roleLabels[role] || role}<Badge variant="outline">{role}</Badge></CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {permissions.map((permission) => {
                const key = `${role}:${permission}`
                return (
                  <label key={permission} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <span className="text-sm">{permissionLabels[permission] || permission}</span>
                    <Switch checked={Boolean(data[role]?.[permission])} disabled={saving === key} onCheckedChange={(v) => toggle(role, permission, v)} />
                  </label>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
