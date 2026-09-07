import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'DentalERP Maroc - Gestion de cabinet dentaire',
    template: '%s | DentalERP Maroc',
  },
  description:
    'Logiciel de gestion de cabinet dentaire adapté au Maroc : dossiers patients, rendez-vous, facturation en MAD, stock, laboratoire, salle d’attente et communication patient.',
  keywords: [
    'logiciel dentaire Maroc',
    'gestion cabinet dentaire',
    'ERP dentaire Maroc',
    'dossier patient dentaire',
    'rendez-vous dentiste',
    'facturation cabinet dentaire MAD',
    'gestion stock dentaire',
    'gestion laboratoire dentaire',
    'salle d’attente dentaire',
  ],
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'fr_MA',
    title: 'DentalERP Maroc - Gestion de cabinet dentaire',
    description:
      'Solution de gestion pour cabinets dentaires au Maroc : patients, rendez-vous, facturation en MAD, stock, laboratoire et salle d’attente.',
    siteName: 'DentalERP Maroc',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DentalERP Maroc - Gestion de cabinet dentaire',
    description:
      'Solution de gestion pour cabinets dentaires au Maroc.',
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DentalERP Maroc',
  },
}

export const viewport: Viewport = {
  themeColor: '#0891B2',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-MA" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
