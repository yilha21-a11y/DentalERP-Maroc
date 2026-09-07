'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Languages, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getLocaleLabel, resolveLocaleCascade } from '@/lib/i18n/config'
import { formatCurrency, formatDate } from '@/lib/i18n/format'

const INHERIT = 'inherit'

interface LanguagePreferenceCardProps {
  locale: string | null
  hospitalLocale: string | null
  currency: string
  supportedLocales: readonly string[]
  endpoint: string
  description?: string
}

export function LanguagePreferenceCard({
  locale,
  hospitalLocale,
  currency,
  supportedLocales,
  endpoint,
  description = 'Choisissez le format des dates, des nombres et des montants.',
}: LanguagePreferenceCardProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [selected, setSelected] = useState(locale ?? INHERIT)
  const [saving, setSaving] = useState(false)

  const effective = resolveLocaleCascade(selected === INHERIT ? null : selected, hospitalLocale)
  const dirty = selected !== (locale ?? INHERIT)

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: selected === INHERIT ? null : selected }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Impossible d’enregistrer la langue')
      }

      toast({
        title: 'Langue mise à jour',
        description:
          selected === INHERIT
            ? 'Vous utilisez maintenant la langue par défaut du cabinet.'
            : `Le format utilise maintenant ${getLocaleLabel(selected)}.`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible d’enregistrer la langue',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Langue et format
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="locale">Langue</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger id="locale" className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={INHERIT}>
                Utiliser la langue du cabinet
                {hospitalLocale ? ` (${getLocaleLabel(hospitalLocale)})` : ''}
              </SelectItem>
              {supportedLocales.map((value) => (
                <SelectItem key={value} value={value}>
                  {getLocaleLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Pour cette version, le français du Maroc est la langue principale du système.
          </p>
        </div>

        <div className="rounded-md border p-4">
          <p className="text-sm font-medium">Aperçu</p>
          <dl className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex gap-2">
              <dt>Montant</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(125000.5, { locale: effective, currency })}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt>Date</dt>
              <dd className="font-medium text-foreground">
                {formatDate(new Date(2026, 0, 31), { locale: effective })}
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </CardFooter>
    </Card>
  )
}
