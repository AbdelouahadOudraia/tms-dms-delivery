# TMS / DMS Delivery

Maquette React/TypeScript d'une solution de gestion des ordres de livraison, des tournées et des preuves de livraison e-POD.

## Fonctionnalités principales

- consultation et filtrage des bons de livraison non affectés ;
- validation et sélection multiple des BL ;
- simulation d'optimisation par zone et créneau ;
- création d'une tournée avec chauffeur et véhicule disponibles ;
- transmission de la tournée vers l'application chauffeur ;
- parcours terrain : navigation, arrivée, contrôle des articles, livraison ou échec ;
- collecte d'une photo, d'une signature, du réceptionnaire et des coordonnées GPS simulées ;
- validation ou rejet de l'e-POD dans le backoffice ;
- suivi des tournées, incidents et indicateurs de la Control Tower.

## Lancer le projet

Prérequis : Node.js installé.

```bash
npm install
npm run dev
```

L'application est ensuite disponible sur `http://localhost:3000`.

Vérifications avant une démonstration :

```bash
npm run lint
npm test
npm run build
```

## Scénario conseillé pour la soutenance

1. Ouvrir **Ordres de livraison**.
2. Sélectionner des BL de la même date et du même entrepôt.
3. Cliquer sur **Optimiser**, puis **Valider la sélection**.
4. Cliquer sur **Créer une tournée** et choisir les ressources disponibles.
5. Envoyer la tournée au chauffeur.
6. Choisir la session du chauffeur dans l'application mobile.
7. Réaliser un arrêt, contrôler tous les articles et créer l'e-POD.
8. Ouvrir **Livraisons à valider** dans le backoffice.
9. Valider ou rejeter la preuve.
10. Consulter le résultat dans la Control Tower et clôturer la tournée lorsque tous les arrêts sont traités.

## Nature de la maquette

Le projet utilise des données frontend de démonstration. L'optimisation, le GPS, les heures et l'envoi vers le terminal chauffeur sont simulés. Il n'existe pas encore de backend, de moteur d'optimisation routière ou de synchronisation temps réel.

Les cartes de tournée utilisent un aperçu statique afin que les repères restent alignés avec le tracé. Le bouton **Ouvrir dans Google Maps** permet d'ouvrir la zone réelle dans Google Maps.
