'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  patients: 'Patients',
  appointments: 'Rendez-vous',
  treatments: 'Traitements',
  billing: 'Facturation',
  inventory: 'Stock',
  staff: 'Personnel',
  settings: 'Paramètres',
  reports: 'Rapports',
  communications: 'Communications',
  lab: 'Commandes laboratoire',
  prescriptions: 'Ordonnances',
  medications: 'Drug Catalog',
  video: 'Video Consults',
  chat: 'AI Chat',
  crm: 'CRM',
  sterilization: 'Sterilization',
  devices: 'Devices',
  onboarding: 'Onboarding',
  // Sub-routes
  new: 'New',
  edit: 'Modifier',
  invoices: 'Factures',
  payments: 'Paiements',
  insurance: 'Insurance',
  'payment-plans': 'Plans de paiement',
  'pre-auth': 'Pre-Authorizations',
  providers: 'Providers',
  waitlist: 'Liste d’attente',
  queue: 'Queue',
  plans: 'Treatment Plans',
  memberships: 'Memberships',
  loyalty: 'Loyalty',
  referrals: 'Referrals',
  segments: 'Segments',
  instruments: 'Instruments',
  logs: 'Cycle Logs',
  vendors: 'Vendors',
  transactions: 'Transactions',
  suppliers: 'Suppliers',
  attendance: 'Attendance',
  leaves: 'Leaves',
  invites: 'Invites',
  performance: 'Performance',
  analytics: 'Analytics',
  automations: 'Automations',
  feedback: 'Feedback',
  clinic: 'Clinic',
  ai: 'AI Features',
  forms: 'Forms',
  integrations: 'Integrations',
  pricing: 'Pricing Advisor',
  security: 'Security',
  system: 'System',
  subscription: 'Subscription',
  procedures: 'Procedures',
}

function isUUID(segment: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
    /^c[a-z0-9]{24,}$/i.test(segment)
  )
}

export function Breadcrumb({ className }: { className?: string }) {
  const pathname = usePathname()

  const segments = pathname.split('/').filter(Boolean)

  if (segments.length <= 1) return null

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1
    const label = isUUID(segment)
      ? 'Details'
      : ROUTE_LABELS[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')

    return { label, href, isLast }
  })

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1.5 text-sm text-muted-foreground', className)}
    >
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground truncate max-w-[200px]">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors truncate max-w-[150px]"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
