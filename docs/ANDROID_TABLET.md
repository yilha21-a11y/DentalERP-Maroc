# DentalERP Maroc — Application Android tablette

## Objectif
Application tablette 10–12 pouces pour dentistes et assistants, connectée au même backend DentalERP.

## Stack recommandée
- Kotlin
- Jetpack Compose
- Retrofit/OkHttp
- DataStore pour le jeton mobile
- Coil pour les images
- Room uniquement pour cache local non sensible

## Authentification
Réutiliser `POST /api/auth/mobile-token`.
Le jeton ne doit jamais être écrit dans les logs. Utiliser HTTPS en cloud ou VPN/LAN sécurisé en serveur local.

## Écrans MVP
1. Connexion
2. Agenda du jour
3. Liste patients du jour
4. Dossier patient
5. Odontogramme tactile
6. Traitement en cours
7. Notes et prescriptions
8. Photos/radios du dossier
9. Bouton `Terminer et envoyer à la réception`
10. Statistiques personnelles
11. Messages internes

## API partagée
- `/api/appointments/today`
- `/api/patients/[id]`
- `/api/dental-chart`
- `/api/treatments`
- `/api/prescriptions`
- `/api/reception-charges`
- `/api/internal-messages`
- `/api/reports/doctors`

## Rôles
### DOCTOR
Agenda, dossiers cliniques, traitements, prescriptions, propres statistiques et messages.

### ASSISTANT
Agenda, préparation patient, stock/labo selon permissions. Pas d’accès financier global.

## UX tablette
- grandes zones tactiles
- mode portrait et paysage
- écran patient en 2 colonnes en paysage
- boutons principaux toujours accessibles
- confirmation avant suppression ou clôture financière

## Hors ligne
Ne pas permettre la modification clinique complète hors ligne dans le MVP. Le cache peut afficher les données déjà consultées, mais l’écriture doit nécessiter une connexion au serveur afin d’éviter des conflits de dossier médical.
