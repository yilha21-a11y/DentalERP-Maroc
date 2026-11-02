'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Building2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

const signupSchema = z
  .object({
    hospitalName: z.string().min(2, 'Le nom du cabinet doit contenir au moins 2 caractères'),
    adminName: z.string().min(2, 'Votre nom doit contenir au moins 2 caractères'),
    email: z.string().email('Veuillez saisir une adresse e-mail valide'),
    phone: z.string().min(10, 'Veuillez saisir un numéro de téléphone valide'),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmMot de passe: z.string(),
  })
  .refine((data) => data.password === data.confirmMot de passe, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmMot de passe'],
  })

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/public/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalName: data.hospitalName,
          adminName: data.adminName,
          email: data.email,
          phone: data.phone,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Échec de l’inscription',
          description: result.error || 'Une erreur est survenue. Veuillez réessayer.',
        })
        return
      }

      toast({
        title: 'Compte créé',
        description: 'Consultez votre e-mail pour vérifier votre compte.',
      })

      // Redirect to verification pending page
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Une erreur est survenue. Veuillez réessayer.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Créer votre cabinet</CardTitle>
        <CardDescription>Créez votre espace DentalERP Maroc</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hospitalName">Nom du cabinet</Label>
            <Input
              id="hospitalName"
              placeholder="Cabinet Dentaire Al Amal"
              {...register('hospitalName')}
              disabled={isLoading}
            />
            {errors.hospitalName && (
              <p className="text-sm text-destructive">{errors.hospitalName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminName">Votre nom</Label>
            <Input
              id="adminName"
              placeholder="Dr Sara Amrani"
              {...register('adminName')}
              disabled={isLoading}
            />
            {errors.adminName && (
              <p className="text-sm text-destructive">{errors.adminName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="dentiste@cabinet.ma"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+212 6 00 00 00 00"
              {...register('phone')}
              disabled={isLoading}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="Au moins 8 caractères"
              {...register('password')}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmMot de passe">Confirm Mot de passe</Label>
            <Input
              id="confirmMot de passe"
              type="password"
              placeholder="Confirmez votre mot de passe"
              {...register('confirmMot de passe')}
              disabled={isLoading}
            />
            {errors.confirmMot de passe && (
              <p className="text-sm text-destructive">{errors.confirmMot de passe.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer le compte
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Vous avez déjà un compte ? Se connecter
          </Link>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          En créant un compte, vous acceptez les conditions d’utilisation et la politique de confidentialité.
        </div>
      </CardContent>
    </Card>
  )
}
