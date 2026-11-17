# Démonstration TMS/DMS sans service e-mail

Pour tester une demande de déblocage avec lien simulé, acceptation ou refus et notification, suivre le [guide des demandes de déblocage](DEMANDES_DEBLOCAGE.md). Ce parcours réutilise la boîte Démo et **Comptes et accès**, sans e-mail réel ni déblocage automatique.

## Démarrer

Depuis le dossier du projet :

```powershell
npm.cmd run demo
```

Ouvrir <http://127.0.0.1:3020>. Aucun compte Gmail, SMTP, fichier `.env` ou clé d’initialisation n’est nécessaire pour cette démonstration.

La bande supérieure indique **Simulation — Aucun e-mail réel envoyé**. Elle donne accès à **Boîte de réception — Démo** et **Réinitialiser la démo**, depuis toutes les pages, y compris avant connexion.

Le serveur écoute uniquement sur la machine locale. La base dédiée est `.data/demo/demo.sqlite`, avec son propre marqueur SQLite. Les bases `.data/sales-live.sqlite`, `.data/tenant-test.sqlite`, leurs comptes et leurs données ne sont pas utilisés par ce mode.

## 1. Créer le super administrateur

1. Au premier lancement, le formulaire **Créer le compte administrateur** apparaît.
2. Utiliser une adresse fictive, par exemple `admin@demo.test`.
3. Choisir un mot de passe de démonstration d’au moins 10 caractères et le confirmer.
4. Cliquer sur **Créer le compte**.
5. Ouvrir **Boîte de réception — Démo**.
6. Sélectionner **Vérification de votre adresse e-mail**, puis **Ouvrir le lien simulé**.
7. Cliquer sur **Vérifier mon adresse**.
8. Revenir à la plateforme et se connecter avec l’e-mail et le mot de passe choisis.

Avant vérification, la connexion reste refusée. Il n’existe qu’un seul super administrateur par scénario. Tous les comptes, historiques compris, se connectent exclusivement avec leur adresse e-mail vérifiée et leur mot de passe. Les codes internes `admin` et `electroplanet` ne sont jamais acceptés comme identifiants de connexion.

## 2. Inviter l’administrateur d’une entreprise

1. Dans l’administration, ouvrir **Entreprises → Créer une entreprise**.
2. Saisir uniquement le nom et un autre e-mail fictif, par exemple `entreprise@demo.test`. L’identifiant technique est généré par le serveur : `Electroplanet` devient `electroplanet`, puis `electroplanet-2` si ce code est déjà pris.
3. Créer l’entreprise.
4. Ouvrir **Boîte de réception — Démo** et sélectionner l’invitation destinée à cette adresse.
5. Cliquer sur **Ouvrir le lien simulé**.
6. Définir et confirmer le mot de passe de l’entreprise, puis **Activer mon accès**.
7. Revenir à la connexion et utiliser l’e-mail de l’entreprise et son mot de passe.

La possession du lien simulé confirme l’adresse et permet l’activation. Le super administrateur ne choisit pas ce mot de passe. Un e-mail est obligatoire et unique pour chaque compte. Deux entreprises peuvent porter le même nom, mais possèdent des identifiants techniques et des adresses de compte distincts. Renommer une entreprise ne change jamais son identifiant ni ses relations. Aucun formulaire public ne crée librement une entreprise. L’entreprise accède uniquement à ses données TMS/DMS. Son nouvel espace démarre vide ; les fonctions métier existantes restent disponibles.

Une entreprise désactivée ne peut pas se connecter. Avec son e-mail vérifié et son mot de passe correct, elle reçoit : « Votre espace entreprise est temporairement désactivé. Veuillez contacter l'administrateur de la plateforme. » Avec un mot de passe incorrect, une adresse inconnue ou un ancien identifiant technique, seul le message « Adresse e-mail ou mot de passe incorrect. » apparaît. Aucune session n’est créée pour une entreprise désactivée ; ses anciennes sessions et ses accès API sont révoqués. Après réactivation, une nouvelle connexion est nécessaire.

Les anciennes bases de démo sont adaptées automatiquement pour autoriser les noms identiques, sans renuméroter les entreprises ni supprimer leurs données. La migration copie les données dans une transaction et contrôle les clés étrangères. Les bases habituelles sont protégées : leur migration exige une sauvegarde et une autorisation explicite avec `TMS_ALLOW_COMPANY_NAME_MIGRATION=true`. Cette variable ne doit pas être activée pour la démonstration.

## 3. Récupérer un mot de passe, pour chaque rôle

1. Se déconnecter.
2. Cliquer sur **Mot de passe oublié ?**.
3. Saisir l’e-mail du compte et **Envoyer le lien de récupération**.
4. Ouvrir la boîte de démonstration et choisir le message de récupération correspondant.
5. Ouvrir le lien, définir et confirmer un nouveau mot de passe.
6. Revenir à la connexion et utiliser le nouveau mot de passe.

L’ancien mot de passe et les anciennes sessions ne fonctionnent plus après la réinitialisation. Le même parcours s’applique au super administrateur et à l’entreprise. Une adresse inconnue ou un compte non vérifié ne produit pas de message, tout en conservant la même réponse publique. Une entreprise désactivée ne peut pas récupérer son accès.

## 4. Montrer les règles des liens

- Un lien est valable **15 minutes** et **une seule fois**.
- Après utilisation, la boîte affiche **Lien utilisé ou remplacé** et ne propose plus son ouverture.
- Pour présenter un cas d’expiration sans attendre, choisir un message valide et cliquer sur **Faire expirer ce lien**. La vérification ou la récupération avec ce lien sera refusée.
- Après expiration, demander un nouveau message. Les demandes répétées d’un même type pour le même compte sont espacées d’une minute.

La boîte permet de sélectionner le destinataire et le type de message. Les états se mettent à jour automatiquement tant que le panneau est ouvert, toutes les 5 secondes et après les opérations. Le bouton Actualiser est retiré ; la sélection du message reste conservée.

## 5. Recommencer depuis zéro

1. Cliquer sur **Réinitialiser la démo**.
2. Lire les conséquences : suppression des comptes, entreprises, données métier et messages créés dans cette seule démonstration.
3. Saisir exactement `REINITIALISER LA DEMO`.
4. Cliquer sur **Confirmer la réinitialisation**.

Le formulaire initial revient. Les sessions, anciens liens et messages de démo sont invalidés. Les autres bases restent conservées. Les limites de tentatives sont également réinitialisées pour recommencer le scénario.

Un simple redémarrage du serveur conserve les comptes et données SQLite de démonstration. Les messages et leurs liens simulés restent uniquement en mémoire et disparaissent au redémarrage ; renvoyer le message depuis le parcours correspondant, ou recommencer avec le bouton de remise à zéro.

## 6. Gérer la sécurité des comptes

Depuis **Comptes et accès → Gérer l’accès**, le super administrateur peut **Bloquer le compte** ou **Débloquer le compte**, avec confirmation. Le blocage révoque automatiquement ses sessions et refuse ses accès API, sans arrêter les synchronisations automatiques de son entreprise. Le tableau conserve une recherche simple ; la vérification de l’e-mail reste dans la fiche détaillée, sans filtres ni bouton de révocation séparé. Ces actions ne changent pas le statut de l’entreprise. Une entreprise désactivée reste inaccessible même si son compte est actif ; sa réactivation ne lève pas un blocage du compte.

Depuis la fiche entreprise, **Désactiver l’entreprise** refuse les accès à son espace et arrête ses synchronisations, y compris les imports en cours. **Réactiver l’entreprise** permet leur reprise si configurée, mais conserve un éventuel blocage du compte. Débloquer le compte d’une entreprise désactivée ne réactive pas celle-ci. Les anciens jetons de session restent invalides après ces opérations.

Un compte bloqué peut demander un nouveau lien de récupération avec son e-mail déjà vérifié si son entreprise est active. Le message apparaît dans la boîte de réception simulée. Après réinitialisation, le compte reste bloqué : seul le super administrateur peut le débloquer. Les liens expirent en 15 minutes et ne servent qu’une fois. Une entreprise désactivée reste exclue de la récupération.

La connexion est limitée à 20 tentatives par minute et par IP, succès compris, et à 10 échecs par minute pour la même adresse canonique, toutes IP confondues. Une connexion réussie à un autre compte n’efface aucun échec. En cas de HTTP 429, attendre le délai indiqué par `Retry-After`. La remise à zéro explicite de la démo efface également ces compteurs.

La fiche montre les blocages réels, la dernière connexion lorsqu’elle a été enregistrée et les 20 derniers événements du compte, sans mélanger la gestion d’entreprise. Le champ Type de compte reste retiré de **Gérer l’accès** ; les boutons **Actualiser** sont désormais retirés de toutes les pages d’administration. Les informations et l’historique se mettent à jour après les opérations, depuis les autres sessions et au retour dans la fenêtre. Les formulaires conservent les saisies locales. **Mon compte** mène aux paramètres du super administrateur. Le changement d’e-mail réutilise la fiche entreprise : l’ancienne adresse vérifiée reste utilisable jusqu’à confirmation de la nouvelle dans la boîte simulée. Voir le [guide Comptes et accès](COMPTES_ACCES.md) et le [mécanisme partagé](ACTUALISATION_AUTOMATIQUE.md).

## Limites et séparation des modes

- La boîte de démonstration est volontairement partagée pour présenter tous les scénarios. Utiliser uniquement des identités, mots de passe et données fictifs.
- Aucune connexion SMTP n’est créée dans ce mode, même si des variables SMTP existent sur la machine.
- Les liens de démonstration sont gardés en mémoire. Le mécanisme d’authentification conserve uniquement leurs empreintes dans SQLite.
- Le mode est refusé avec `NODE_ENV=production`, sur une base sans le marqueur attendu ou par un accès via proxy.
- Hors du mode démo, la boîte et la remise à zéro ne sont pas exposées par le backend ; le bandeau n’apparaît pas. Aucun lien de récupération réel n’est fourni par ces interfaces.
- Les serveurs habituels restent distincts : `npm.cmd run dev` (3000) et `npm.cmd run dev:test` (3010). Ils ne sont pas nécessaires pour la soutenance de cette maquette.

## Vérifications techniques

- `npm.cmd run lint` : TypeScript.
- `npm.cmd test` : scénarios de démo et régressions, sur des bases temporaires.
- `npm.cmd run build` : compilation.
- Les tests de démo interdisent la création de tout transport SMTP, contrôlent l’expiration, l’usage unique, l’isolation des entreprises, le refus des routes hors démo, l’effacement limité et la conservation de bases témoins.

Principaux fichiers : `server/demo.ts`, `server/sales/demoDatabase.ts`, `server/sales/demoMailbox.ts`, `server/sales/api.ts`, `server/sales/companies.ts`, `src/components/DemoFrame.tsx`, `src/context/DemoContext.tsx`, `tests/demoAuth.test.ts`, `tests/emailOnlyAuth.test.ts`.
