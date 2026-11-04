# Phase 1 et 2 — Recherche, opportunités, choix stratégique

> Étude exploratoire indépendante. Projet non officiel, sans lien avec Michelin.
> Aucune donnée interne n'a été utilisée.

## 0. Ce que je n'ai pas pu consulter

L'environnement de travail bloque l'accès direct aux pages suivantes ; je ne les ai **pas** ouvertes :
- l'offre de stage sur `recrutement.michelin.fr` (son contenu vient de la description transmise par Polina) ;
- les fiches App Store et Google Play de MyXpert et MyTechXpert ;
- la page `pro.michelin.fr` sur MyTechXpert.

Les faits ci-dessous viennent de **résultats de recherche web** (extraits des fiches des stores et d'articles de presse professionnelle).
**Je n'ai pas testé l'application MyXpert.** Tout ce qui concerne son interface réelle est une hypothèse.

## 1. Faits publics (niveau de confiance indiqué)

| # | Fait | Source | Confiance |
|---|---|---|---|
| F1 | MyXpert est une application gratuite destinée aux **distributeurs de pneus commerciaux**, pour accompagner leurs clients en transport longue distance et urbain (camions, bus, utilitaires), agriculture, construction et manutention. | Extraits des fiches App Store (id6741895803) et Google Play (`com.michelin.b2bmasterapp`) | Élevée |
| F2 | MyXpert propose un **sélecteur de produits** filtrant par application, marque, type de véhicule et besoins du client. | Idem | Élevée |
| F3 | MyXpert propose des **spécifications techniques**, des **recommandations de pression et de montage**, et un **diagnostic de dommage pas à pas** qui guide l'identification et propose des solutions. | Idem | Élevée |
| F4 | Certaines fonctions excluent les pneus pour chenilles, diagonaux (bias-ply) et pleins (astérisque dans la fiche). | Idem | Moyenne |
| F5 | MyTechXpert est la version numérique du **carnet technique Michelin poids lourd** ; lancée en Europe en 2022, en Amérique du Nord en novembre 2023 ; plus de 200 pneus commerciaux. | Presse pro (Commercial Tyre Business, Fleet Maintenance, Modern Tire Dealer, Transport Engineer), site Michelin Australie | Élevée |
| F6 | MyTechXpert : recommandations de pression, informations rechapage / recreusage, images de diagnostic, contenus du Service Manual (montage, sécurité), vidéos de formation. | Idem | Élevée |
| F7 | MyTechXpert : **inspection rapide de flotte**, possibilité de **lister et suivre les pneus de ses clients**, rapports d'inspection enregistrés ; inspection détaillée bande de roulement / flanc / gomme intérieure / talon. | Extraits App Store MyTechXpert, presse | Moyenne (peut varier selon les pays) |
| F8 | Le stage inclut l'accompagnement du **maintien puis du décommissionnement de MyTechXpert**. | Offre de stage (texte fourni) | Élevée |
| F9 | Le nom de package Android de MyXpert est `com.michelin.b2bmasterapp`. | Extrait Google Play | Élevée |

**Lecture :** MyXpert élargit le périmètre (plusieurs segments au lieu du seul poids lourd) et reprend plusieurs fonctions de MyTechXpert.
**Je n'ai trouvé aucune mention publique**, dans la fiche MyXpert, de l'inspection de flotte, du suivi des pneus clients, des rapports d'inspection, du rechapage ni des vidéos de formation. Cela **ne veut pas dire qu'ils manquent** : la fiche peut être incomplète. C'est précisément ce qu'il faut vérifier avant tout décommissionnement.

## 2. Hypothèses sur les utilisateurs (non vérifiées)

| Persona (fictif) | Contexte supposé | Besoin principal supposé |
|---|---|---|
| Technicien atelier | Centre de service, réseau correct, mains souvent sales ou gantées | Diagnostiquer vite et justifier la décision au client |
| Technicien itinérant / dépannage | Bord de route, aires, sites clients ; réseau parfois faible ; pression du temps | Terminer un diagnostic même en conditions dégradées |
| Conseiller commercial | En visite chez des clients flotte ou agricoles | Trouver le bon produit et ses caractéristiques |
| Responsable de centre | Bureau, pilotage | Suivre l'activité, rendre compte aux clients flotte |

## 3. Opportunités (phase 1)

| # | Opportunité | Confiance | Ce qui manque pour décider |
|---|---|---|---|
| O1 | **Diagnostic en conditions terrain** : reprise d'un diagnostic interrompu, étape photo moins bloquante, tolérance au réseau faible | Moyenne : le diagnostic pas à pas existe (F3) ; les conditions terrain sont supposées | Données d'abandon par étape, contexte réseau, tests terrain |
| O2 | **Du diagnostic à l'action** : un résultat partageable avec le client flotte | Moyenne-faible : existait côté MyTechXpert (F7), non mentionné côté MyXpert | Usage réel des rapports, attentes des clients flotte, contraintes juridiques |
| O3 | **Continuité MyTechXpert → MyXpert** : ne perdre ni les utilisateurs ni leurs données d'inspection | Moyenne : mission explicite du stage (F8) ; écart fonctionnel possible (F7) | Inventaire réel des fonctions, volumes d'usage, possibilités techniques de migration |
| O4 | **Pertinence du sélecteur multi-segments** (agri, construction, manutention) | Faible | Logs de recherche, taux de résultats vides |
| O5 | **Accueil adapté au métier** (raccourcis selon l'usage) | Faible | Segmentation réelle des utilisateurs |
| O6 | **Localisation** : langues, unités (bar/psi), contenus et réglementations locales | Moyenne : enjeu explicite (mission 5) | Liste des pays, processus de traduction |
| O7 | **Feedback contextuel** : une question après un diagnostic | Moyenne : mission 6 | Canaux de feedback existants |
| ~~O8~~ | ~~Diagnostic automatique par IA à partir d'une photo~~ | Écartée | Responsabilité en cas d'erreur de sécurité, besoin d'un jeu de données labellisé, valeur non démontrée. À reconsidérer seulement si les données d'usage montrent que l'étape d'identification est le vrai problème. |

## 4. Challenge stratégique (phase 2)

Notation de 1 à 5, jugement argumenté, pas une mesure.

| | Valeur utilisateur | Pertinence Michelin | Lien avec le stage | Démontrable | Originalité | Faisabilité | **Total** |
|---|---|---|---|---|---|---|---|
| O1 Diagnostic terrain | 5 | 4 | 4 | 5 | 3 | 4 | **25** |
| O2 Diagnostic → action | 4 | 4 | 3 | 4 | 4 | 3 | **22** |
| O3 Continuité MyTechXpert | 4 | 5 | 5 | 4 | 4 | 3 | **25** |
| O4 Sélecteur | 3 | 3 | 3 | 2 | 2 | 3 | 16 |
| O5 Accueil métier | 3 | 3 | 3 | 3 | 2 | 4 | 18 |
| O6 Localisation | 3 | 4 | 4 | 3 | 2 | 3 | 19 |
| O7 Feedback | 2 | 3 | 4 | 4 | 2 | 5 | 20 |

**Choix :** O1, O2 et O3 forment un seul problème, qui se raconte en une phrase :

> **Un diagnostic commencé sur le terrain doit aller jusqu'à une décision utile au client, y compris pour les utilisateurs qui arrivent de MyTechXpert.**

O6 et O7 servent de leviers dans le plan de déploiement et dans la boucle de feedback. O4 et O5 restent dans le backlog, en « Later ».

## 5. Pourquoi changer le nom « MyXpert — The Next Move »

« The Next Move » est générique : il pourrait s'appliquer à n'importe quel produit.
Je propose **« MyXpert — Field to Decision »** : il dit exactement ce que montre le projet (du terrain à la décision produit) et garde le sous-titre demandé, *From user insights to product decisions*.

Le **mécanisme narratif** : un seul dossier, « 07 h 12 ». On suit un pneu endommagé, un technicien fictif et sa décision, puis on remonte du terrain aux données, des données à la priorisation, puis au déploiement. Chaque affirmation porte une étiquette de provenance : **Fait public**, **Hypothèse**, **Recommandation** ou **Donnée fictive**.
