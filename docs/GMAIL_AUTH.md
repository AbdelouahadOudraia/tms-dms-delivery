# Authentification par e-mail et SMTP Gmail

## Fonctionnement

Deux types de comptes uniquement : super administrateur (`admin`, clé interne unique) et entreprise (`company`). Toutes les connexions utilisent exclusivement une adresse e-mail vérifiée, y compris pour les comptes historiques. Les valeurs `admin` et `electroplanet` ne permettent plus de se connecter. L’identifiant d’entreprise reste un code d’espace fixe et ne devient pas une adresse de connexion.

Pour présenter la maquette sans envoyer d’e-mails réels, utiliser uniquement le [mode démonstration](DEMO.md), sur le port 3020. Les procédures SMTP ci-dessous concernent les autres modes.

L’e-mail est obligatoire et doit être vérifié avant tout accès métier. Les domaines professionnels sont acceptés ; Gmail peut être utilisé comme service d’expédition. Une adresse ne peut appartenir qu’à un seul compte. Les alias Gmail avec points, suffixes + et googlemail.com sont dédoublonnés.

Les mots de passe sont hachés avec scrypt. Les liens personnels sont valables 15 minutes, à usage unique, avec empreinte SHA-256 seule en base. La consommation est transactionnelle ; un GET n’active et ne réinitialise rien. Les sessions sont invalidées après changement du mot de passe. Une entreprise désactivée ne peut ni se connecter, ni activer son compte, ni récupérer son mot de passe.

La récupération utilisateur passe exclusivement par un lien envoyé à l’e-mail vérifié. Les codes techniques et les réinitialisations forcées d’un mot de passe entreprise ont été supprimés. Le changement de son propre mot de passe, en connaissant le mot de passe actuel, reste disponible pour l’administrateur connecté.

## 1. Préparer Gmail

1. Choisir le compte Gmail expéditeur, qui peut également être l’adresse du super administrateur.
2. Activer la validation en deux étapes du compte Google.
3. Ouvrir <https://myaccount.google.com/apppasswords> et créer un mot de passe d’application TMS/DMS.
4. Garder ce secret sur la machine ou dans le gestionnaire de secrets du serveur. Ne jamais le communiquer dans un chat ou le mettre dans Git.

Certaines politiques Google peuvent empêcher les mots de passe d’application. Dans ce cas, faire valider un fournisseur SMTP compatible ; OAuth Gmail n’est pas implémenté. Les mots de passe d’application sont révoqués après changement du mot de passe Google.

Sources : [Google : mots de passe d’application](https://support.google.com/accounts/answer/185833?hl=fr), [Google : SMTP et ports](https://developers.google.com/workspace/gmail/imap/imap-smtp).

## 2. Configuration privée du test

Dans le fichier `.env` à la racine du projet, remplacer les valeurs ci-dessous :

```dotenv
TMS_TEST_PUBLIC_URL=http://127.0.0.1:3010
TMS_TEST_SMTP_HOST=smtp.gmail.com
TMS_TEST_SMTP_PORT=587
TMS_TEST_SMTP_SECURE=false
TMS_TEST_SMTP_USER=expediteur@gmail.com
TMS_TEST_SMTP_PASS="MOT_DE_PASSE_APPLICATION_GOOGLE_SANS_ESPACES"
TMS_TEST_SMTP_FROM=expediteur@gmail.com
```

Le port 587 utilise STARTTLS ; 465 exige `SMTP_SECURE=true`. Les certificats restent vérifiés. Ne pas désactiver TLS. L’URL des liens vient de la configuration serveur, jamais de l’en-tête Host reçu.

Le mode test lit exclusivement les paramètres `TMS_TEST_`. Le serveur habituel lit `TMS_`, avec une URL HTTPS en production. Le fichier privé `.env` et les bases `.data` sont ignorés par Git et refusés par le serveur de fichiers Vite.

## 3. Tester la création admin depuis zéro, sans effacer les comptes existants

1. Arrêter uniquement le serveur de test qui occupe le port 3010, avec Ctrl+C dans son terminal.
2. Configurer le SMTP de test comme ci-dessus.
3. Définir une clé privée `TMS_TEST_SETUP_SECRET` de 64 caractères hexadécimaux dans `.env`. Pour la générer directement dans le fichier, une seule fois :

   ```powershell
   node --input-type=module -e "import {randomBytes} from 'node:crypto'; import {appendFileSync} from 'node:fs'; appendFileSync('.env','\nTMS_TEST_SETUP_SECRET='+randomBytes(32).toString('hex')+'\n');"
   ```

   Ne pas dupliquer une variable déjà renseignée. Consulter cette clé uniquement dans le fichier privé pour la saisir dans le formulaire ; elle n’est pas imprimée dans le terminal.

4. Lancer :

   ```powershell
   npm.cmd run dev:auth-test
   ```

5. Le terminal indique le chemin exact de la nouvelle base : `.data/auth-sandboxes/auth-.../.data/tenant-test.sqlite`.
6. Ouvrir <http://127.0.0.1:3010>. Saisir e-mail, clé serveur, mot de passe et confirmation.
7. Ouvrir le message réellement reçu, suivre le lien et confirmer l’adresse sous 15 minutes.
8. Revenir à la connexion et utiliser l’e-mail et le mot de passe choisis.
9. Vérifier que la connexion par le simple mot `admin` ne fonctionne pas pour ce nouveau compte.

Chaque lancement de `dev:auth-test` crée un nouvel espace de test. Les espaces précédents et les bases existantes sont conservés. Le mode production, les liens symboliques vers un autre stockage et le partage de la base habituelle sont refusés. Le port seul ne sélectionne pas la base : utiliser la commande dédiée. La clé normale, pour une première initialisation de l’installation habituelle autorisée, s’appelle `TMS_SETUP_SECRET`.

Après une initialisation aboutie, retirer la clé du serveur utilisé. Une seconde création du super administrateur est refusée. Un lien expiré peut être renvoyé avec la même adresse, la même clé et le même mot de passe, après au moins une minute. L’initialisation exige une connexion locale directe sans proxy ; bloquer également la route publique `/api/sales/setup` dans le proxy du déploiement.

## 4. Migrer les anciens comptes

Pour reprendre la base de test existante, utiliser `npm.cmd run dev:test` : cette commande conserve `.data/tenant-test.sqlite`.

1. Si le compte possède déjà une adresse unique et vérifiée, se connecter directement avec cette adresse et le mot de passe actuel. Aucun changement de mot de passe ni de données métier n’est nécessaire.
2. Un compte sans adresse vérifiée ne peut pas ouvrir de session, même avec son ancien identifiant et le bon mot de passe.
3. Pour une entreprise, le super administrateur vérifié ouvre sa fiche, renseigne ou corrige son e-mail avec confirmation de son propre mot de passe, puis envoie la vérification. Le destinataire vérifie l’adresse avant de se connecter.
4. Pour un ancien super administrateur sans e-mail utilisable, un exploitant autorisé doit suivre la procédure de maintenance contrôlée de la section 7, après sauvegarde et contrôle d’identité. Aucun formulaire public ne peut associer librement une adresse à ce compte.
5. Conserver les clés internes des comptes et les liens avec les entreprises. Ne pas inventer une adresse ni marquer une adresse comme vérifiée manuellement pour contourner le blocage.

La restriction est appliquée côté serveur, à la création et au contrôle des sessions. La perte de vérification invalide une session existante. Aucun accès par ancien identifiant n’est maintenu comme exception de migration ; le champ historique `email_login` ne détermine plus le mode de connexion. Cette évolution ne nécessite aucune nouvelle modification du schéma SQLite.

La migration ajoute des colonnes, tables et index, sans supprimer les comptes, espaces ni données métier. Les adresses historiques ambiguës restent conservées mais doivent être corrigées. Les anciens codes de récupération sont invalidés ; leur table historique n’est plus un mécanisme utilisable.

Pour une ancienne base de l’environnement habituel, un verrou serveur refuse désormais la migration automatique : une sauvegarde récupérable et une autorisation explicite sont nécessaires avant de définir temporairement `TMS_ALLOW_AUTH_MIGRATION=true`. Ne pas activer cette variable pour les essais ; `dev:auth-test` utilise son propre stockage. Le garde-fou lit le schéma avant d’ouvrir les services susceptibles de modifier la base. Une base déjà migrée n’est pas remise à son ancien schéma par ce verrou.

## 5. Inviter une entreprise

1. Se connecter avec le super administrateur vérifié.
2. Ouvrir **Entreprises → Créer une entreprise**.
3. Renseigner uniquement le nom et l’e-mail obligatoire de l’administrateur. Le serveur génère un identifiant technique unique à partir du nom, sans saisie manuelle. Cet identifiant reste stable après renommage ; les noms identiques sont autorisés et les e-mails de compte restent uniques.
4. Envoyer l’invitation. Le destinataire ouvre le lien, saisit deux fois son mot de passe et active son accès. La vérification de l’adresse et l’activation sont effectuées dans la même transaction.
5. Se connecter avec l’e-mail de l’entreprise et son mot de passe. Seul son espace est accessible.

Le super administrateur ne définit plus de mot de passe entreprise. Un échec SMTP est affiché et ne produit pas de confirmation d’invitation envoyée. L’entreprise créée reste bloquée en attente ; après correction, renvoyer l’invitation depuis **Adresse e-mail et activation** sur sa fiche.

Pour une entreprise historique qui possède déjà des données mais aucun compte, ouvrir sa fiche puis **Adresse e-mail et activation → Créer l’accès et inviter**. Le super administrateur confirme son propre mot de passe. Le compte est créé en attente de vérification, et les données de l’espace restent conservées.

Pour modifier l’adresse d’une entreprise, le super administrateur doit confirmer son propre mot de passe. Une adresse déjà vérifiée reste utilisable tant que la nouvelle adresse n’est pas confirmée. La nouvelle adresse est réservée, sans permettre de connexion prématurée. Sa confirmation applique le changement et invalide les anciens liens et sessions. La modification de son propre e-mail suit le même principe. Le blocage du compte empêche l’activation et la vérification d’une nouvelle adresse, mais permet la récupération du mot de passe avec l’adresse actuelle déjà vérifiée si l’entreprise est active. Cette récupération ne débloque jamais le compte. Une entreprise désactivée reste exclue de la récupération. Voir [Comptes et accès](COMPTES_ACCES.md).

## 6. Récupération unique

1. Depuis la connexion commune, cliquer sur **Mot de passe oublié ?**.
2. Saisir l’e-mail vérifié et cliquer sur **Envoyer le lien de récupération**.
3. Ouvrir le message réellement reçu, puis le lien.
4. Définir et confirmer un nouveau mot de passe.
5. Revenir à la connexion et utiliser l’e-mail et le nouveau mot de passe.

Le message public est identique pour une adresse inconnue, un compte non vérifié, désactivé ou une demande trop récente. Il ne confirme pas qu’un message a été livré. Une absence globale de configuration SMTP est signalée explicitement. Les refus propres à un destinataire ne sont pas divulgués publiquement ; le serveur journalise seulement un diagnostic générique sans secret.

Les demandes sont limitées par IP ; les émissions d’un même type pour un compte sont espacées d’une minute. Les anciens liens sont invalidés à la réinitialisation. Les liens refusés par SMTP sont rendus inutilisables. Le serveur n’enregistre ni les mots de passe en clair, ni les jetons bruts. Les sessions restent limitées à huit heures et prennent fin au redémarrage du serveur.

## 7. Secours exceptionnel hors du parcours utilisateur

Cette procédure ne sert pas à remplacer la récupération ordinaire. Pour une panne SMTP, restaurer d’abord le service. Pour une perte de boîte mail, utiliser d’abord la récupération du fournisseur de messagerie.

Si la boîte est définitivement perdue :

1. Ouvrir un dossier de sécurité ; contrôler l’identité du responsable et la propriété de l’entreprise hors du canal compromis.
2. Faire consigner un double accord par les responsables habilités. Préparer une sauvegarde récupérable.
3. Arrêter le serveur de l’environnement concerné. Ouvrir une session système autorisée et un terminal privé, sur le serveur.
4. Autoriser temporairement `TMS_TEST_ALLOW_EMAIL_REBIND=true` pour un espace de test. La valeur par défaut est false.
5. Sur la base de test existante, lancer `npm.cmd run auth:email-maintenance:test`. Répondre aux confirmations, saisir l’identifiant interne, la nouvelle adresse contrôlée et la référence du dossier approuvé, sans données personnelles.
6. Le service révoque toutes les sessions et les liens du compte, enregistre l’acteur système, la référence du dossier et l’heure, puis envoie une vérification à la nouvelle adresse.
7. Le propriétaire doit vérifier cette adresse. Il utilise ensuite **Mot de passe oublié ?** pour choisir son mot de passe.
8. Retirer immédiatement l’autorisation de maintenance et redémarrer le serveur. Clôturer le dossier et conserver la preuve des accords selon la politique de sécurité.

Le mot de passe n’est jamais modifié par la maintenance. Aucun jeton n’est affiché. La maintenance refuse un terminal redirigé, une entreprise désactivée, un environnement non autorisé, une base absente ou un SMTP indisponible. Aucun endpoint HTTP n’expose cette fonction. L’autorisation documentaire et l’identité ne sont pas validables automatiquement : elles restent une responsabilité réelle de l’exploitant habilité.

L’outil habituel `auth:email-maintenance` cible une autre base. Il exige `TMS_ALLOW_EMAIL_REBIND=true` et une autorisation explicite de l’exploitation. Ne pas l’utiliser pour un test ; aucune commande de maintenance ne doit être lancée sur des données réelles sans cette autorisation. Le bac à sable créé avec `dev:auth-test` est destiné au test initial ; la maintenance de test standard cible uniquement la base de test existante à la racine.

## 8. Vérifications et état de livraison

- `npm.cmd run lint` : contrôle TypeScript.
- `npm.cmd test` : bases temporaires uniquement, transport SMTP réellement utilisé vers un récepteur de boucle locale ; aucun message envoyé sur Internet.
- `npm.cmd run build` : compilation de production, sans démarrer l’API de production.
- Les contrôles de non-régression couvrent la migration contrôlée d’un compte sans e-mail, le refus des anciens identifiants et des e-mails non vérifiés, ainsi que l’isolation entre entreprises. La vérification des parcours Chrome se fait dans une base de démo temporaire ; elle ne constitue pas une validation de réception Gmail réelle.
- La réception Gmail réelle n’est pas considérée comme validée avant configuration d’un compte expéditeur autorisé, réception effective et clic de vérification. Un message accepté par SMTP ne garantit pas son classement en boîte principale.
- Ne pas activer un débogage SMTP ou des journaux HTTP contenant des corps, des liens personnels ou l’en-tête Authorization.

## Fichiers concernés

| Partie | Fichiers |
| --- | --- |
| Comptes, migration, sessions | `server/sales/companies.ts`, `server/sales/companyEmail.ts`, `server/sales/authMigration.ts`, `server/sales/adminOverview.ts` |
| Routes et transport SMTP | `server/sales/api.ts`, `server/sales/mail.ts` |
| Connexion et vérification | `src/components/PlatformLogin.tsx`, `PlatformSetup.tsx`, `EmailEnrollment.tsx`, `CompanyEmailLink.tsx` |
| Administration | `src/components/admin/AdminForms.tsx`, `AdminPages.tsx`, `AdminArea.tsx` |
| Intégration | `src/context/CompanySpace.tsx`, `src/context/companyApi.ts` |
| Test depuis zéro et secours | `server/authSandbox.ts`, `server/emailMaintenance.ts`, `package.json` |
| Tests | `tests/passwordRecovery.test.ts`, `gmailAuth.test.ts`, `adminSetup.test.ts`, `companyEmail.test.ts`, `support/legacyAccounts.ts` et tests de régression associés |
| Suppression | Ancien `server/recovery.ts` et commandes `auth:recovery*` retirés |
