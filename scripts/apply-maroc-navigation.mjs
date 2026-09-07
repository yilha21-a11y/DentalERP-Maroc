import fs from 'node:fs'

const file = 'config/nav.ts'
let text = fs.readFileSync(file, 'utf8')

function insertAfter(marker, block) {
  if (text.includes(block.trim())) return
  const index = text.indexOf(marker)
  if (index < 0) throw new Error(`Navigation marker not found: ${marker.slice(0, 60)}`)
  const at = index + marker.length
  text = text.slice(0, at) + block + text.slice(at)
}

insertAfter(
`      {
        title: 'Rendez-vous',
        href: '/appointments',
        icon: Calendar,
        subItems: [
          {
            title: 'Tous les rendez-vous',
            href: '/appointments',
            icon: Calendar,
          },
          {
            title: 'Liste d’attente',
            href: '/appointments/waitlist',
            icon: Clock,
            roles: ['ADMIN', 'RECEPTIONIST'],
          },
        ],
      },`,
`
      {
        title: 'Salle d’attente',
        href: '/waiting-room',
        icon: Clock,
        roles: ['ADMIN', 'DOCTOR', 'ASSISTANT', 'RECEPTIONIST'],
      },`
)

insertAfter(
`      {
        title: 'Chat IA',
        href: '/chat',
        icon: BotMessageSquare,
      },`,
`
      {
        title: 'Messages',
        href: '/messages',
        icon: MessageSquare,
      },`
)

insertAfter(
`      {
        title: 'Facturation',
        href: '/billing',
        icon: Receipt,
        roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],`,
``
)

// Add reception collections as a sibling after the complete Billing item by locating the Finance section boundary.
if (!text.includes("href: '/reception-charges'")) {
  const financeEnd = `    ],
  },
  {
    title: 'Engagement',`
  const idx = text.indexOf(financeEnd)
  if (idx < 0) throw new Error('Finance section boundary not found')
  const item = `      {
        title: 'Encaissements réception',
        href: '/reception-charges',
        icon: CreditCard,
        roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'DOCTOR'],
      },
`
  text = text.slice(0, idx) + item + text.slice(idx)
}

if (!text.includes("href: '/reports/doctors'")) {
  const audit = `          {
            title: 'Journal d’audit',
            href: '/reports/audit-log',
            icon: Activity,
            roles: ['ADMIN'],
          },`
  const idx = text.indexOf(audit)
  if (idx < 0) throw new Error('Reports audit item not found')
  const block = `          {
            title: 'Statistiques dentistes',
            href: '/reports/doctors',
            icon: TrendingUp,
            roles: ['ADMIN', 'ACCOUNTANT', 'DOCTOR'],
          },
`
  text = text.slice(0, idx) + block + text.slice(idx)
}

if (!text.includes("href: '/settings/permissions'")) {
  const setup = `          {
            title: 'Guide de configuration',
            href: '/settings/setup-guide',
            icon: BookOpen,
          },`
  const idx = text.indexOf(setup)
  if (idx < 0) throw new Error('Settings setup item not found')
  const at = idx + setup.length
  const block = `
          {
            title: 'Rôles et permissions',
            href: '/settings/permissions',
            icon: Shield,
            roles: ['ADMIN'],
          },`
  text = text.slice(0, at) + block + text.slice(at)
}

fs.writeFileSync(file, text)
console.log('Morocco navigation modules applied.')
