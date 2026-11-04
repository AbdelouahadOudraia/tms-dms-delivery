# Prompt pour Astra - Analyse complète du projet TMS/DMS

## Objectif

Je veux que tu analyses mon projet React/TypeScript de maquette TMS/DMS et que tu me dises quelles modifications je dois faire pour avoir un bon projet, propre, cohérent et présentable devant mon encadrant.

Je ne veux pas que tu refasses tout le projet. Je veux une analyse professionnelle avec des recommandations claires, classées par priorité.

## Très important

- Analyse le projet avant de proposer des modifications.
- Ne propose pas une refonte totale.
- Ne change pas l'identité visuelle actuelle.
- Ne copie pas Freterium ou une autre application.
- Inspire-toi seulement des bonnes pratiques métier TMS/DMS.
- Réponds en français simple.
- Explique les choses comme pour un étudiant qui prépare une soutenance ou une validation avec son encadrant.

## Stack technique

Le projet utilise :

- React
- TypeScript
- Vite
- Tailwind CSS
- Données mockées côté frontend
- Pas de backend réel

## Structure générale

Fichiers principaux :

- `src/App.tsx` : structure générale de l'application, choix entre vue backoffice, vue chauffeur et vue côte à côte.
- `src/context/TmsContext.tsx` : state global, données et actions métier.
- `src/types.ts` : types TypeScript.
- `src/data/tmsMockData.ts` : données mockées.
- `src/index.css` : styles globaux et classes UI communes.
- `src/components/backoffice/BackofficeLayout.tsx` : layout backoffice avec sidebar.
- `src/components/common/BackofficeUI.tsx` : composants UI communs.
- `src/components/common/StatusBadge.tsx` : badges de statut.

Pages backoffice :

- `OrdersScreen.tsx` : Ordres de livraison / BL non affectés.
- `ToursScreen.tsx` : gestion et création des tournées.
- `PlanningScreen.tsx` : planning.
- `ControlTowerScreen.tsx` : suivi opérationnel.
- `TrackingScreen.tsx` : suivi des livraisons.
- `ValidationScreen.tsx` : validation e-POD.
- `AnomaliesScreen.tsx` : incidents.
- `FleetScreen.tsx` : chauffeurs et véhicules.
- `AddressesScreen.tsx` : adresses.
- `ZonesScreen.tsx` : zones.
- `ProvidersScreen.tsx` : prestataires.
- `SettingsScreen.tsx` : règles et workflow.

Application chauffeur :

- `src/components/driver/DriverApp.tsx`
- Écrans mobile : login, accueil, tournée, navigation, arrivée, contrôle articles, e-POD, succès, échec, historique, profil.

Cartes :

- `src/components/maps/GoogleMapCard.tsx`
- `src/components/maps/StaticMapCard.tsx`

## Identité visuelle actuelle

L'application est une maquette backoffice logistique sobre :

- Couleur principale : `#0057A8`
- Fond : `#F5F7FA`
- Panels blancs
- Bordures claires : `#E2E8F0`
- Texte principal : `#1F2937`
- Texte secondaire : `#64748B`
- Style dense, professionnel, orienté exploitation transport

Classes UI importantes :

- `bo-page`
- `bo-panel`
- `bo-input`
- `bo-button-primary`
- `bo-button-secondary`
- `bo-table`
- `scrollbar-soft`

## Contexte métier du projet

Le projet représente une solution TMS/DMS pour gérer :

- les ordres de livraison / BL ;
- les tournées ;
- les chauffeurs ;
- les véhicules ;
- les entrepôts ;
- le suivi terrain ;
- la validation e-POD ;
- les incidents ;
- la preuve de livraison avec photo, signature et GPS.

## Flux métier principal

Le flux attendu est :

1. Les BL arrivent dans la page **Ordres de livraison**.
2. Les BL non affectés sont sélectionnés par l'utilisateur.
3. L'utilisateur peut optimiser la sélection.
4. L'utilisateur valide les BL.
5. L'utilisateur crée une tournée.
6. La tournée reçoit un chauffeur et un véhicule.
7. La tournée est envoyée au chauffeur.
8. Le chauffeur réalise les livraisons sur l'application mobile.
9. Le chauffeur collecte la preuve e-POD : photo, signature, commentaire, GPS.
10. Le backoffice valide ou rejette la preuve.
11. La livraison devient validée ou rejetée.

## Statuts utilisés

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

## État actuel de la page Ordres de livraison

La page **Ordres de livraison** doit rester une page dédiée aux BL.

Elle affiche les BL non encore affectés à une tournée ou à un chauffeur.

Elle contient actuellement :

- recherche ;
- filtre entrepôt ;
- filtre zone / quartier ;
- filtre créneau ;
- filtre type de véhicule ;
- sélection multiple par checkbox ;
- bouton `Optimiser` ;
- bouton `Valider tous` ;
- bouton `Créer une tournée (X)` ;
- bouton `Détails` par ligne.

Colonnes actuelles :

- checkbox ;
- N° BL ;
- Client ;
- Entrepôt ;
- Zone / Quartier ;
- Créneau ;
- Nb colis ;
- Poids ;
- Véhicule requis ;
- Actions.

Informations retirées volontairement du tableau principal :

- Téléphone ;
- Adresse ;
- Volume ;
- Statut ;
- Chauffeur.

Ces informations ne doivent pas être remises dans le tableau principal sauf justification forte.

## Entrepôts actuels

Les entrepôts sont actuellement déclarés localement dans `OrdersScreen.tsx`.

Exemples :

- Casablanca Hub Ouest / `DEP-CAS-O`
- Casablanca Hub Centre / `DEP-CAS-C`
- Casablanca Hub Est / `DEP-CAS-E`
- Casablanca Hub Sud / `DEP-CAS-S`

Chaque entrepôt couvre plusieurs zones ou quartiers.

## Ce que je veux que tu analyses

Analyse le projet selon ces axes :

1. Cohérence métier TMS/DMS
2. Cohérence du flux BL → tournée → chauffeur → e-POD → validation
3. Qualité de la page Ordres de livraison
4. Qualité de la page Création de tournée
5. Qualité de la Control Tower
6. Qualité de la validation e-POD
7. Qualité des données mockées
8. Lisibilité de l'interface
9. Risques de confusion pour l'encadrant
10. Améliorations prioritaires à faire avant présentation

## Ce que je veux dans ta réponse

Donne-moi une réponse structurée comme ceci :

### 1. Résumé général du projet

Explique rapidement ce que fait le projet.

### 2. Points forts actuels

Liste les éléments déjà bons.

### 3. Problèmes ou incohérences

Liste les problèmes importants, avec explication simple.

### 4. Modifications prioritaires

Classe les modifications en :

- Priorité 1 : indispensable avant présentation
- Priorité 2 : important mais peut attendre
- Priorité 3 : amélioration bonus

### 5. Recommandations pour la page Ordres de livraison

Dis précisément ce qu'il faut ajouter, supprimer ou garder.

### 6. Recommandations pour le flux de création de tournée

Dis comment rendre le flux plus logique.

### 7. Recommandations pour e-POD

Dis comment rendre la partie preuve de livraison plus crédible.

### 8. Recommandations UI/UX

Propose des améliorations sans changer l'identité visuelle.

### 9. Ce qu'il ne faut surtout pas faire

Liste les pièges à éviter.

### 10. Plan d'action final

Donne-moi une liste courte des modifications à faire dans l'ordre.

## Contraintes de réponse

- Réponds en français facile.
- Sois clair et direct.
- Ne donne pas une réponse trop théorique.
- Donne des recommandations concrètes.
- Ne propose pas une refonte totale.
- Ne propose pas de backend sauf si c'est présenté comme une amélioration future.
- Reste réaliste pour une maquette de PFE/stage.

## Question principale

Après analyse du projet, quelles sont les modifications que je dois faire pour obtenir une maquette TMS/DMS propre, cohérente, professionnelle et facile à défendre devant mon encadrant ?
