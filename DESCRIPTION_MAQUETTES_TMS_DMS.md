# Description complète des maquettes — TMS / DMS Delivery

## 1. Présentation générale du projet

Le projet **TMS / DMS Delivery** est une maquette fonctionnelle d'une application de gestion de tournées, de livraisons et de preuves électroniques de livraison.

Le projet contient deux grandes interfaces :

1. **Backoffice Web**  
   Interface utilisée par le superviseur logistique pour suivre les opérations, gérer les tournées, consulter les livraisons, valider les preuves e-POD et traiter les anomalies.

2. **Application Mobile Chauffeur**  
   Interface utilisée par le chauffeur pour exécuter sa tournée, consulter ses livraisons, utiliser le GPS, confirmer l'arrivée client, vérifier les colis, créer une preuve e-POD et clôturer sa tournée.

Le projet est basé sur :

- React
- TypeScript
- Vite
- Classes Tailwind inline
- Données mockées
- Pas de backend réel

---

## 2. Design system utilisé

L'identité visuelle est inspirée de **Marjane** et **Electroplanet**, avec une utilisation contrôlée des couleurs.

### Couleurs principales

- Bleu principal Marjane : `#0057A8`
- Bleu nuit : `#003B73` / `#102A43`
- Rouge Electroplanet : `#D71920`, utilisé seulement comme accent limité
- Jaune Marjane : `#FFD200`, utilisé pour de petits highlights
- Vert succès : `#2E9E5B`
- Orange validation / attente : `#E8722C`
- Rouge foncé erreur / rejet : `#7F1D1D`
- Fond clair : `#EEF3F8`, `#F7FAFC`
- Bordure : `#DDE7F0`

### Règles visuelles

- Bleu = navigation, actions principales, identité.
- Vert = succès ou livraison validée.
- Orange = attente, validation, e-POD à traiter.
- Rouge foncé = échec, rejet, anomalie bloquante.
- Jaune = micro-highlight seulement.
- Les écrans doivent rester sobres, lisibles et adaptés à une application métier.

---

# Partie 1 — Backoffice Web

## 3. Structure générale du Backoffice

Le backoffice est l'interface du superviseur logistique.

Il contient :

- une barre supérieure globale ;
- une sidebar de navigation à gauche ;
- une zone centrale qui change selon le module sélectionné.

### Navigation gauche

La navigation gauche contient les modules suivants :

- Tableau de bord
- Commandes
- Tournées
- Livraisons
- Chauffeurs
- Véhicules
- Validation
- Paramètres

Elle sert à naviguer rapidement entre les modules métier du backoffice.

---

## 4. Barre de contexte opérationnel

Cette barre affiche :

- le dépôt actif ;
- l'état de connexion du système ;
- la date et l'heure.

Exemple :

**Dépôt Central : Casablanca Hub Ouest (Aïn Diab / Maarif)**

Cela représente le hub ou dépôt logistique depuis lequel les produits sont préparés et récupérés pour la livraison.

**Système connecté (Direct e-POD)**

Cela signifie que le backoffice reçoit directement les preuves de livraison électroniques envoyées depuis l'application chauffeur.

---

## 5. Tableau de bord d'exploitation

Le tableau de bord est la page principale du superviseur.

Son rôle est de donner une vue globale de l'exploitation en temps réel.

### Éléments présents

- Bandeau principal “Tableau de bord d'exploitation”
- Cartes KPI
- Carte temps réel des chauffeurs et livraisons
- Alertes & incidents récents
- Tableau des tournées actives

### Bandeau principal

Il affiche :

- le titre de la page ;
- le contexte de supervision ;
- un raccourci vers les preuves e-POD à valider ;
- un raccourci vers la gestion des tournées.

### Cartes KPI

Les cartes KPI affichent :

- total des livraisons ;
- livraisons livrées / validées ;
- livraisons en cours ;
- preuves à valider ;
- anomalies / échecs.

Elles permettent au superviseur de comprendre rapidement l'état global des opérations.

### Carte réelle des chauffeurs

La carte du dashboard utilise une carte réelle intégrée avec des marqueurs métier :

- chauffeur actif ;
- trajet de tournée ;
- preuve e-POD en attente ;
- autre chauffeur / tournée.

Cette carte permet de visualiser la position des opérations sur le terrain.

### Alertes & incidents récents

Cette zone affiche les anomalies récentes :

- client absent ;
- colis abîmé ;
- ralentissement ;
- retard ;
- problème de livraison.

Les incidents bloquants utilisent le rouge foncé. Les informations moins graves utilisent des couleurs plus neutres.

### Tournées actives

Le tableau liste les tournées en cours avec :

- référence tournée ;
- chauffeur ;
- véhicule ;
- zone ;
- nombre de livraisons ;
- progression ;
- statut ;
- action de consultation.

---

## 6. Page Commandes

La page Commandes sert à consulter les commandes à livrer.

Elle permet de voir :

- numéro de commande ;
- client ;
- adresse ;
- statut ;
- créneau ;
- articles ;
- affectation éventuelle à une tournée.

Son rôle est de donner au superviseur une vision des commandes disponibles ou déjà rattachées à une tournée.

---

## 7. Page Tournées

La page Tournées sert à gérer les tournées de livraison.

Elle contient maintenant deux usages :

1. Consultation et suivi des tournées existantes.
2. Création d'une nouvelle tournée.

### Liste des tournées

La partie gauche affiche les tournées du jour.

Chaque tournée montre :

- référence tournée ;
- chauffeur ;
- véhicule ;
- zone ;
- progression ;
- statut.

### Détail d'une tournée

La partie droite affiche :

- détails de la tournée sélectionnée ;
- chauffeur affecté ;
- véhicule affecté ;
- heure de départ ;
- heure de fin estimée ;
- livraisons programmées ;
- ordre de passage ;
- statut des livraisons.

### Création de tournée

La page de création de tournée permet au superviseur de créer une vraie tournée depuis les maquettes.

Le formulaire contient :

- date ;
- zone de livraison ;
- départ prévu ;
- fin estimée ;
- chauffeur ;
- véhicule ;
- livraisons à intégrer.

Un résumé de création affiche :

- la zone choisie ;
- les horaires ;
- le chauffeur ;
- le véhicule ;
- le nombre de livraisons sélectionnées.

Après création, la tournée apparaît dans la liste.

### Affectation et envoi au chauffeur

Le superviseur peut affecter ou réaffecter une tournée à un chauffeur et un véhicule, puis l'envoyer au terminal mobile du chauffeur.

---

## 8. Page Livraisons / Suivi

Cette page sert à suivre les livraisons.

Elle permet de consulter :

- les livraisons en cours ;
- les livraisons affectées ;
- les livraisons terminées ;
- les livraisons en échec ;
- les détails liés aux clients, chauffeurs, tournées et statuts.

Elle sert au suivi opérationnel plus détaillé qu'un simple KPI du tableau de bord.

---

## 9. Page Chauffeurs

La page Chauffeurs affiche la liste des chauffeurs-livreurs.

Elle contient :

- nom et prénom ;
- téléphone ;
- permis ;
- tournée active ;
- statut ;
- action d'appel.

Elle sert à suivre les ressources humaines disponibles pour les tournées.

---

## 10. Page Véhicules

La page Véhicules affiche le parc de véhicules.

Elle contient :

- immatriculation ;
- modèle ;
- capacité ;
- chauffeur assigné ;
- statut.

Elle sert à suivre les véhicules disponibles, en service ou en maintenance.

---

## 11. Page Validation e-POD

La page Validation sert à vérifier les preuves électroniques de livraison envoyées par les chauffeurs.

Une preuve e-POD peut contenir :

- photo de livraison ;
- signature client ;
- nom du réceptionnaire ;
- heure de livraison ;
- coordonnées GPS ;
- précision GPS ;
- remarques chauffeur.

Le superviseur peut :

- valider la preuve ;
- rejeter la preuve ;
- consulter les détails ;
- vérifier la cohérence GPS et les informations client.

### Audit GPS

L'audit GPS affiche :

- latitude ;
- longitude ;
- précision GPS.

Il sert à vérifier que l'action a été faite proche de l'adresse client.

---

## 12. Page Anomalies

Cette page sert à consulter les incidents et anomalies.

Exemples :

- client absent ;
- colis abîmé ;
- adresse incorrecte ;
- retard ;
- refus client.

Elle aide le superviseur à suivre les problèmes et à prendre des décisions.

---

## 13. Page Paramètres

La page Paramètres permet de configurer les règles métier.

### Règles de validation e-POD

Exemples :

- photo obligatoire ;
- signature obligatoire ;
- seuil de tolérance GPS.

Le seuil GPS définit la distance maximale autorisée entre la position du chauffeur et l'adresse client.

### Notifications et seuils de retard

Cette partie permet de définir :

- à partir de combien de minutes une livraison est considérée en retard ;
- si le client reçoit une notification SMS / WhatsApp automatique.

---

# Partie 2 — Application Mobile Chauffeur

## 14. Structure générale de l'application mobile

L'application mobile est simulée dans un téléphone Android.

Elle contient :

- une barre de statut mobile ;
- un écran actif ;
- une navigation mobile en bas ;
- une barre de sélection des écrans de démonstration.

Elle est utilisée par le chauffeur pour exécuter sa tournée.

---

## 15. Page Connexion

La page Connexion permet au chauffeur d'accéder à l'application.

Elle contient :

- logo ;
- titre de l'application ;
- description courte ;
- identifiant / téléphone ;
- mot de passe ;
- bouton de connexion ;
- version de l'application.

Elle reste volontairement simple pour éviter une interface trop chargée.

---

## 16. Accueil chauffeur

La page Accueil donne au chauffeur une vue rapide de sa journée.

Elle affiche :

- nom du chauffeur ;
- date ;
- tournée active ;
- zone de tournée ;
- véhicule ;
- progression globale ;
- prochain arrêt ;
- CTA pour continuer la tournée.

Cette page sert de point de départ pour l'exécution terrain.

---

## 17. Vue tournée

La vue tournée affiche le résumé complet de la tournée.

Elle contient :

- nom du chauffeur ;
- véhicule ;
- progression ;
- nombre d'arrêts ;
- nombre de livraisons livrées ;
- nombre d'échecs ;
- départ hub ;
- fin estimée ;
- liste des arrêts.

Elle aide le chauffeur à comprendre l'ordre de passage et son avancement.

---

## 18. Liste des livraisons

Cette page affiche les livraisons de la tournée sous forme de cartes compactes.

Chaque carte contient :

- numéro de stop ;
- client ;
- commande ;
- quartier ;
- créneau ;
- statut ;
- nombre d'articles.

Elle permet de sélectionner rapidement une livraison.

---

## 19. Détail livraison

Cette page affiche toutes les informations nécessaires pour effectuer une livraison.

Elle contient :

- client ;
- téléphone ;
- adresse ;
- créneau ;
- consignes de livraison ;
- articles à livrer ;
- boutons d'action.

Actions disponibles :

- appeler le client ;
- lancer GPS ;
- confirmer arrivée ;
- signaler un problème.

---

## 20. Écran GPS

L'écran GPS affiche une carte Google Maps intégrée à la place de la carte noire simulée.

Il contient :

- instruction de navigation ;
- distance restante ;
- vitesse simulée ;
- précision GPS ;
- destination client ;
- adresse ;
- bouton “Je suis arrivé sur place”.

La carte a besoin d'Internet pour s'afficher.

---

## 21. Arrivée client

Cette page confirme que le chauffeur est arrivé chez le client.

Elle affiche :

- confirmation d'arrivée ;
- heure d'arrivée ;
- client ;
- adresse ;
- créneau ;
- articles à décharger.

Le chauffeur peut ensuite commencer le contrôle des colis.

---

## 22. Vérification colis

Cette page permet au chauffeur de contrôler les articles avant la remise au client.

Elle contient :

- compteur de progression ;
- liste des articles ;
- cases à cocher ;
- référence ;
- poids ;
- numéro de série si disponible.

Le chauffeur doit vérifier les articles avant de passer à l'e-POD.

---

## 23. Page e-POD

La page e-POD permet de créer la preuve électronique de livraison.

Elle contient :

- récapitulatif de la livraison ;
- photo de livraison ;
- signature client ;
- nom du réceptionnaire ;
- remarque chauffeur ;
- bouton de confirmation.

Après confirmation, la livraison passe au statut **À valider** dans le backoffice.

---

## 24. Succès livraison

Cette page confirme que la livraison a été envoyée au backoffice.

Elle affiche :

- icône de succès ;
- commande ;
- client ;
- statut “À valider” ;
- bouton vers la livraison suivante ;
- bouton retour tournée.

---

## 25. Échec livraison

Cette page permet de déclarer une livraison impossible.

Elle contient :

- client concerné ;
- motif de non-livraison ;
- commentaire explicatif ;
- photo justificative facultative ;
- bouton de confirmation d'échec.

Après confirmation, la livraison passe au statut **Échec** et une anomalie est créée.

---

## 26. Historique

La page Historique affiche les livraisons clôturées.

Elle contient des filtres :

- Tous ;
- Validée ;
- À valider ;
- Échec ;
- Rejetée.

Elle permet au chauffeur de retrouver les livraisons déjà traitées.

---

## 27. Fin de tournée

Cette page permet au chauffeur de clôturer sa tournée.

Elle affiche :

- nombre de livraisons réussies ;
- nombre d'échecs ;
- taux de réussite ;
- distance totale ;
- heure de départ ;
- heure de retour ;
- véhicule utilisé.

Elle sert à finaliser la journée du chauffeur.

---

## 28. Profil chauffeur

La page Profil affiche les informations du chauffeur, du véhicule et du terminal.

Elle contient :

- nom du chauffeur ;
- permis ;
- statut ;
- téléphone ;
- tournée active ;
- immatriculation ;
- modèle véhicule ;
- précision GPS ;
- batterie ;
- bouton clôturer tournée ;
- bouton déconnexion.

---

# 29. Parcours principal chauffeur

Le parcours normal d'une livraison est :

1. Connexion
2. Accueil
3. Consultation de la tournée
4. Sélection d'une livraison
5. Navigation GPS
6. Arrivée client
7. Vérification colis
8. Création e-POD
9. Confirmation livraison
10. Livraison envoyée au backoffice pour validation

---

# 30. Parcours superviseur backoffice

Le parcours principal du superviseur est :

1. Consulter le tableau de bord
2. Voir les tournées actives
3. Créer ou affecter une tournée
4. Suivre les livraisons
5. Consulter les alertes
6. Valider ou rejeter les e-POD
7. Traiter les anomalies
8. Suivre chauffeurs et véhicules

---

# 31. Glossaire métier

## TMS

Transport Management System.  
Système de gestion du transport et des tournées.

## DMS

Delivery Management System.  
Système de gestion des livraisons.

## e-POD

Electronic Proof of Delivery.  
Preuve électronique de livraison.

Elle peut contenir :

- photo ;
- signature ;
- GPS ;
- heure ;
- nom du réceptionnaire ;
- remarque chauffeur.

## Dépôt / Hub

Lieu où les produits sont préparés, stockés et récupérés avant la livraison.

## Stop

Un arrêt dans une tournée.  
Exemple : Stop #2 = deuxième livraison dans l'ordre de passage.

## Audit GPS

Contrôle de la position GPS associée à une livraison ou une preuve e-POD.

## Seuil de tolérance GPS

Distance maximale acceptée entre la position du chauffeur et l'adresse du client.

---

# 32. Résumé final

Les maquettes représentent une application complète de gestion de livraison avec :

- un backoffice pour le superviseur ;
- une application mobile pour le chauffeur ;
- un parcours de création, affectation et suivi des tournées ;
- un parcours terrain de livraison ;
- une gestion des preuves e-POD ;
- une gestion des anomalies ;
- un suivi GPS et opérationnel.

L'objectif des maquettes est de démontrer le fonctionnement métier complet d'une plateforme TMS/DMS adaptée à la livraison terrain.
