# Actualisation automatique des données

## Pages concernées

| Zone | Traitement |
| --- | --- |
| Administration : tableau de bord, entreprises, fiches, comptes, connexions, paramètres | Relecture silencieuse de l’aperçu ; fiche de compte et historique relus séparément. Bouton Actualiser supprimé. |
| Boîte de réception Démo | Relecture uniquement quand le panneau est ouvert ; sélection conservée. Bouton Actualiser supprimé. |
| Création du premier administrateur | Détection de la vérification depuis une autre fenêtre ; passage automatique à la connexion. Aucun compte ni session créé par cette détection. |
| Dossiers de vente | Relecture de l’état enregistré, mutualisée à la place de l’ancien intervalle de 1,5 seconde. |
| Toutes les vues TMS/DMS utilisant le transport partagé : BL, planification, tournées, livraisons, e-POD, incidents, ressources, adresses, zones, tableaux de bord, application chauffeur | Adoption des versions enregistrées dans une autre session, sans recharger la page ni réinitialiser la navigation. |
| Control Tower | Suppression du bouton qui changeait seulement un horodatage fictif. Affichage de la dernière lecture/sauvegarde réelle du transport. |
| Détails BL, chauffeur, véhicule ; formulaires de configuration | Les détails suivent les données actuelles. Les champs non modifiés adoptent les valeurs distantes ; les brouillons modifiés restent conservés. |

Les boutons **Synchroniser maintenant**, **Tester la connexion**, l’activation de la synchronisation commerciale et **Reprendre une photo** sont conservés : ils déclenchent une opération réelle distincte d’une relecture. Le dernier intervalle local de l’écran de navigation chauffeur anime une démonstration GPS ; il n’interroge pas les API et reste inchangé. Les prestataires de `ProvidersScreen` sont encore une liste statique locale : aucun service externe ni API de gestion de prestataires n’est inventé.

## Mécanisme retenu

- Un hook commun `useAutoRefresh`, avec ordonnanceur testable sans navigateur.
- Une relecture toutes les **15 secondes** pour les ressources métier et l’administration ; **5 secondes** pour la boîte Démo ouverte et la vérification initiale en attente.
- Relecture anticipée après une opération réussie, au retour dans la fenêtre, au retour en ligne et lors de la navigation. Les événements rapprochés sont regroupés, avec un espacement minimal de 500 ms et une seule requête en vol par abonnement.
- `BroadcastChannel` avertit les autres onglets de même origine d’un chemin ayant changé. Aucun mot de passe, jeton, e-mail, état métier ni résultat d’autorisation n’est transmis. Chaque destinataire relit les données via ses propres accès backend. Si cette messagerie est indisponible, la relecture périodique reste utilisable.
- Les autres appareils ou navigateurs indépendants sont pris en compte par la relecture périodique : aucune infrastructure serveur supplémentaire n’est nécessaire.
- Pas de rechargement complet, pas de réapparition des écrans de chargement après la lecture initiale et pas de remplacement d’un état identique. Les composants et la sélection de navigation restent montés.
- Requêtes suspendues quand la page est cachée ou hors ligne ; lecture/application différée pendant 1,5 seconde après la saisie. Les écritures et les notifications sont regroupées. Les erreurs successives espacent les tentatives jusqu’à 60 secondes.
- Les réponses devenues obsolètes sont annulées/ignorées ; les abonnements sont nettoyés au démontage ou au changement de ressource.

## Saisies et concurrence

Les e-mails et configurations utilisent `useServerDraft` : une nouvelle valeur serveur remplace uniquement un champ resté identique à sa précédente référence. Un formulaire saisi ne remonte plus simplement parce qu’un e-mail serveur a changé.

Le transport conserve le contrôle optimiste existant de SQLite. Une version distante n’est adoptée que si aucune écriture ni modification locale n’est en attente. Une sérialisation stable évite de réenregistrer une simple relecture. La révision est actualisée même quand les données sont identiques. Un conflit réel de sauvegarde reste signalé et les données locales ne sont pas écrasées ou fusionnées silencieusement. La résolution métier de modifications concurrentes contradictoires n’est pas réinventée.

## Périmètre et sécurité

Aucun endpoint, schéma SQLite, rôle, mot de passe, contrôle de session ou règle métier n’est modifié. Tous les accès passent toujours par Express. Les notifications ne constituent jamais une autorisation. Le frontend ne déclenche pas de synchronisation Seller/API à cause d’une simple relecture de données.

## Fichiers concernés

| Fichier | Modification |
| --- | --- |
| `src/utils/autoRefresh.ts` | Ordonnanceur : regroupement, annulation, intervalle, reprise et portée des notifications. |
| `src/utils/dataChanges.ts` | Notifications locales et inter-onglets sans données métier ni secrets ; détection de saisie et d’écritures. |
| `src/utils/transportSnapshot.ts` | Adoption des versions distantes et sérialisation stable sans sauvegarde en écho. |
| `src/hooks/useAutoRefresh.ts` | Hook commun visible/en ligne, reprise au focus et nettoyage au démontage. |
| `src/hooks/useServerDraft.ts` | Adoption d’une valeur serveur uniquement si le brouillon n’a pas été modifié. |
| `src/hooks/useSalesWorkflow.ts` | Relecture partagée des dossiers, sans changer les opérations de synchronisation externe. |
| `src/hooks/useTransportSave.ts` | Lecture entre sessions, conservation des sauvegardes locales et des révisions CAS. |
| `src/context/companyApi.ts` | Signal d’annulation optionnel et notification après une mutation réussie ; autorisations inchangées. |
| `src/context/CompanySpace.tsx` | Relecture silencieuse des accès et détection de la vérification initiale, sans rouvrir l’espace à chaque lecture. |
| `src/context/TmsContext.tsx` | Application des données de transport partagées à toutes les vues, sans remontage du fournisseur. |
| `src/components/admin/AdminArea.tsx` | Actualisation silencieuse de l’administration et suppression du bouton manuel. |
| `src/components/admin/AccountAccess.tsx` | Relecture autonome de la fiche et de son historique. |
| `src/components/admin/AdminForms.tsx` | Conservation des brouillons d’e-mail. |
| `src/components/admin/AdminPages.tsx` | Suppression du remontage du formulaire à chaque changement d’e-mail. |
| `src/components/DemoFrame.tsx` | Boîte de réception automatique tant qu’elle est ouverte, sélection conservée. |
| `src/components/PlatformSetup.tsx` | Attente automatique après vérification, suppression de la commande manuelle redondante. |
| `src/components/backoffice/ControlTowerScreen.tsx` | Compteurs réactifs et horodatage d’une vraie relecture, sans fausse actualisation de démonstration. |
| `src/components/backoffice/FleetScreen.tsx` | Détails chauffeur/véhicule résolus depuis les données actuelles. |
| `src/components/backoffice/OrdersScreen.tsx` | Détail BL résolu depuis les données actuelles. |
| `src/components/backoffice/SalesScreen.tsx` | Configuration distante adoptée quand le formulaire est intact, sans effacer un brouillon. |
| `src/components/backoffice/SettingsScreen.tsx` | Même protection pour les règles et paramètres existants. |
| `tests/autoRefresh.test.ts` | Ordonnancement, pauses, reprise, regroupement, portée entreprise, versions et conservation des données locales. |
| `docs/ACTUALISATION_AUTOMATIQUE.md` | Inventaire, fonctionnement, limites et validation. |
| `docs/COMPTES_ACCES.md` | Guide aligné sur l’actualisation automatique générale. |
| `docs/DEMO.md` | Boîte de réception et administration sans rechargement manuel. |

## Vérifications

Les six nouveaux tests d’ordonnancement et de transport sont dans `tests/autoRefresh.test.ts`. La suite complète compte **98 tests réussis**. Le contrôle TypeScript et le build réussissent ; l’avertissement existant de taille du bundle principal demeure.

Les essais Chrome utilisent une base de démonstration temporaire et des entreprises fictives. Ils vérifient les actions existantes et les formats 320/768/1440, les changements d’un autre client sans action manuelle, la conservation des champs e-mail et mot de passe, l’adoption d’une configuration distante quand le formulaire est intact et la conservation d’un brouillon modifié. Ils vérifient les lectures de transport sans sauvegarde en écho, la présence de la vraie synchronisation commerciale sans déclenchement automatique d’un POST `/sync`, la vérification initiale automatique et la reprise après un premier appel réseau échoué. Six lectures seulement ont été observées pendant les deux cycles de mise à jour de configuration testés.

Les bases existantes et leurs journaux WAL présents sont contrôlés par empreinte ; les tests ne les utilisent pas. Aucun e-mail externe, aucune migration SQLite, aucun commit ni push n’est effectué. Les prestataires statiques et le GPS de démonstration restent explicitement simulés.

