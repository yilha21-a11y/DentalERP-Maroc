# DentalERP Maroc — Version de test v1.0.0-rc1

Cette branche est une version candidate destinée aux tests avant installation réelle en cabinet.

## Version

- Nom : DentalERP Maroc
- Version : v1.0.0-rc1
- Branche : `test-v1.0.0-rc1`
- Interface : français Maroc (`fr-MA`)
- Devise : MAD
- Base de données : MySQL
- Android : non inclus pour le moment

## Fonctions à tester

- Connexion et gestion des utilisateurs
- Rôles : Admin, Dentiste, Assistant, Réception, Comptable, Stock/Labo
- Patients
- Rendez-vous
- Traitements
- Salle d'attente et écran TV
- Encaissement réception
- Paiements partiels et remises
- Statistiques dentistes
- Messagerie interne
- WhatsApp (si les identifiants Meta sont configurés)

## Installation de test

```bash
git clone -b test-v1.0.0-rc1 https://github.com/yilha21-a11y/DentalERP-Maroc.git
cd DentalERP-Maroc
cp .env.example .env
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

Avant `prisma migrate deploy`, renseigner une vraie base MySQL dans `DATABASE_URL`.

## Mise à jour depuis cette version

```bash
git pull origin test-v1.0.0-rc1
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
```

## Important

Cette version est destinée aux tests. Ne pas l'utiliser avec de vraies données patients sans sauvegarde, configuration de sécurité et validation complète de l'installation.
