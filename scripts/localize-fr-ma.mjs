import fs from 'node:fs'
import path from 'node:path'

const roots = ['app', 'components']
const phrases = new Map([
  ['Dashboard', 'Tableau de bord'],
  ['Appointments', 'Rendez-vous'],
  ['All Appointments', 'Tous les rendez-vous'],
  ['Upcoming Appointments', 'Prochains rendez-vous'],
  ['View All Appointments', 'Voir tous les rendez-vous'],
  ["Today's Appointments", 'Rendez-vous du jour'],
  ['Treatments', 'Traitements'],
  ['Prescriptions', 'Ordonnances'],
  ['Billing', 'Facturation'],
  ['Invoices', 'Factures'],
  ['Payments', 'Paiements'],
  ['Pending Payments', 'Paiements en attente'],
  ['Payment Plans', 'Plans de paiement'],
  ['Reports', 'Rapports'],
  ['Settings', 'Paramètres'],
  ['Staff', 'Personnel'],
  ['Inventory', 'Stock'],
  ['Lab Orders', 'Commandes laboratoire'],
  ['Add Patient', 'Ajouter un patient'],
  ['New Patient', 'Nouveau patient'],
  ['New Appointment', 'Nouveau rendez-vous'],
  ['Total Patients', 'Total patients'],
  ['New Patients', 'Nouveaux patients'],
  ['This Month Revenue', 'Chiffre d’affaires du mois'],
  ['Revenue Overview', 'Aperçu du chiffre d’affaires'],
  ['Monthly Revenue Trend', 'Évolution mensuelle du chiffre d’affaires'],
  ['Top Procedures', 'Actes les plus fréquents'],
  ['Appointments by Status', 'Rendez-vous par statut'],
  ['Loading...', 'Chargement...'],
  ['Loading your practice data...', 'Chargement des données du cabinet...'],
  ['No revenue data available', 'Aucune donnée de chiffre d’affaires disponible'],
  ['No upcoming appointments', 'Aucun rendez-vous à venir'],
  ['No appointment data available', 'Aucune donnée de rendez-vous disponible'],
  ['Failed to load dashboard data', 'Impossible de charger les données du tableau de bord'],
  ['An error occurred', 'Une erreur est survenue'],
  ['Retry', 'Réessayer'],
  ['Outstanding receivables', 'Créances à recevoir'],
  ['Next 5 scheduled appointments', '5 prochains rendez-vous planifiés'],
  ["This month's appointment distribution", 'Répartition des rendez-vous ce mois-ci'],
  ['Last 7 days revenue trend', 'Évolution du chiffre d’affaires sur 7 jours'],
  ['Last 6 months revenue comparison', 'Comparaison du chiffre d’affaires sur 6 mois'],
  ['Most common procedures this month', 'Actes les plus réalisés ce mois-ci'],
  ["Here's what's happening at your dental practice today.", 'Voici l’activité de votre cabinet dentaire aujourd’hui.'],
  ['Phone', 'Téléphone'],
  ['Address', 'Adresse'],
  ['City', 'Ville'],
  ['Pincode', 'Code postal'],
  ['Postal Code', 'Code postal'],
  ['First Name', 'Prénom'],
  ['Last Name', 'Nom'],
  ['Date of Birth', 'Date de naissance'],
  ['Gender', 'Sexe'],
  ['Status', 'Statut'],
  ['Amount', 'Montant'],
  ['Discount', 'Remise'],
  ['Subtotal', 'Sous-total'],
  ['Search', 'Rechercher'],
  ['Save', 'Enregistrer'],
  ['Cancel', 'Annuler'],
  ['Delete', 'Supprimer'],
  ['Edit', 'Modifier'],
  ['Back', 'Retour'],
  ['Print', 'Imprimer'],
  ['Confirm', 'Confirmer'],
  ['Waitlist', 'Liste d’attente'],
])

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.isFile() && full.endsWith('.tsx') ? [full] : []
  })
}

function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceLiteral(text, from, to) {
  const pattern = esc(from)
  text = text.replace(new RegExp(`'${pattern.replaceAll("'", "\\'")}'`, 'g'), `'${to.replaceAll("'", "\\'")}'`)
  text = text.replace(new RegExp(`"${pattern.replaceAll('"', '\\"')}"`, 'g'), `"${to.replaceAll('"', '\\"')}"`)
  text = text.replace(new RegExp(`>${pattern}<`, 'g'), `>${to}<`)
  return text
}

let filesChanged = 0
for (const root of roots) {
  for (const file of walk(root)) {
    let text = fs.readFileSync(file, 'utf8')
    const original = text
    for (const [from, to] of phrases) text = replaceLiteral(text, from, to)

    text = text.replaceAll("new Intl.NumberFormat('en-IN'", "new Intl.NumberFormat('fr-MA'")
    text = text.replaceAll('new Intl.NumberFormat("en-IN"', 'new Intl.NumberFormat("fr-MA"')
    text = text.replaceAll("currency: 'INR'", "currency: 'MAD'")
    text = text.replaceAll('currency: "INR"', 'currency: "MAD"')

    if (text !== original) {
      fs.writeFileSync(file, text)
      filesChanged++
    }
  }
}
console.log(`French Morocco safe localization: ${filesChanged} UI files changed.`)
