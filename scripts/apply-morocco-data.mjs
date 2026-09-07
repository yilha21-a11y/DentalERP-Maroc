import fs from 'node:fs'

function replaceExact(file, from, to) {
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes(from)) {
    console.log(`Skip ${file}: pattern not found`)
    return false
  }
  text = text.replace(from, to)
  fs.writeFileSync(file, text)
  return true
}

// Schema defaults and Morocco-specific role.
replaceExact(
  'prisma/schema.prisma',
  `  locale              String    @default("en-IN")\n  country             String    @default("IN")\n  currency            String    @default("INR")\n  timezone            String    @default("Asia/Kolkata")`,
  `  locale              String    @default("fr-MA")\n  country             String    @default("MA")\n  currency            String    @default("MAD")\n  timezone            String    @default("Africa/Casablanca")`
)
replaceExact(
  'prisma/schema.prisma',
  `enum Role {\n  ADMIN\n  DOCTOR\n  RECEPTIONIST\n  LAB_TECH\n  ACCOUNTANT\n}`,
  `enum Role {\n  ADMIN\n  DOCTOR\n  ASSISTANT\n  RECEPTIONIST\n  LAB_TECH\n  ACCOUNTANT\n}`
)
replaceExact(
  'prisma/schema.prisma',
  `  state           String?    @default("Tamil Nadu")`,
  `  state           String?`
)
replaceExact(
  'prisma/schema.prisma',
  `  currency          String                    @default("INR")`,
  `  currency          String                    @default("MAD")`
)

// Demo clinic becomes a Moroccan clinic.
const seed = 'prisma/seed.ts'
let text = fs.readFileSync(seed, 'utf8')
const swaps = [
  ["name: 'Demo Dental Clinic'", "name: 'Cabinet Dentaire Démo Maroc'"],
  ["slug: 'demo-dental-clinic'", "slug: 'cabinet-dentaire-maroc'"],
  ["email: 'info@demo-dental.com'", "email: 'contact@cabinet-dentaire.ma'"],
  ["phone: '044-12345678'", "phone: '+212522000000'"],
  ["address: '123, Anna Nagar Main Road, Ayanavaram'", "address: '123 Boulevard Zerktouni'"],
  ["city: 'Chennai'", "city: 'Casablanca'"],
  ["state: 'Tamil Nadu'", "state: 'Casablanca-Settat'"],
  ["pincode: '600023'", "pincode: '20000'"],
  ["tagline: 'Your Smile, Our Priority'", "tagline: 'Votre sourire, notre priorité'"],
  ["gstNumber: '33AAACX1234X1ZX'", "gstNumber: null"],
  ["registrationNo: 'TN-MED-2020-12345'", "registrationNo: 'MA-DENT-2026-001'"],
  ["upiId: 'clinic@upi'", "upiId: null"],
  ["phone: '9876543210'", "phone: '+212661000001'"],
  ["phone: '9876543211'", "phone: '+212661000002'"],
  ["phone: '9876543212'", "phone: '+212661000003'"],
  ["name: 'Dr. Priya'", "name: 'Dr. Sara Amrani'"],
  ["firstName: 'Dr. Priya'", "firstName: 'Sara'"],
  ["lastName: 'Kumar'", "lastName: 'Amrani'"],
  ["name: 'Lakshmi S'", "name: 'Nadia Alaoui'"],
  ["firstName: 'Lakshmi'", "firstName: 'Nadia'"],
  ["lastName: 'S'", "lastName: 'Alaoui'"],
  ["specialization: 'General Dentistry'", "specialization: 'Dentisterie générale'"],
  ["specialization: 'Orthodontics'", "specialization: 'Orthodontie'"],
  ["licenseNumber: 'MCI123456'", "licenseNumber: 'CNOMD-MA-001'"],
  ["licenseNumber: 'MCI789012'", "licenseNumber: 'CNOMD-MA-002'"],
]
for (const [from, to] of swaps) text = text.replaceAll(from, to)

// Replace sample patient phone prefix while retaining deterministic seed values.
text = text.replace(/phone: '98765433(\d\d)'/g, (_m, n) => `phone: '+2126620000${n}'`)
fs.writeFileSync(seed, text)

console.log('Morocco schema and seed customization applied.')
