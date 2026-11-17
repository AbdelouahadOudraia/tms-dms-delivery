# Demandes de déblocage des comptes entreprise

## Tester le parcours en Démo

1. Démarrer avec `npm.cmd run demo`, puis ouvrir http://127.0.0.1:3020. Redémarrer un serveur déjà ouvert pour charger les changements, sans réinitialiser ses données.
2. Avec le compte administrateur global, ouvrir **Comptes et accès → Gérer l’accès**, puis bloquer un compte entreprise de démonstration déjà activé.
3. Depuis un autre navigateur ou après déconnexion, tenter la connexion avec l’e-mail vérifié et le mot de passe correct de ce compte.
4. Le message de blocage reste affiché. Cliquer sur **Demander le déblocage de mon compte**.
5. Ouvrir **Boîte de réception — Démo**, puis le message **Confirmez votre demande de déblocage** destiné à cette adresse.
6. Ouvrir le lien simulé et cliquer sur **Confirmer ma demande**. Le compte reste bloqué et la demande devient **En attente**.
7. Le message confirme alors : **Votre demande de déblocage a été transmise à l’administrateur de la plateforme.**
8. Dans l’administration, ouvrir **Comptes et accès**. Le compteur et la section **Demandes de déblocage** présentent le compte, l’entreprise, l’adresse, la date et le statut.
9. Vérifier l’identité, choisir **Accepter** ou **Refuser**, puis confirmer dans la fenêtre. **Annuler** ne change rien.
10. Consulter la notification dans la boîte Démo. Après acceptation, se reconnecter au compte ; après refus, son accès reste bloqué. Les anciennes sessions restent invalides.

L’envoi du lien ne constitue pas encore une demande transmise. Seule sa confirmation enregistre la demande. En mode réel, les mêmes étapes utilisent les véritables e-mails, sans boîte de réception Démo.

Une acceptation débloque uniquement le compte : une entreprise désactivée reste désactivée et inaccessible. Les synchronisations commerciales ne sont pas modifiées par ces décisions. Le déblocage manuel existant dans **Gérer l’accès** traite également comme acceptée une éventuelle demande en attente, dans la même transaction.

## Protections

- Vérification combinée du mot de passe et de la possession de l’adresse déjà vérifiée ; aucun choix libre de destinataire. Les mauvais identifiants ne révèlent ni l’existence ni le statut du compte.
- Liens aléatoires de 32 octets, stockés uniquement par empreinte SHA-256, valables **15 minutes** et consommés une seule fois.
- Une preuve est liée au compte, à son adresse, à sa version de session et à la révision de son blocage. Un changement de mot de passe, une révocation ou un changement d’adresse invalide le lien.
- Une seule demande en attente par compte, garantie par un index SQLite. Une répétition renvoie son état sans créer de nouvelle demande ni de nouvel e-mail.
- Renvoi du lien limité à une fois par minute ; nouvelle demande après traitement limitée à une fois toutes les dix minutes.
- Limiteur partagé avec la connexion : 20 requêtes par minute par IP et protection par compte à 10 tentatives infructueuses par minute. L’initiation est aussi plafonnée à 6 requêtes par minute par IP ; la confirmation à 10 et la décision à 15.
- Autorisation administrateur, identité et révision vérifiées côté Express/SQLite. Une preuve devenue obsolète ne peut pas être acceptée : refuser cette demande, puis demander une nouvelle vérification.
- Décision, changement d’accès, audit et notification à envoyer dans une transaction. Une erreur d’audit annule l’ensemble.
- Historique : `unblock_requested`, `unblock_accepted`, `unblock_rejected`. Aucun mot de passe ou jeton personnel n’y est ajouté.
- La réinitialisation du mot de passe ne débloque jamais le compte. Le rôle administrateur global reste indispensable pour autoriser son déblocage.

## Notifications et actualisation

Le mode Démo réutilise sa boîte locale et n’instancie aucun transport SMTP. Les décisions sont des messages d’information sans lien secret. La boîte Démo reste en mémoire ; les demandes, décisions et notifications à envoyer sont persistées dans SQLite.

Le mode réel réutilise `server/sales/mail.ts` et les variables existantes `TMS_SMTP_HOST`, `TMS_SMTP_PORT`, `TMS_SMTP_SECURE`, `TMS_SMTP_FROM`, `TMS_SMTP_USER`, `TMS_SMTP_PASS`, `TMS_PUBLIC_URL`. Le mode local-test utilise les équivalents préfixés `TMS_TEST_`. Sans messagerie opérationnelle, l’interface ne prétend pas avoir envoyé le lien.

Une file SQLite conserve les notifications de demande et de décision. Une panne SMTP ne perd pas la décision ; une nouvelle tentative est prévue après 60 secondes et au redémarrage. Le destinataire vérifié est revérifié avant envoi. Si l’adresse administrateur manque, la notification reste à envoyer jusqu’à sa configuration.

Un bail temporaire avec identifiant de propriétaire empêche une ancienne réponse d’écraser celle du worker suivant. La livraison SMTP reste « au moins une fois » : un arrêt après acceptation SMTP mais avant acquittement SQLite peut entraîner un e-mail en double, sans doubler la décision.

Le compteur et le panneau réutilisent `useAutoRefresh` : mise à jour ciblée après opération, communication entre onglets et relecture périodique de 15 secondes lorsque la page est disponible. Aucun bouton d’actualisation supplémentaire n’est ajouté.

## API et stockage

Toutes les routes sont sous `/api/sales`.

| Route | Autorisation et résultat |
| --- | --- |
| `POST /account-unblock/request` | E-mail et mot de passe corrects d’un compte entreprise bloqué ; lien de confirmation ou état déjà en attente. Aucune session créée. |
| `POST /account-unblock/verify` | Lien personnel valide ; enregistrement unique de la demande en attente. |
| `GET /admin/unblock-requests` | Administrateur global uniquement ; liste et état d’envoi des décisions, sans secrets. |
| `PUT /admin/unblock-requests/:id` | Administrateur global uniquement ; décision `accepted` ou `rejected`, avec révision actuelle du compte. |

Trois tables additives : `account_unblock_links`, `account_unblock_requests`, `account_unblock_notices`. Elles référencent les comptes existants ; aucune donnée métier n’est supprimée ou renumérotée. La migration `account-unblock-v1` couvre aussi une éventuelle version intermédiaire sans version de session ni propriétaire de bail : les données sont conservées et aucune ancienne preuve inconnue n’est rendue valide artificiellement.

Les bases habituelles existantes restent protégées par le précontrôle de migration. Une sauvegarde récupérable et une autorisation explicite de l’exploitation sont nécessaires avant `TMS_ALLOW_AUTH_MIGRATION=true`, selon la procédure administrateur existante. Les outils de maintenance e-mail appliquent aussi ce précontrôle. Les fichiers `sales-live.sqlite`, `tenant-test.sqlite` et leurs journaux WAL sont restés identiques pendant ces essais.

Le serveur Démo déjà ouvert a rechargé le schéma additif. La comparaison avec son état initial, reconstitué uniquement dans des copies temporaires à partir du journal WAL inchangé dans son préfixe, confirme la conservation des lignes de ses 15 tables existantes, à l’exception de l’ajout attendu dans `auth_migrations`. Les trois nouvelles tables sont vides ; aucun compte réel de cette Démo n’a servi aux essais. Le contrôle des clés étrangères ne relève aucune incohérence.

## Vérifications réalisées

- **107 tests réussis** en suite complète séquentielle ; TypeScript et build réussis. Le build conserve l’avertissement existant sur la taille du bundle principal.
- `tests/unblockRequests.test.ts` : acceptation/refus, preuve obligatoire, isolation, anciennes sessions, doublons, expiration et usage unique, changement d’identité, autorisations, limites, décisions concurrentes, rollback, déblocage manuel, panne/reprise des notifications, baux et SMTP via récepteur local.
- `tests/unblockMigration.test.ts` : migration additive d’un schéma intermédiaire, données conservées et refus des preuves historiques incomplètes.
- `tests/autoRefresh.test.ts` : invalidations ciblées du panneau, de la fiche et de la boîte Démo.
- Chrome avec une base temporaire : mauvais mot de passe sans bouton de demande, lien simulé, demande unique, compteur automatique, confirmation annulée puis acceptation, refus, notification et reconnexion ; formats 320, 768 et 1440 pixels.
- Aucun compte existant n’a été utilisé pour les essais. Aucun e-mail externe n’a été envoyé. La livraison vers la messagerie réelle de l’exploitant nécessite sa configuration et son propre essai.

## Fichiers concernés

- Serveur : `server/sales/unblockRequests.ts`, `companies.ts`, `api.ts`, `mail.ts`, `demoMailbox.ts`, `authMigration.ts`, `server/emailMaintenance.ts`.
- Interface : `src/components/PlatformLogin.tsx`, `CompanyEmailLink.tsx`, `DemoFrame.tsx`, `admin/UnblockRequestsPanel.tsx`, `admin/AccountAccess.tsx`, `admin/AdminArea.tsx`.
- Contrats et actualisation : `src/types/administration.ts`, `src/types/authentication.ts`, `src/context/companyApi.ts`, `src/utils/autoRefresh.ts`.
- Tests : les trois fichiers cités ci-dessus. Documentation : ce guide et les renvois dans `COMPTES_ACCES.md` et `DEMO.md`.
