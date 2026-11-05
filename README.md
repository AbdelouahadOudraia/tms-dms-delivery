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

Prérequis : Node.js 24 (stockage SQLite intégré).

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

Le projet utilise des données de démonstration. L'optimisation, le GPS, les heures et l'envoi vers le terminal chauffeur sont simulés. Un service local gère désormais la synchronisation des dossiers de vente et la génération persistante des BL. Le connecteur de dossiers de vente se configure séparément.

Les cartes de tournée utilisent un aperçu statique afin que les repères restent alignés avec le tracé. Le bouton **Ouvrir dans Google Maps** permet d'ouvrir la zone réelle dans Google Maps.

## Synchronisation des dossiers de vente

`npm run dev` démarre aussi l'API `/api/sales` et son traitement automatique. Le service continue à fonctionner quand la page est fermée, tant que le processus Node reste actif. La page interroge seulement son état pour l'afficher.

Au premier lancement sur localhost, créer le mot de passe du compte `admin`. Sa connexion ouvre le tableau de bord de l’administration. Dans **Entreprises**, créer un espace avec son nom, son identifiant de connexion et son mot de passe initial. Ouvrir la fiche d’une entreprise pour la renommer ou accéder à son espace TMS/DMS. Pour un espace historique sans accès, choisir **Définir le mot de passe** sur sa fiche. Chaque compte entreprise accède directement à son propre espace.

**Mot de passe oublié.** La récupération utilise l’accès autorisé au serveur local. Après vérification de l’identité du demandeur, le responsable ouvre un terminal privé, sans enregistrement, dans le dossier de l’installation qui sert la plateforme. Pour le compte administrateur, il exécute `npm run auth:recovery -- admin`. Pour une entreprise, il remplace `admin` par son identifiant exact. Cette commande exige un terminal interactif et le droit d’écrire dans la base de l’installation. Protéger ce dossier avec les permissions du système d’exploitation.

Le responsable remet le code par un canal privé. Sur **Mot de passe oublié ?**, saisir l’identifiant, le code et le nouveau mot de passe (10 à 200 caractères), puis se reconnecter. Le code expire après 15 minutes. Un nouveau code remplace le précédent. Seule son empreinte est conservée. Le changement de mot de passe invalide les sessions du compte. Après vérification de l’identité du demandeur, un administrateur connecté peut aussi choisir **Réinitialiser** dans **Comptes et accès** pour renouveler le mot de passe de l’entreprise concernée.

Dans **Dossiers de vente → Connexion API** :

1. L’administrateur ouvre l’espace de l’entreprise, choisit Seller ou API standard, saisit l’URL complète, puis clique sur **Autoriser cette source**. Répéter pour proposer plusieurs sources. **Autoriser et enregistrer** permet aussi d’activer directement la source.
2. Avec son propre compte, l’entreprise choisit une **Source commerciale autorisée**, configure les statuts à importer et le mode manuel ou automatique, puis clique sur **Enregistrer**.
3. **Tester la connexion** vérifie la réponse sans importer. **Synchroniser maintenant** importe les dossiers éligibles. Seller utilise la recherche paginée `/seller/searchDossierVente` puis le service voisin `vente?search=id`. Seules les lignes à livrer sont proposées. Les poids manquants sont complétés lors de la préparation du BL.
4. Dans **Sources autorisées**, l’administrateur peut retirer une autorisation. Retirer la source active arrête la synchronisation automatique et bloque les nouveaux appels. Les dossiers et BL restent consultables. Après un premier import, changer de connecteur ou d’URL nécessite une migration. Réautoriser la même source permet de reprendre la synchronisation.

Seuls les nouveaux dossiers autorisés, à livrer et avec des quantités restantes sont proposés. Les dossiers déjà connus reçoivent aussi leurs modifications et annulations. Un changement après génération d'un BL demande une vérification, sans réécrire le BL. Les quantités déjà réservées sont contrôlées dans une transaction SQLite pour éviter une seconde génération.

Les configurations, dossiers, BL générés, curseurs de synchronisation et historiques sont stockés dans `.data/sales-live.sqlite`, ignoré par Git. Les erreurs déclenchent des tentatives espacées progressivement. Le serveur enregistre aussi les livraisons, tournées, ressources et incidents par entreprise. Une écriture concurrente obsolète est refusée. Les espaces créés démarrent vides. Le catalogue géographique de référence reste celui de la maquette.

Pour une autre entreprise, le connecteur `standard` lit l’URL configurée en GET. Le service doit renvoyer une liste JSON de dossiers ou `{ dossiers: [...], cursor: string | null }`. Un curseur reçu est transmis au prochain appel dans le paramètre `cursor`. Les champs de vente et les lignes suivent `SalesDossier` et `SalesLine` dans `src/types/sales.ts`. Le serveur attribue l’identité de la source. Les anciens essais restent dans la base séparée `.data/sales-sync.sqlite`. Une fois des dossiers importés, changer de source nécessite une migration des références.

Le serveur vérifie la session, l’entreprise et le couple exact connecteur–URL. Les nouvelles sources utilisent HTTPS. À chaque connexion publique, le serveur vérifie les IP utilisées par la connexion TLS et refuse les redirections. L’administrateur doit vérifier que l’API et, pour Seller, le service de détail associé fournissent uniquement les données de l’entreprise concernée.

Les jetons restent côté serveur. Dans `TMS_COMPANY_API_CREDENTIALS`, chaque clé est l’identifiant de l’entreprise et chaque entrée contient `connectorId` (seller ou standard), `url` et éventuellement `token`. Pour une API privée de confiance, l’exploitant doit ajouter explicitement `allowPrivateNetwork: true` à l’entrée correspondant exactement à cette entreprise, ce connecteur et cette URL. L’autorisation dans l’espace reste nécessaire. Les anciennes entrées sans `connectorId`, les variables `TMS_SALES_API_*` de l’espace d’origine et les sources déjà configurées par l’administrateur sont prises en charge. Une source historique conserve son accès réseau antérieur pour le couple précis connecteur–URL jusqu’au retrait de son autorisation. La liste des sources est conservée dans l’état commercial SQLite existant.

Les mots de passe sont hachés. Les sessions expirent après huit heures et au redémarrage du serveur. Le lancement fourni écoute sur localhost.

Pour servir la version compilée avec l'API locale :

```bash
npm run build
npm run server
```

Adresse par défaut : `http://127.0.0.1:3001` (`PORT` permet de changer le port). `npm run preview` seul ne démarre pas l'API.

Utiliser un seul serveur de synchronisation par espace : choisir le serveur de développement ou le serveur compilé. La maquette ne coordonne pas plusieurs workers distribués.
