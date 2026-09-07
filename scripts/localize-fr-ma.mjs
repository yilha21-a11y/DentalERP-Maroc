import fs from 'node:fs'
import path from 'node:path'

const roots = ['app', 'components']
const replacements = new Map([
  ['Dashboard', 'Tableau de bord'],
  ['Patients', 'Patients'],
  ['Appointments', 'Rendez-vous'],
  ['All Appointments', 'Tous les rendez-vous'],
  ['Upcoming Appointments', 'Prochains rendez-vous'],
  ['View All Appointments', 'Voir tous les rendez-vous'],
  ['Today\'s Appointments', 'Rendez-vous du jour'],
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
  ['Communications', 'Communications'],
  ['Search', 'Rechercher'],
  ['Save', 'Enregistrer'],
  ['Cancel', 'Annuler'],
  ['Delete', 'Supprimer'],
  ['Edit', 'Modifier'],
  ['Create', 'Créer'],
  ['Back', 'Retour'],
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
  ['No data available', 'Aucune donnée disponible'],
  ['No revenue data available', 'Aucune donnée de chiffre d’affaires disponible'],
  ['No upcoming appointments', 'Aucun rendez-vous à venir'],
  ['No appointment data available', 'Aucune donnée de rendez-vous disponible'],
  ['Failed to load dashboard data', 'Impossible de charger les données du tableau de bord'],
  ['Retry', 'Réessayer'],
  ['Revenue', 'Chiffre d’affaires'],
  ['completed', 'terminés'],
  ['pending', 'en attente'],
  ['from last month', 'par rapport au mois dernier'],
  ['Outstanding receivables', 'Créances à recevoir'],
  ['Next 5 scheduled appointments', '5 prochains rendez-vous planifiés'],
  ['This month\'s appointment distribution', 'Répartition des rendez-vous ce mois-ci'],
  ['Last 7 days revenue trend', 'Évolution du chiffre d’affaires sur 7 jours'],
  ['Last 6 months revenue comparison', 'Comparaison du chiffre d’affaires sur 6 mois'],
  ['Most common procedures this month', 'Actes les plus réalisés ce mois-ci'],
  ['Patient', 'Patient'],
  ['Doctor', 'Dentiste'],
  ['Receptionist', 'Réception'],
  ['Accountant', 'Comptable'],
  ['Lab Tech', 'Laboratoire'],
  ['Phone', 'Téléphone'],
  ['Address', 'Adresse'],
  ['City', 'Ville'],
  ['State', 'Région'],
  ['Pincode', 'Code postal'],
  ['Postal Code', 'Code postal'],
  ['First Name', 'Prénom'],
  ['Last Name', 'Nom'],
  ['Date of Birth', 'Date de naissance'],
  ['Gender', 'Sexe'],
  ['Email', 'E-mail'],
  ['Status', 'Statut'],
  ['Amount', 'Montant'],
  ['Discount', 'Remise'],
  ['Total', 'Total'],
  ['Subtotal', 'Sous-total'],
  ['Notes', 'Notes'],
  ['Description', 'Description'],
  ['Date', 'Date'],
  ['Time', 'Heure'],
  ['Actions', 'Actions'],
  ['View', 'Voir'],
  ['Export', 'Exporter'],
  ['Print', 'Imprimer'],
  ['Confirm', 'Confirmer'],
  ['Completed', 'Terminé'],
  ['Cancelled', 'Annulé'],
  ['Scheduled', 'Planifié'],
  ['Confirmed', 'Confirmé'],
  ['In Progress', 'En cours'],
  ['No Show', 'Absent'],
  ['Waitlist', 'Liste d’attente'],
  ['Language & Formatting', 'Langue et format'],
  ['Language', 'Langue'],
  ['Preview', 'Aperçu'],
])

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.isFile() && full.endsWith('.tsx') ? [full] : []
  })
}

let filesChanged = 0
let replacementsMade = 0
for (const root of roots) {
  for (const file of walk(root)) {
    let text = fs.readFileSync(file, 'utf8')
    const original = text
    for (const [from, to] of replacements) {
      const count = text.split(from).length - 1
      if (count) {
        text = text.split(from).join(to)
        replacementsMade += count
      }
    }
    text = text.replaceAll("'en-IN'", "'fr-MA'").replaceAll('"en-IN"', '"fr-MA"')
    text = text.replaceAll("currency: 'INR'", "currency: 'MAD'").replaceAll('currency: "INR"', 'currency: "MAD"')
    if (text !== original) {
      fs.writeFileSync(file, text)
      filesChanged++
    }
  }
}
console.log(`French Morocco localization: ${filesChanged} files changed, ${replacementsMade} text replacements.`)
