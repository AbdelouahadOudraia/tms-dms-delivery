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

## Présenter la maquette sans Gmail ni SMTP

```powershell
npm.cmd run demo
```

Ouvrir <http://127.0.0.1:3020>. Ce mode utilise uniquement `.data/demo/demo.sqlite`. Le bandeau **Simulation — Aucun e-mail réel envoyé** donne accès à la boîte de réception simulée et à une remise à zéro limitée à cette démonstration. Les bases existantes sont conservées. Aucun SMTP ni clé serveur n’est nécessaire.

[Guide de démonstration pas à pas](docs/DEMO.md) : créer l’admin, vérifier l’adresse, inviter une entreprise, récupérer les deux mots de passe et recommencer depuis zéro. Utiliser des e-mails fictifs comme `admin@demo.test` et `entreprise@demo.test`.

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

## Entreprises de test locales

Sous Windows, lancer `npm.cmd run dev:test` et ouvrir <http://127.0.0.1:3010>. Au premier lancement, configurer SMTP et l’initialisation par e-mail de l’admin, comme indiqué dans le [guide e-mail](docs/GMAIL_AUTH.md). Les accès déjà créés restent utilisables. Cette commande utilise la base dédiée `.data/tenant-test.sqlite`. Les entreprises et les connexions commerciales du serveur habituel restent dans leur propre environnement.

Dans **Entreprises**, créer une entreprise fictive et utiliser son e-mail vérifié et son mot de passe pour tester son espace. Revenir avec l’e-mail du super administrateur, ouvrir la fiche de l’entreprise, puis **Gestion de l’entreprise → Désactiver l’entreprise**. Après confirmation, cliquer sur **Supprimer définitivement**, saisir le nom exact (accents, espaces et majuscules compris), puis **Confirmer la suppression**. Une nouvelle entreprise peut reprendre le même identifiant d’espace. Le journal de test conserve l’identifiant de l’espace supprimé, l’auteur et la date.

## Synchronisation des dossiers de vente

`npm run dev` démarre aussi l'API `/api/sales` et son traitement automatique. Le service continue à fonctionner quand la page est fermée, tant que le processus Node reste actif. La page interroge seulement son état pour l'afficher.

### Comptes, invitations et récupération par e-mail

La page **Comptes et accès** gère le blocage et le déblocage indépendants des comptes, la révocation des sessions et l’historique de sécurité. Bloquer un compte coupe ses accès ; désactiver une entreprise arrête aussi ses synchronisations. Le changement d’e-mail conserve l’adresse vérifiée actuelle jusqu’à confirmation de la nouvelle. [Guide des opérations et des fichiers concernés](docs/COMPTES_ACCES.md).

Deux rôles uniquement : super administrateur et compte entreprise. Tous les comptes se connectent exclusivement avec une adresse e-mail unique et vérifiée et leur mot de passe. Les anciens identifiants `admin` et `electroplanet` sont refusés, y compris pour les comptes historiques. Les nouveaux comptes exigent un e-mail. Gmail est compatible comme expéditeur SMTP ; les adresses professionnelles sont également acceptées.

**Configuration et procédures : [guide complet](docs/GMAIL_AUTH.md).** Les secrets restent dans l’environnement serveur ou le fichier privé `.env`, ignoré par Git. Aucun envoi réussi n’est simulé sans SMTP.

Pour tester une création admin depuis zéro sans supprimer les comptes existants, configurer le SMTP `TMS_TEST_` et la clé `TMS_TEST_SETUP_SECRET`, arrêter le serveur de test qui occupe 3010, puis lancer `npm.cmd run dev:auth-test`. Chaque lancement crée une nouvelle base `.data/auth-sandboxes/auth-.../.data/tenant-test.sqlite`. Le terminal indique son chemin. Les bases existantes et les anciens bacs à sable sont conservés.

`npm.cmd run dev:test` reprend la base de test existante `.data/tenant-test.sqlite`. Les clés internes historiques et les données restent conservées. Un compte sans adresse vérifiée ne peut pas se connecter. L’administrateur vérifié peut associer et faire vérifier l’adresse d’une entreprise ; pour un ancien administrateur sans e-mail, utiliser la procédure de maintenance contrôlée du guide. Aucun accès par ancien identifiant n’est conservé pour cette migration.

Une nouvelle entreprise est créée par le super administrateur avec son nom et son e-mail. Le backend génère son identifiant technique unique : `electroplanet`, `electroplanet-2`, etc. Les noms identiques sont autorisés ; les identifiants existants et les liens métier restent conservés, même après renommage. La migration des anciennes bases habituelles exige une sauvegarde et une autorisation explicite `TMS_ALLOW_COMPANY_NAME_MIGRATION=true` ; les essais utilisent uniquement le mode démo. L’invitation permet au destinataire de choisir son mot de passe. La récupération des deux types de comptes se fait exclusivement avec **Mot de passe oublié ? → Envoyer le lien de récupération**. Les liens expirent après 15 minutes, s’utilisent une seule fois et ne sont stockés que sous forme d’empreinte. Les codes de secours et les réinitialisations forcées d’un mot de passe entreprise ont été retirés.

Une intervention exceptionnelle, hors HTTP et désactivée par défaut, peut transférer une adresse perdue après identité contrôlée, double accord consigné, sauvegarde et autorisation de l’exploitant. Elle ne change aucun mot de passe et impose une nouvelle vérification par e-mail. Voir le guide avant toute utilisation. La réception réelle dans Gmail reste à valider après configuration du compte expéditeur.

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
