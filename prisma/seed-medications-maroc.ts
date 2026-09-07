import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const medications = [
  {
    name: 'Amoxicilline 500 mg',
    genericName: 'Amoxicilline',
    category: 'Antibiotique',
    form: 'Comprimé / gélule',
    defaultDosage: '500 mg',
  },
  {
    name: 'AMOXIL 500 mg',
    genericName: 'Amoxicilline',
    category: 'Antibiotique',
    form: 'Comprimé dispersible',
    defaultDosage: '500 mg',
  },
  {
    name: 'Amoxicilline / Acide clavulanique 1 g / 125 mg',
    genericName: 'Amoxicilline + Acide clavulanique',
    category: 'Antibiotique',
    form: 'Sachet / comprimé selon spécialité',
    defaultDosage: '1 g / 125 mg',
  },
  {
    name: 'AUGMENTIN 1 g / 125 mg',
    genericName: 'Amoxicilline + Acide clavulanique',
    category: 'Antibiotique',
    form: 'Sachet',
    defaultDosage: '1 g / 125 mg',
  },
  {
    name: 'Métronidazole 500 mg',
    genericName: 'Métronidazole',
    category: 'Antibiotique / Nitro-imidazolé',
    form: 'Comprimé',
    defaultDosage: '500 mg',
  },
  {
    name: 'BI-RODOGYL 1,5 MUI / 250 mg',
    genericName: 'Spiramycine + Métronidazole',
    category: 'Antibiotique',
    form: 'Comprimé',
    defaultDosage: '1,5 MUI / 250 mg',
  },
  {
    name: 'SPIRAZOLE 0,75 MUI / 125 mg',
    genericName: 'Spiramycine + Métronidazole',
    category: 'Antibiotique',
    form: 'Comprimé pelliculé',
    defaultDosage: '0,75 MUI / 125 mg',
  },
  {
    name: 'Clindamycine 300 mg',
    genericName: 'Clindamycine',
    category: 'Antibiotique',
    form: 'Gélule',
    defaultDosage: '300 mg',
  },
  {
    name: 'Paracétamol 500 mg',
    genericName: 'Paracétamol',
    category: 'Antalgique / Antipyrétique',
    form: 'Comprimé',
    defaultDosage: '500 mg',
  },
  {
    name: 'DOLIPRANE 500 mg',
    genericName: 'Paracétamol',
    category: 'Antalgique / Antipyrétique',
    form: 'Comprimé effervescent',
    defaultDosage: '500 mg',
  },
  {
    name: 'EFFERALGAN 500 mg',
    genericName: 'Paracétamol',
    category: 'Antalgique / Antipyrétique',
    form: 'Comprimé effervescent',
    defaultDosage: '500 mg',
  },
  {
    name: 'Ibuprofène 400 mg',
    genericName: 'Ibuprofène',
    category: 'Anti-inflammatoire / Antalgique',
    form: 'Comprimé',
    defaultDosage: '400 mg',
  },
  {
    name: 'Chlorhexidine 0,12 %',
    genericName: 'Chlorhexidine',
    category: 'Antiseptique buccal',
    form: 'Bain de bouche',
    defaultDosage: '0,12 %',
  },
  {
    name: 'ELUDRIL',
    genericName: 'Chlorhexidine + Chlorobutanol',
    category: 'Antiseptique buccal',
    form: 'Solution pour bain de bouche',
    defaultDosage: 'Selon présentation',
  },
  {
    name: 'GINGIVAX 0,12 %',
    genericName: 'Digluconate de chlorhexidine',
    category: 'Hygiène / Antiseptique buccal',
    form: 'Bain de bouche',
    defaultDosage: '0,12 %',
  },
  {
    name: 'HEXIDYL',
    genericName: 'Hexétidine',
    category: 'Antiseptique buccal',
    form: 'Bain de bouche',
    defaultDosage: 'Selon présentation',
  },
]

async function main() {
  const hospital = await prisma.hospital.findUnique({
    where: { slug: 'cabinet-dentaire-maroc' },
  })

  if (!hospital) {
    throw new Error('Cabinet Maroc introuvable. Exécutez d’abord: npx prisma db seed')
  }

  let created = 0
  let existing = 0

  for (const med of medications) {
    const found = await prisma.medication.findFirst({
      where: { hospitalId: hospital.id, name: med.name },
    })

    if (found) {
      existing++
      continue
    }

    await prisma.medication.create({
      data: {
        ...med,
        defaultFrequency: 'À définir par le praticien',
        defaultDuration: 'À définir par le praticien',
        hospitalId: hospital.id,
      },
    })
    created++
  }

  console.log(`Catalogue médicaments Maroc: ${created} ajoutés, ${existing} déjà présents.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
