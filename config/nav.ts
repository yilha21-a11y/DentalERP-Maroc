import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  Receipt,
  Package,
  FlaskConical,
  UserCog,
  BarChart3,
  Settings,
  FileText,
  CreditCard,
  Shield,
  TrendingUp,
  MessageSquare,
  BotMessageSquare,
  Sparkles,
  Pill,
  ClipboardList,
  ClipboardCheck,
  Building2,
  FileCheck,
  Heart,
  Crown,
  Gift,
  Share2,
  Clock,
  Link2,
  CalendarClock,
  Video,
  Zap,
  Star,
  Cpu,
  DollarSign,
  Activity,
  Upload,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  roles?: string[]
  badge?: string
  subItems?: NavItem[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    title: 'Vue générale',
    items: [
      { title: 'Assistant IA', href: '/chat', icon: BotMessageSquare },
      { title: 'Messages', href: '/messages', icon: MessageSquare },
      { title: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Soins patients',
    items: [
      { title: 'Patients', href: '/patients', icon: Users },
      {
        title: 'Rendez-vous',
        href: '/appointments',
        icon: Calendar,
        subItems: [
          { title: 'Tous les rendez-vous', href: '/appointments', icon: Calendar },
          {
            title: 'Liste d’attente',
            href: '/appointments/waitlist',
            icon: Clock,
            roles: ['ADMIN', 'RECEPTIONIST'],
          },
        ],
      },
      {
        title: 'Salle d’attente',
        href: '/waiting-room',
        icon: Clock,
        roles: ['ADMIN', 'DOCTOR', 'ASSISTANT', 'RECEPTIONIST'],
      },
      {
        title: 'Téléconsultations',
        href: '/video',
        icon: Video,
        roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
      },
      {
        title: 'Traitements',
        href: '/treatments',
        icon: Stethoscope,
        roles: ['ADMIN', 'DOCTOR'],
      },
      {
        title: 'Ordonnances',
        href: '/prescriptions',
        icon: ClipboardList,
        roles: ['ADMIN', 'DOCTOR'],
      },
      {
        title: 'Médicaments',
        href: '/medications',
        icon: Pill,
        roles: ['ADMIN', 'DOCTOR'],
      },
    ],
  },
  {
    title: 'Finances',
    items: [
      {
        title: 'Facturation',
        href: '/billing',
        icon: Receipt,
        roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],
        subItems: [
          { title: 'Vue générale', href: '/billing', icon: Receipt },
          { title: 'Factures', href: '/billing/invoices', icon: FileText },
          { title: 'Paiements', href: '/billing/payments', icon: CreditCard },
          {
            title: 'Plans de paiement',
            href: '/billing/payment-plans',
            icon: CalendarClock,
            roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],
          },
          {
            title: 'Dossiers assurance',
            href: '/billing/insurance',
            icon: Shield,
            roles: ['ADMIN', 'ACCOUNTANT'],
          },
          {
            title: 'Préautorisations',
            href: '/billing/insurance/pre-auth',
            icon: FileCheck,
            roles: ['ADMIN', 'ACCOUNTANT'],
          },
          {
            title: 'Assureurs',
            href: '/billing/insurance/providers',
            icon: Building2,
            roles: ['ADMIN'],
          },
          {
            title: 'Rapports financiers',
            href: '/billing/reports',
            icon: TrendingUp,
            roles: ['ADMIN', 'ACCOUNTANT'],
          },
        ],
      },
      {
        title: 'Encaissements réception',
        href: '/reception-charges',
        icon: CreditCard,
        roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'DOCTOR'],
      },
    ],
  },
  {
    title: 'Relation patient',
    items: [
      {
        title: 'CRM',
        href: '/crm',
        icon: Heart,
        roles: ['ADMIN', 'RECEPTIONIST'],
        subItems: [
          { title: 'Tableau de bord', href: '/crm', icon: Heart },
          { title: 'Abonnements', href: '/crm/memberships', icon: Crown },
          { title: 'Fidélité', href: '/crm/loyalty', icon: Gift },
          { title: 'Parrainages', href: '/crm/referrals', icon: Share2 },
          {
            title: 'Segments',
            href: '/crm/segments',
            icon: Users,
            roles: ['ADMIN'],
          },
        ],
      },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { title: 'Stock', href: '/inventory', icon: Package, roles: ['ADMIN', 'ASSISTANT', 'LAB_TECH'] },
      {
        title: 'Stérilisation',
        href: '/sterilization',
        icon: Shield,
        roles: ['ADMIN', 'DOCTOR', 'ASSISTANT'],
        subItems: [
          { title: 'Tableau de bord', href: '/sterilization', icon: Shield },
          { title: 'Instruments', href: '/sterilization/instruments', icon: Package },
          { title: 'Cycles', href: '/sterilization/logs', icon: ClipboardList },
          {
            title: 'Conformité',
            href: '/sterilization/reports',
            icon: BarChart3,
            roles: ['ADMIN'],
          },
        ],
      },
      { title: 'Appareils', href: '/devices', icon: Cpu, roles: ['ADMIN'] },
      {
        title: 'Laboratoire',
        href: '/lab',
        icon: FlaskConical,
        roles: ['ADMIN', 'DOCTOR', 'ASSISTANT', 'LAB_TECH'],
      },
      {
        title: 'Communications patients',
        href: '/communications',
        icon: MessageSquare,
        roles: ['ADMIN', 'RECEPTIONIST'],
        subItems: [
          { title: 'Envoyer des messages', href: '/communications', icon: MessageSquare },
          {
            title: 'Statistiques',
            href: '/communications/analytics',
            icon: BarChart3,
            roles: ['ADMIN'],
          },
          {
            title: 'Automatisations',
            href: '/communications/automations',
            icon: Zap,
            roles: ['ADMIN'],
          },
          {
            title: 'Avis patients',
            href: '/communications/feedback',
            icon: Star,
            roles: ['ADMIN'],
          },
        ],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        title: 'Personnel',
        href: '/staff',
        icon: UserCog,
        roles: ['ADMIN'],
        subItems: [
          { title: 'Tout le personnel', href: '/staff', icon: UserCog },
          { title: 'Invitations', href: '/staff/invites', icon: UserCog },
          { title: 'Présences', href: '/staff/attendance', icon: Calendar },
          { title: 'Congés', href: '/staff/leaves', icon: Calendar },
        ],
      },
      {
        title: 'Rapports',
        href: '/reports',
        icon: BarChart3,
        roles: ['ADMIN', 'ACCOUNTANT', 'DOCTOR'],
        subItems: [
          { title: 'Vue générale', href: '/reports', icon: BarChart3 },
          {
            title: 'Statistiques dentistes',
            href: '/reports/doctors',
            icon: TrendingUp,
            roles: ['ADMIN', 'ACCOUNTANT', 'DOCTOR'],
          },
          {
            title: 'Journal d’audit',
            href: '/reports/audit-log',
            icon: Activity,
            roles: ['ADMIN'],
          },
        ],
      },
      {
        title: 'Paramètres',
        href: '/settings',
        icon: Settings,
        roles: ['ADMIN'],
        subItems: [
          { title: 'Général', href: '/settings', icon: Settings },
          { title: 'Guide de configuration', href: '/settings/setup-guide', icon: BookOpen },
          { title: 'Rôles et permissions', href: '/settings/permissions', icon: Shield, roles: ['ADMIN'] },
          { title: 'Fonctions IA', href: '/settings/ai', icon: Sparkles },
          { title: 'Formulaires', href: '/settings/forms', icon: ClipboardCheck },
          { title: 'Intégrations', href: '/settings/integrations', icon: Link2 },
          { title: 'Conseiller de tarification', href: '/settings/pricing', icon: DollarSign },
          { title: 'Importation de données', href: '/settings/import', icon: Upload },
        ],
      },
    ],
  },
]

export function getNavigationForRole(role: string): NavSection[] {
  return navigation
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => !item.roles || item.roles.includes(role))
        .map((item) => ({
          ...item,
          subItems: item.subItems?.filter(
            (subItem) => !subItem.roles || subItem.roles.includes(role)
          ),
        })),
    }))
    .filter((section) => section.items.length > 0)
}