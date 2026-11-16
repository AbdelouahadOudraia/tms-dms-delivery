# Comptes et accès — gestion de la sécurité

## Fonctionnement livré

La page **Administration → Comptes et accès** complète la gestion des entreprises. Elle affiche l’identifiant technique du compte, son e-mail actuel, son type, son entreprise, son statut indépendant et l’accès effectif avec ses motifs de blocage. La vérification de l’e-mail reste dans la fiche détaillée.

La recherche couvre les comptes, les e-mails et les noms d’entreprise. Les filtres de type et de statut sont retirés de cette version simplifiée. Sur mobile, les lignes deviennent des cartes lisibles. Les données d’accès viennent du serveur. L’action du super administrateur est **Mon compte** ; celle d’un compte entreprise est **Gérer l’accès**.

**Gérer l’accès** ouvre trois rubriques : **Informations du compte**, **Gestion de l’accès**, **Historique de sécurité**. La dernière connexion réussie n’est affichée que si sa date a été réellement enregistrée. Le lien vers la fiche entreprise réutilise son formulaire e-mail existant. Le bouton **Actualiser** de l’en-tête est l’unique commande d’actualisation.

## Règles d’accès

- Un blocage de compte conserve l’entreprise, sa configuration et ses données métier.
- La désactivation d’entreprise et le blocage de compte sont indépendants. Réactiver l’entreprise ne débloque pas le compte ; débloquer le compte ne réactive pas l’entreprise.
- Le blocage du compte refuse les nouvelles connexions, les sessions déjà ouvertes et les API protégées de ce compte.
- Bloquer ou débloquer impose une confirmation dans l’interface et les droits administrateur sur le serveur. Le blocage révoque automatiquement les sessions.
- Le bouton de révocation manuelle est retiré de cette interface. Le mécanisme et l’API existants restent protégés et compatibles, et leurs événements réels restent consultables.
- Le compte administrateur plateforme ne peut pas être bloqué ou révoqué depuis cette interface.
- Après un déblocage de compte ou une réactivation d’entreprise, une nouvelle connexion est nécessaire. Les anciens jetons ne redeviennent pas valides.
- Une entreprise reste bloquée tant que son adresse n’est pas vérifiée ou que son activation n’est pas terminée.
- Un compte bloqué peut récupérer son mot de passe avec son adresse déjà vérifiée si son entreprise est active et son activation terminée. Cette récupération conserve le blocage ; seul l’administrateur plateforme peut débloquer le compte. L’activation et la vérification d’une nouvelle adresse restent refusées pendant le blocage.
- Le blocage de compte ne désactive pas les synchronisations serveur indépendantes de ses sessions : leur arrêt reste lié à la désactivation de l’entreprise.

Le message « Votre compte est temporairement bloqué » n’est retourné qu’après validation du mot de passe d’un compte à e-mail vérifié. Avec un mot de passe incorrect ou une adresse inconnue, le message générique est conservé. Si l’entreprise est aussi désactivée, le message de désactivation de l’entreprise est prioritaire ; les deux motifs restent visibles par l’administrateur dans la fiche du compte.

## Comparaison avec le rapport de recherche

La séparation recommandée existait déjà dans le projet : aucun nouvel état, rôle, endpoint ou mécanisme de session n’est nécessaire. Cette clarification n’exige pas de migration SQLite. Les codes techniques `suspended`, `reactivated`, `account_suspended` et `ACCOUNT_SUSPENDED` sont conservés pour préserver les données historiques et la compatibilité des API ; l’interface utilise **Bloquer / Débloquer le compte** et l’historique **Compte bloqué / Compte débloqué**.

| Entreprise | Compte | Connexion et API du compte | Synchronisation automatique indépendante |
| --- | --- | --- | --- |
| Active | Actif | Autorisées si l’e-mail est vérifié et l’activation terminée | Continue si configurée |
| Active | Bloqué | Refusées ; sessions révoquées | Continue, y compris un import déjà commencé |
| Désactivée | Actif | Refusées ; sessions révoquées | Arrêtée ; aucun résultat tardif n’est enregistré |
| Désactivée | Bloqué | Refusées pour les deux motifs | Arrêtée |

Après réactivation de l’entreprise, un compte bloqué reste bloqué ; les synchronisations configurées peuvent reprendre. Après déblocage du compte d’une entreprise désactivée, l’entreprise reste inaccessible et ses synchronisations restent arrêtées.

Justificatifs vérifiés dans le code :

- `server/sales/companies.ts` : `account_access` porte le statut du compte ; `company_status_events` et la vue `company_directory` portent celui de l’entreprise. `manageAccountAccess` ne change pas l’entreprise et `setStatus` ne change pas le blocage du compte.
- `server/sales/companies.ts` : `login` vérifie le mot de passe avant de préciser la restriction ; `account` recontrôle les deux états, la version de session, l’e-mail et l’expiration à chaque accès protégé. La révocation persiste via `accounts.session_version`, même pour une autre instance.
- `server/sales/api.ts` : les routes de gestion des comptes sont réservées à l’administrateur. Chaque service de synchronisation est lié à un identifiant et à une révision d’entreprise, indépendamment d’une session utilisateur. La désactivation ferme ce service ; la réactivation le recrée avec la nouvelle révision.
- `server/sales/service.ts` : contrôle de l’état et de la révision de l’entreprise avant les écritures SQLite, annulation des appels lors de la fermeture et refus des résultats obsolètes après une désactivation/réactivation.
- `server/sales/accountSecurity.ts` : les motifs d’accès effectif affichent séparément les deux restrictions ; le journal du compte reste distinct de celui de l’entreprise.

Le rapport joint est utilisé comme recommandation de conception, sans présenter ses références internes ni une conformité à un standard comme vérifiées. Les sessions restent en mémoire : leur persistance multi-serveurs n’est pas ajoutée.

## Vérifier le parcours dans la démo

1. Lancer `npm.cmd run demo`, puis ouvrir le port 3020.
2. Se connecter avec l’e-mail du super administrateur.
3. Dans **Comptes et accès**, rechercher une entreprise et ouvrir **Gérer l’accès**.
4. Cliquer sur **Bloquer le compte**, puis **Confirmer le blocage**.
5. Dans une autre fenêtre, vérifier le refus de connexion et d’accès depuis une session précédemment ouverte.
6. Vérifier que l’entreprise est toujours active et que ses données sont conservées.
7. Cliquer sur **Débloquer le compte**, confirmer, puis se reconnecter avec son e-mail.
8. Utiliser le bouton **Actualiser** de l’en-tête pour recharger la fiche et son historique.
9. Consulter les 20 derniers événements du compte et les raisons d’accès.
10. Pour vérifier l’indépendance des statuts, bloquer le compte, désactiver puis réactiver son entreprise : le compte doit rester bloqué.
11. Désactiver à nouveau l’entreprise et débloquer le compte : l’entreprise doit rester désactivée, sans accès ni synchronisation.

La boîte de réception de démo reste simulée. Aucun service SMTP n’est créé en mode démo.

## Corrections P1 : connexion et récupération

La route de connexion réutilise l’authentification existante avec un limiteur dédié :

- **20 tentatives par minute et par IP**, toutes adresses confondues, y compris les connexions réussies et les tentatives refusées par le plafond du compte. Aucun succès ne remet ce compteur à zéro.
- **10 échecs par minute et par compte**, toutes IP confondues. La clé utilise la même adresse canonique que l’authentification, y compris les alias Gmail, puis une empreinte SHA-256 en mémoire. Le limiteur ne consulte pas l’existence du compte.
- Les appels simultanés réservent leur place avant l’authentification. Une réussite libère seulement sa propre réservation, sans effacer les échecs antérieurs du compte ni ceux d’un autre compte.
- Un dépassement renvoie HTTP 429 et `Retry-After`. Les fenêtres expirent après 60 secondes ; la remise à zéro explicite de la démo les vide aussi.

Ces compteurs restent en mémoire dans chaque processus. Leur persistance et leur partage entre serveurs ne font pas partie des corrections P1. Les limites des autres opérations, dont les demandes de récupération, restent inchangées.

La récupération d’un compte bloqué exige son adresse actuelle vérifiée, une activation terminée et une entreprise active. Les anciens liens invalidés lors du blocage restent invalides : demander un nouveau lien après le blocage. Le nouveau lien garde ses 15 minutes, son empreinte en base, son usage unique et sa consommation transactionnelle. La réinitialisation augmente la version de session, conserve `account_access.status='suspended'` et ne réactive jamais une entreprise. Les restrictions des entreprises désactivées restent inchangées.

Parcours manuel, dans une démo avec une entreprise fictive :

1. Bloquer son compte depuis l’administration et vérifier le refus de connexion.
2. Depuis une autre fenêtre, demander un lien avec son e-mail vérifié dans **Mot de passe oublié ?**.
3. Ouvrir le nouveau message dans la boîte de réception démo et choisir un nouveau mot de passe.
4. Vérifier que le compte reste bloqué et que la connexion avec le nouveau mot de passe est refusée pour ce motif.
5. Depuis le super administrateur, débloquer le compte, puis vérifier la connexion avec le nouveau mot de passe et le refus de l’ancien.
6. Vérifier que le lien déjà consommé ne peut plus être utilisé. Une entreprise désactivée ne reçoit pas de lien de récupération et ne peut pas utiliser un lien antérieur.

Fichiers des corrections P1 : `server/sales/api.ts`, `server/sales/loginAttempts.ts`, `server/sales/companyEmail.ts`, `src/components/PlatformLogin.tsx` (texte générique seulement), `tests/accountSecurity.test.ts`, `tests/loginAttempts.test.ts`, `docs/COMPTES_ACCES.md`, `docs/DEMO.md`, `docs/GMAIL_AUTH.md`. Aucune migration SQLite et aucune extension de l’historique P2 ne sont ajoutées.

Vérifications P1 : **20 tests ciblés puis 92 tests de la suite complète réussis**, contrôle TypeScript et build réussis. Chrome vérifie la récupération d’un compte bloqué, le refus de connexion avec son nouveau mot de passe avant déblocage, puis la connexion après déblocage manuel ; les affichages 320/768/1440 restent lisibles. Les scénarios automatiques contrôlent aussi les liens expirés/réutilisés, les tentatives sur plusieurs comptes/IP et la continuité ou l’arrêt des synchronisations selon le statut de l’entreprise. Tous les essais utilisent des bases temporaires. Les empreintes des bases existantes `sales-live.sqlite`, `tenant-test.sqlite`, `demo/demo.sqlite` et de leurs journaux WAL présents sont inchangées. Aucun e-mail externe, aucune suppression de données existantes, aucun commit ni push. Le serveur démo déjà lancé doit être redémarré pour charger le nouveau backend.

## Changement d’adresse e-mail

1. Depuis la fiche de compte, suivre **Gérer l’adresse e-mail sur la fiche entreprise**.
2. Renseigner la nouvelle adresse et confirmer le mot de passe administrateur.
3. L’ancienne adresse vérifiée reste l’adresse de connexion. La nouvelle est réservée et affichée en attente.
4. Envoyer le lien de vérification et le confirmer depuis la boîte simulée.
5. La nouvelle adresse devient l’adresse de connexion. Les anciens liens et sessions du compte sont invalidés.

Ce mécanisme s’applique aussi au changement d’e-mail du super administrateur depuis ses paramètres. Les liens restent valables 15 minutes et à usage unique. Une réinitialisation de mot de passe par l’adresse actuelle annule un changement d’adresse encore en attente. La maintenance exceptionnelle d’une adresse perdue garde sa procédure contrôlée existante ; elle ne bénéficie pas du maintien d’une ancienne boîte compromise.

## Implémentation et migration

Les sessions existantes restent en mémoire, avec leur durée de huit heures. La révocation réutilise `accounts.session_version`, vérifié à chaque requête protégée. Cette version invalide également les sessions émises par une autre instance utilisant la même base. Il n’y a pas de second système d’authentification.

Trois tables sont ajoutées sans supprimer ou renuméroter les comptes et les entreprises :

| Table | Données |
| --- | --- |
| `account_access` | Statut du compte, révision de gestion, dernière connexion enregistrée |
| `account_security_events` | Compte ciblé, action, auteur, motif contrôlé et date |
| `account_email_changes` | Nouvelle adresse en attente et réservation de sa boîte |

Les anciens comptes reçoivent un état d’accès actif par défaut, sans date de dernière connexion inventée. La vérification de l’e-mail et l’état de l’entreprise continuent à s’appliquer. Les événements de maintenance e-mail gardent leur vraie date. Les événements de gestion d’entreprise sont conservés en base mais ne sont plus mélangés à l’historique de cette fiche.

La connexion et les changements d’accès sont sérialisés avec les transactions SQLite. Les opérations administratives exigent la révision consultée : une action concurrente devenue obsolète est refusée avec HTTP 409. L’audit et la modification sont dans la même transaction ; un échec du journal annule la modification. Les e-mails en attente et les adresses actuelles partagent des contrôles de réservation pour éviter leur attribution à deux comptes.

Les routes sont réservées à l’administrateur vérifié :

| Route | Utilisation |
| --- | --- |
| `GET /api/sales/admin/accounts/:login` | Informations et 20 derniers événements du compte |
| `PUT /api/sales/admin/accounts/:login/status` | État `active` ou `suspended`, avec `revision` |
| `POST /api/sales/admin/accounts/:login/revoke-sessions` | API existante de révocation avec `revision`, sans bouton dans cette version |

Une ancienne base habituelle n’est pas migrée par simple rechargement : le verrou d’authentification exige une sauvegarde et une autorisation explicite de l’exploitation. Les essais utilisent des bases temporaires ou le mode démo. La base de production n’est pas utilisée pour ces vérifications.

## Vérifications et limites

- Suite automatisée : **92 tests réussis en exécution séquentielle**, couvrant les scénarios existants, les contrôles d’accès, l’e-mail, la concurrence, l’annulation transactionnelle, la limitation non destructive de l’historique, les traitements automatiques indépendants d’un compte bloqué et les corrections P1.
- TypeScript et build vérifiés. Le build conserve l’avertissement de taille du bundle principal déjà présent.
- Chrome : recherche, tableau simplifié, confirmations, blocage/déblocage et révocation automatique, blocage des API, changement d’e-mail, protection du compte admin et formats 320/768/1440.
- Les tests se font dans des bases temporaires. Les tests SMTP existants utilisent un récepteur local ; la démo n’envoie aucun e-mail réel.
- L’historique affiche au maximum les 20 événements du compte les plus récents disponibles ; les événements de gestion d’entreprise restent stockés mais ne sont pas affichés ici. Aucune ligne d’audit n’est supprimée pour limiter cet affichage. Les anciennes connexions non enregistrées ne sont pas reconstituées.
- Les sessions ne constituent toujours pas un annuaire central persistant ; cette refonte apporte leur révocation, pas un inventaire multi-serveurs.

Lors de la clarification précédente, les 86 tests, TypeScript, le build et le parcours Chrome ont été vérifiés. Les essais navigateur utilisaient une base démo temporaire, avec contrôle des formats 320/768/1440. Le serveur de démonstration existant du port 3020 avait été rechargé sans réinitialisation : les empreintes des lignes de ses 16 tables étaient identiques avant et après. Les fichiers `sales-live.sqlite`, `tenant-test.sqlite` et leurs journaux WAL présents étaient également inchangés. Aucun compte existant n’avait été bloqué ou désactivé pour ces essais. Aucun commit ni push n’avait été effectué.

## Fichiers concernés

| Partie | Fichiers |
| --- | --- |
| États, audit, projection de sécurité | `server/sales/accountSecurity.ts` (nouveau), `server/sales/adminOverview.ts` |
| Authentification, sessions, autorisations et API | `server/sales/companies.ts`, `server/sales/api.ts`, `server/sales/authMigration.ts` |
| Vérification et changement d’e-mail | `server/sales/companyEmail.ts` |
| Tableau et fiche d’accès | `src/components/admin/AccountAccess.tsx` (nouveau), `AdminArea.tsx`, `AdminPages.tsx`, `AdminUI.tsx` |
| Formulaires e-mail réutilisés | `src/components/admin/AdminForms.tsx` |
| Types et messages | `src/types/administration.ts`, `src/types/authentication.ts`, `src/context/companyApi.ts` |
| Tests | `tests/accountSecurity.test.ts` (nouveau), `tests/emailOnlyAuth.test.ts`, `tests/gmailAuth.test.ts` |
| Documentation | `docs/COMPTES_ACCES.md` (nouveau), `docs/DEMO.md`, `docs/GMAIL_AUTH.md`, `README.md` |

## Fichiers de la simplification

Cette simplification ne nécessite aucune migration et conserve les protections d’authentification et de session. Ses changements concernent uniquement :

- `src/components/admin/AccountAccess.tsx` : tableau à sept colonnes, recherche, action Mon compte, suppression des filtres et boutons redondants, trois sections détaillées.
- `src/types/administration.ts` : limite d’historique partagée à 20.
- `server/sales/accountSecurity.ts` : projection de l’historique du compte, sans les événements d’entreprise et sans effacement d’audit.
- `tests/accountSecurity.test.ts` : contrôle de la limite, conservation des événements et régressions de sécurité.
- `docs/COMPTES_ACCES.md` et `docs/DEMO.md` : procédures mises à jour.

## Fichiers de la clarification entreprise / compte

- `src/components/admin/AccountAccess.tsx` : libellés Bloquer / Débloquer, badges, messages, historique et confirmations décrivant le périmètre du compte.
- `src/components/admin/AdminForms.tsx` et `AdminPages.tsx` : explication du périmètre entreprise et du maintien d’un éventuel blocage de compte après réactivation.
- `src/types/authentication.ts` : message de connexion « compte temporairement bloqué », partagé par le frontend et le backend existant.
- `tests/accountSecurity.test.ts` : message sécurisé et indépendance du déblocage face à une entreprise désactivée.
- `tests/companyLifecycle.test.ts` : import automatique déjà en cours puis import suivant malgré le blocage du compte, refus des API du compte et conservation des données de l’autre entreprise ; contrôles existants d’arrêt des imports à la désactivation conservés.
- `docs/COMPTES_ACCES.md`, `docs/DEMO.md`, `docs/GMAIL_AUTH.md` et `README.md` : vocabulaire cohérent et scénario de vérification.
