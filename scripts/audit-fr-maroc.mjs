import fs from 'node:fs'
import path from 'node:path'

const roots = ['app', 'components']
const explicitFiles = ['public/manifest.json', 'prisma/seed.ts']

const forbidden = [
  { re: /\bIndia\b|\bIndian\b/gi, label: 'référence Inde' },
  { re: /₹/g, label: 'symbole roupie' },
  { re: /\bUPI\b/g, label: 'UPI' },
  { re: /\bRazorpay\b/gi, label: 'Razorpay' },
  { re: /\bPhonePe\b/gi, label: 'PhonePe' },
  { re: /\bPaytm\b/gi, label: 'Paytm' },
  { re: /\bGST\b/g, label: 'GST' },
  { re: /Reports & Analytics Dashboard/g, label: 'titre Rapports anglais' },
  { re: /Natural Language Report Builder/g, label: 'générateur de rapports anglais' },
  { re: /Create your clinic/g, label: 'inscription anglaise' },
  { re: /Sign In/g, label: 'connexion anglaise' },
]

const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json'])
const ignored = new Set([
  'components/i18n/french-ui-fallback.tsx',
])

function collect(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collect(full, out)
    else if (extensions.has(path.extname(entry.name))) out.push(full)
  }
  return out
}

const files = [...roots.flatMap((root) => collect(root)), ...explicitFiles]
const violations = []

for (const file of files) {
  const normalized = file.replaceAll('\\', '/')
  if (ignored.has(normalized) || !fs.existsSync(file)) continue
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const rule of forbidden) {
      rule.re.lastIndex = 0
      if (rule.re.test(line)) {
        violations.push(`${normalized}:${index + 1} — ${rule.label}: ${line.trim().slice(0, 180)}`)
      }
    }
  })
}

if (violations.length) {
  console.error('Audit fr-MA/Maroc échoué:')
  for (const v of violations) console.error(' - ' + v)
  process.exit(1)
}

console.log(`Audit fr-MA/Maroc OK — ${files.length} fichiers contrôlés.`)
