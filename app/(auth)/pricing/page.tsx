import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Building2, Zap, Crown, Server, ArrowLeft } from 'lucide-react'

const plans = [
  {
    id: 'FREE',
    name: 'Gratuit',
    price: '0 MAD',
    description: 'Pour découvrir DentalERP Maroc',
    icon: Building2,
    features: [
      'Jusqu’à 100 patients',
      'Jusqu’à 3 membres du personnel',
      '500 Mo de stockage',
      'Rapports de base',
      'Gestion des patients',
      'Gestion des rendez-vous',
      'Facturation de base',
    ],
    cta: 'Commencer gratuitement',
    ctaVariant: 'outline' as const,
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professionnel',
    price: 'Sur devis',
    description: 'Pour les cabinets dentaires en activité',
    icon: Zap,
    popular: true,
    features: [
      'Patients illimités',
      'Personnel illimité',
      'Stockage étendu',
      'Analyses avancées',
      'Gestion du laboratoire',
      'Gestion du stock',
      'Notifications et communications',
      'Gestion multi-utilisateurs',
    ],
    cta: 'Demander un devis',
    ctaVariant: 'default' as const,
  },
  {
    id: 'ENTERPRISE',
    name: 'Entreprise',
    price: 'Sur devis',
    description: 'Pour les groupes et structures multi-sites',
    icon: Crown,
    features: [
      'Toutes les fonctions Professionnel',
      'Gestion multi-sites',
      'Intégrations personnalisées',
      'Accompagnement au déploiement',
      'Fonctions de sécurité avancées',
      'Formation personnalisée',
    ],
    cta: 'Nous contacter',
    ctaVariant: 'outline' as const,
  },
  {
    id: 'SELF_HOSTED',
    name: 'Auto-hébergé',
    price: 'Sur devis',
    description: 'Déploiement sur votre propre infrastructure',
    icon: Server,
    features: [
      'Déploiement sur votre serveur',
      'Contrôle de vos données',
      'Scripts Docker',
      'Documentation de déploiement',
      'Assistance à l’installation',
    ],
    cta: 'Demander un devis',
    ctaVariant: 'outline' as const,
  },
]

const faqs = [
  {
    question: 'Puis-je changer de formule plus tard ?',
    answer: 'Oui. La formule peut être adaptée lorsque les besoins du cabinet évoluent.',
  },
  {
    question: 'Les montants sont-ils en dirhams marocains ?',
    answer: 'Oui. DentalERP Maroc utilise le MAD pour la facturation et les rapports financiers.',
  },
  {
    question: 'Puis-je héberger le logiciel sur mon propre serveur ?',
    answer: 'Oui. Une installation auto-hébergée peut être préparée pour l’infrastructure du cabinet.',
  },
  {
    question: 'Quels moyens de paiement sont prévus pour les patients ?',
    answer: 'Le cabinet peut enregistrer notamment les paiements en espèces, par carte, virement ou chèque selon sa configuration.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              D
            </div>
            <span className="font-semibold">DentalERP Maroc</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login"><Button variant="ghost" size="sm">Se connecter</Button></Link>
            <Link href="/signup"><Button size="sm">Créer un compte</Button></Link>
          </nav>
        </div>
      </header>

      <main className="container py-16">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Retour à l’accueil
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Formules DentalERP Maroc</h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Choisissez une formule adaptée à votre cabinet dentaire.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-4 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon
            return (
              <Card key={plan.id} className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Recommandé</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${plan.popular ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4"><span className="text-3xl font-bold">{plan.price}</span></div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/signup" className="w-full">
                    <Button className="w-full" variant={plan.ctaVariant}>{plan.cta}</Button>
                  </Link>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Questions fréquentes</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardHeader><CardTitle className="text-lg">{faq.question}</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">{faq.answer}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
