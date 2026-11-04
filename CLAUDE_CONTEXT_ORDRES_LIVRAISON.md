# Contexte projet pour Claude - Page Ordres de livraison

## Objectif

J'ai une maquette TMS/DMS de livraison en React. Je veux améliorer la page **Ordres de livraison** avec une logique plus logistique, mais sans refaire toute la page et sans copier visuellement Freterium.

Claude doit m'aider à proposer ou faire des modifications très ciblées, en respectant le code existant.

## Important

- Claude n'a pas accès automatiquement à mon code.
- Il faut analyser les fichiers que je fournis avant de proposer une modification.
- Ne pas modifier toute la structure de l'application.
- Ne pas changer l'identité visuelle actuelle.
- Ne pas transformer la page en copie de Freterium.
- Garder la page **Ordres de livraison**.
- Faire des changements propres, simples, explicables à mon encadrant.

## Stack technique

- React
- TypeScript
- Vite
- Tailwind CSS
- Données mockées côté frontend
- Pas de backend réel

## Fichiers les plus importants à joindre à Claude

Joindre au minimum ces fichiers :

1. `src/components/backoffice/OrdersScreen.tsx`
2. `src/components/backoffice/ToursScreen.tsx`
3. `src/context/TmsContext.tsx`
4. `src/data/tmsMockData.ts`
5. `src/types.ts`
6. `src/index.css`
7. `src/components/common/BackofficeUI.tsx`
8. `src/components/common/StatusBadge.tsx`

Fichiers utiles si la demande concerne les cartes ou le suivi :

1. `src/components/maps/GoogleMapCard.tsx`
2. `src/components/backoffice/ControlTowerScreen.tsx`
3. `src/components/backoffice/ValidationScreen.tsx`
4. `src/components/backoffice/TrackingScreen.tsx`

## Identité visuelle actuelle

L'application utilise une interface backoffice sobre :

- Bleu principal : `#0057A8`
- Fond général : `#F5F7FA`
- Panels blancs avec bordure `#E2E8F0`
- Texte principal : `#1F2937`
- Texte secondaire : `#64748B`
- Border radius modéré : 6px à 8px
- Style dense, professionnel, adapté à un outil d'exploitation transport

Classes UI importantes à respecter :

- `bo-page`
- `bo-panel`
- `bo-input`
- `bo-button-primary`
- `bo-button-secondary`
- `bo-table`
- `scrollbar-soft`

## Architecture fonctionnelle

Le state global est géré dans `src/context/TmsContext.tsx`.

Les données principales :

- `deliveries`
- `tours`
- `drivers`
- `vehicles`
- `incidents`
- `addresses`
- `zones`

Les actions importantes :

- `confirmDeliveryOrder(deliveryId)`
- `createTour(payload)`
- `dispatchTour(tourId, driverId, vehicleId)`
- `confirmDeliveryPOD(deliveryId, proofData)`
- `validateDelivery(deliveryId)`
- `rejectDelivery(deliveryId, reason, comment)`
- `setPlanningSelectionIds(ids)`
- `setBackofficeTab(tab)`

## Statuts métier importants

Statuts de livraison :

- `À confirmer`
- `À planifier`
- `Planifiée`
- `Affectée`
- `En route`
- `Arrivé`
- `Livraison en cours`
- `À valider`
- `Validée`
- `Échec`
- `Rejetée`
- `Retournée`

Statuts de tournée :

- `Brouillon`
- `Planifiée`
- `Affectée`
- `En cours`
- `À clôturer`
- `Terminée`
- `Annulée`

## Flux métier actuel

1. Les BL non affectés apparaissent dans **Ordres de livraison**.
2. Ils sont généralement au statut `À confirmer`.
3. L'utilisateur sélectionne plusieurs BL avec des cases à cocher.
4. Il peut cliquer sur **Optimiser** pour simuler un tri logique par zone et créneau.
5. Il peut cliquer sur **Valider tous** pour passer les BL de `À confirmer` à `À planifier`.
6. Il peut cliquer sur **Créer une tournée (X)**.
7. Les IDs sélectionnés sont stockés dans `planningSelectionIds`.
8. L'application ouvre la page de création de tournée avec `setBackofficeTab('tour-create')`.
9. Dans `ToursScreen.tsx`, les BL sélectionnés sont proposés dans la création de tournée si la date et la zone correspondent.
10. Après création, les BL deviennent `Affectée` avec tournée, chauffeur, véhicule et séquence.
11. Côté chauffeur, le livreur fait le parcours e-POD.
12. Après e-POD, la livraison passe à `À valider`.
13. Le backoffice valide la preuve dans **Validation e-POD**.
14. La livraison devient `Validée`.

## État actuel de la page Ordres de livraison

La page `OrdersScreen.tsx` affiche seulement les BL disponibles :

```ts
!delivery.tourId && !delivery.driverId
```

Le numéro `CMD-xxxxx` est affiché en `BL-xxxxx`.

Colonnes actuelles du tableau :

- Case à cocher
- N° BL
- Client
- Entrepôt
- Zone / Quartier
- Créneau
- Nb colis
- Poids
- Véhicule requis
- Actions

La colonne `Volume` a été supprimée volontairement.

Les colonnes `Téléphone` et `Adresse` ne doivent pas revenir dans le tableau principal. Elles restent dans le bouton **Détails**.

Le bouton par ligne doit rester **Détails** seulement.

## Entrepôts actuels

La page contient actuellement des entrepôts locaux :

### Casablanca Hub Ouest

- Code : `DEP-CAS-O`
- Adresse : `Zone logistique Lissasfa, route d'El Jadida`
- Capacité : `1 600 palettes`
- Zones : Maarif, Maarif Extension, Ain Diab, Hay Hassani, Bourgogne, CIL, Oasis

### Casablanca Hub Centre

- Code : `DEP-CAS-C`
- Adresse : `Roches Noires, Casablanca`
- Capacité : `1 200 palettes`
- Zones : Centre Ville, Ghandi, Racine, Sidi Belyout, Belvédère, Derb Sultan, Roches Noires

### Casablanca Hub Est

- Code : `DEP-CAS-E`
- Adresse : `Zone industrielle Ain Sebaa, Casablanca`
- Capacité : `2 000 palettes`
- Zones : Ain Sebaa, Sidi Moumen

### Casablanca Hub Sud

- Code : `DEP-CAS-S`
- Adresse : `Parc industriel Bouskoura`
- Capacité : `900 palettes`
- Zones : Bouskoura

## Ce que je veux éviter

- Ne pas refaire toute la page.
- Ne pas changer le titre en `Planification & optimisation` sauf si je le demande explicitement.
- Ne pas ajouter trop de filtres.
- Ne pas ajouter un tableau trop large.
- Ne pas remettre `Volume`.
- Ne pas remettre `Téléphone` et `Adresse` dans le tableau principal.
- Ne pas supprimer le bouton `Détails`.
- Ne pas casser le flux vers la création de tournée.
- Ne pas modifier les autres pages sans nécessité.

## Ce que Claude doit faire avant chaque modification

1. Lire les fichiers fournis.
2. Expliquer ce qu'il a compris.
3. Proposer une modification courte et précise.
4. Attendre ma confirmation si je dis que je veux seulement discuter.
5. Si je demande explicitement de modifier, donner un patch ciblé.
6. Après modification, vérifier TypeScript avec :

```bash
npm run lint
```

ou :

```bash
npx tsc --noEmit
```

## Prompt à envoyer à Claude

Tu es un assistant développeur senior. Je vais te fournir le code d'une maquette React/TypeScript d'un TMS/DMS de livraison.

Analyse d'abord les fichiers fournis, surtout :

- `OrdersScreen.tsx`
- `ToursScreen.tsx`
- `TmsContext.tsx`
- `tmsMockData.ts`
- `types.ts`
- `index.css`
- `BackofficeUI.tsx`
- `StatusBadge.tsx`

Je veux améliorer la page **Ordres de livraison**, mais sans changer toute l'application.

Contraintes :

- Garde la page **Ordres de livraison**.
- Ne refais pas le design complet.
- Conserve l'identité visuelle actuelle : bleu `#0057A8`, panels blancs, bordures claires, style backoffice sobre.
- Ne copie pas visuellement Freterium.
- Inspire-toi seulement de la logique métier logistique.
- Ne remets pas les colonnes `Téléphone`, `Adresse`, ni `Volume` dans le tableau principal.
- Les détails complets doivent rester dans le bouton `Détails`.
- Garde le flux : sélection de BL → optimiser → valider → créer une tournée.
- Évite le scroll horizontal inutile.
- Propose des modifications petites, propres et faciles à expliquer.

État actuel :

- La page affiche les BL non affectés.
- Les BL sont affichés sous la forme `BL-xxxxx`.
- Le tableau contient : checkbox, N° BL, Client, Entrepôt, Zone / Quartier, Créneau, Nb colis, Poids, Véhicule requis, Actions.
- Il existe un bouton `Créer une tournée (X)`.
- Il existe un bouton `Optimiser`.
- Il existe un bouton `Valider tous`.
- Il existe un filtre `Entrepôt`.
- Le flux utilise `planningSelectionIds` pour passer les BL sélectionnés vers la création de tournée.

Ta mission :

1. Analyse le code fourni.
2. Dis-moi si la logique actuelle est cohérente.
3. Propose les améliorations prioritaires pour rendre la page plus professionnelle côté TMS.
4. Ne propose pas une refonte complète.
5. Si je te demande de modifier, donne-moi un patch précis fichier par fichier.

Réponds en français simple.
