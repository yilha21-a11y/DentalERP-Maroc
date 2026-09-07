'use client'

import { useEffect } from 'react'

const TEXT_MAP: Record<string, string> = {
  'Search patients, appointments...': 'Rechercher patients, rendez-vous...',
  'Reports & Analytics Dashboard': 'Tableau de bord des rapports et analyses',
  'Comprehensive analytics and insights for your dental practice': 'Analyses complètes et indicateurs pour votre cabinet dentaire',
  'Today': "Aujourd’hui",
  'Yesterday': 'Hier',
  'This Week': 'Cette semaine',
  'Last Week': 'Semaine dernière',
  'This Month': 'Ce mois-ci',
  'Last Month': 'Mois dernier',
  'This Quarter': 'Ce trimestre',
  'Last Quarter': 'Trimestre dernier',
  'This Year': 'Cette année',
  'Last Year': 'Année dernière',
  'Custom Range': 'Période personnalisée',
  'Select period': 'Choisir une période',
  'Export': 'Exporter',
  'Export as PDF': 'Exporter en PDF',
  'Export as Excel': 'Exporter en Excel',
  'Patient Analytics': 'Analyse patients',
  'Clinical Analytics': 'Analyse clinique',
  'Financial Analytics': 'Analyse financière',
  'Operational Analytics': 'Analyse opérationnelle',
  'Returning Patients': 'Patients fidèles',
  'Retention Rate': 'Taux de fidélisation',
  'Patients with repeat visits': 'Patients ayant effectué plusieurs visites',
  'Gender Distribution': 'Répartition par sexe',
  'Patient demographics breakdown': 'Répartition démographique des patients',
  'Male': 'Homme',
  'Female': 'Femme',
  'Other': 'Autre',
  'Acquisition Sources': "Sources d’acquisition",
  'How patients found your practice': 'Comment les patients ont connu votre cabinet',
  'No acquisition data available': "Aucune donnée d’acquisition disponible",
  'Unknown': 'Inconnu',
  'Age Distribution': 'Répartition par âge',
  'Patients by age group': 'Patients par tranche d’âge',
  'Patients': 'Patients',
  'No age data available': "Aucune donnée d’âge disponible",
  'Total Treatments': 'Total des traitements',
  'Completed': 'Terminés',
  'In Progress': 'En cours',
  'Avg. Duration': 'Durée moyenne',
  'minutes per treatment': 'minutes par traitement',
  'Most Common Procedures': 'Actes les plus fréquents',
  'Top procedures by frequency': 'Actes les plus réalisés',
  'No procedure data available': 'Aucune donnée sur les actes disponible',
  'Procedures by Category': 'Actes par catégorie',
  'Treatment distribution by type': 'Répartition des traitements par type',
  'No category data available': 'Aucune donnée par catégorie disponible',
  'Total Revenue': "Chiffre d’affaires total",
  'Total Expenses': 'Dépenses totales',
  'Profit Margin': 'Marge bénéficiaire',
  'Net margin': 'Marge nette',
  'Avg. Bill Value': 'Facture moyenne',
  'Collection Efficiency': "Taux d’encaissement",
  'Payment Method Breakdown': 'Répartition par moyen de paiement',
  'Revenue by payment method': "Chiffre d’affaires par moyen de paiement",
  'No payment data available': 'Aucune donnée de paiement disponible',
  'Revenue Trends': "Évolution du chiffre d’affaires",
  'Monthly revenue, expenses, and profit': 'Chiffre d’affaires, dépenses et bénéfice mensuels',
  'Revenue': "Chiffre d’affaires",
  'Expenses': 'Dépenses',
  'Profit': 'Bénéfice',
  'Total Appointments': 'Total des rendez-vous',
  'No-Show Rate': 'Taux d’absences',
  'Avg. Wait Time': "Temps d’attente moyen",
  'minutes': 'minutes',
  'Staff Productivity': 'Productivité du personnel',
  'Performance metrics by staff member': 'Indicateurs de performance par membre du personnel',
  'Inventory Turnover': 'Rotation du stock',
  'How quickly inventory is being used': 'Vitesse d’utilisation du stock',
  'Average turnover rate per period': 'Taux moyen de rotation par période',
  'Low Stock Alert': 'Alerte stock faible',
  'Items requiring reorder': 'Articles à recommander',
  'Items below reorder level': 'Articles sous le seuil de réapprovisionnement',
  'Natural Language Report Builder': 'Générateur de rapports en langage naturel',
  'Ask questions in plain English — AI queries your data and returns results.': 'Posez une question simplement — l’IA interroge vos données et retourne les résultats.',
  'Generate': 'Générer',
  'Monthly revenue by procedure for last 3 months': "Chiffre d’affaires mensuel par acte sur les 3 derniers mois",
  "Patients who haven't visited in 6 months": "Patients sans visite depuis 6 mois",
  'Overdue invoices sorted by amount': 'Factures en retard triées par montant',
  'Appointment no-show rate by day of week': "Taux d’absence aux rendez-vous par jour de la semaine",
  'Top 5 most performed procedures this quarter': 'Top 5 des actes les plus réalisés ce trimestre',
  'Inventory items running low on stock': 'Articles avec stock faible',
  'of total': 'du total',
  'completion rate': 'taux de réalisation',
  'success': 'réussite',
  'utilization': 'utilisation',
  'appointments': 'rendez-vous',
}

const PLACEHOLDER_MAP: Record<string, string> = {
  "e.g. 'Show revenue by procedure for last month'": "ex. « Afficher le chiffre d’affaires par acte le mois dernier »",
  'From': 'Du',
  'To': 'Au',
}

function translateNode(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const value = node.textContent?.trim()
    if (!value) continue
    const replacement = TEXT_MAP[value]
    if (replacement && node.textContent !== replacement) {
      node.textContent = node.textContent!.replace(value, replacement)
    }
  }

  root.querySelectorAll?.('input[placeholder], textarea[placeholder]').forEach((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement
    const replacement = PLACEHOLDER_MAP[input.placeholder]
    if (replacement) input.placeholder = replacement
  })
}

export function FrenchUiFallback() {
  useEffect(() => {
    translateNode(document.body)
    const observer = new MutationObserver(() => translateNode(document.body))
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
