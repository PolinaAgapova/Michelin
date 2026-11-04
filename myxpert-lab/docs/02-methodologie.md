# Méthodologie

## 1. Distinguer ce que l’on sait de ce que l’on suppose
Chaque élément du site porte une étiquette :

| Étiquette | Signification |
|---|---|
| **Fait public** | Information trouvée dans une source publique citée (fiches des stores, presse professionnelle, pages Michelin) |
| **Hypothèse** | Raisonnement plausible, non vérifié auprès de l’équipe ou des utilisateurs |
| **Recommandation** | Proposition argumentée, à valider |
| **Donnée fictive** | Valeur générée par le modèle synthétique, sans rapport avec la réalité de MyXpert |

Les sources n’ont pas pu être ouvertes directement depuis l’environnement de travail ; elles ont été consultées via des résultats de recherche (voir `01-recherche-et-strategie.md`).

## 2. Modèle d’événements synthétique (`src/data/model.ts`)
- **6 000 utilisateurs**, **120 jours**, **5 pays illustratifs** (FR, DE, ES, IT, PL), **4 personas**.
- Générateur pseudo-aléatoire à graine fixe : mêmes données à chaque chargement.
- Pour chaque utilisateur : date d’installation, origine (30 % viennent de MyTechXpert), intensité d’usage, durée de vie (loi géométrique).
- Chaque jour : probabilité d’activité selon le persona, réduite le week-end (usage professionnel), plus forte la première semaine.
- Chaque jour actif : fonctions utilisées (sélecteur, spécifications, pression, diagnostic, partage).
- Chaque diagnostic progresse étape par étape avec une probabilité d’abandon propre à chaque étape.

Trois signaux sont **injectés volontairement** pour la démonstration et vérifiés par les tests :
| Signal | Mécanisme dans le modèle |
|---|---|
| S1 — abandon à l’étape photo | probabilité d’abandon de 34 % à l’étape 3 en réseau faible, contre 9 % sinon |
| S2 — décrochage des migrés | durée de vie plus courte pour les migrés qui utilisaient l’inspection de flotte |
| S3 — baisse en Pologne | probabilité d’activité × 0,62 à partir du jour 75 |

## 3. Définitions des KPI (`src/data/kpi.ts`)
| KPI | Définition |
|---|---|
| DAU | Utilisateurs distincts actifs le jour J |
| WAU / MAU | Utilisateurs distincts actifs sur [J − 6, J] / [J − 29, J] (fenêtres glissantes) |
| Stickiness | Moyenne sur la période de DAU(J) / MAU(J) ; les jours où MAU = 0 sont ignorés |
| Activation | Part des nouveaux utilisateurs ayant **terminé** un diagnostic dans leurs 7 premiers jours. Cohorte : installés entre le début de la période et 6 jours avant sa fin |
| Rétention Dn | Rétention « classique » : part de la cohorte active **exactement** au jour installation + n. Seules les cohortes observables (installées au moins n jours avant la fin) sont comptées ; sinon le KPI affiche « — » |
| Funnel d’activation | Installation → première consultation ou diagnostic → premier diagnostic démarré → terminé → premier résultat partagé, dans les 7 jours, chaque étape exigeant la précédente |
| Adoption | Part des utilisateurs actifs sur la période ayant utilisé la fonction au moins une fois |
| Complétion | Diagnostics terminés / diagnostics démarrés |
| Abandon par étape | Diagnostics arrêtés à l’étape / diagnostics ayant atteint l’étape (taux conditionnel) |
| CSAT | Part des notes 4 et 5 sur la question posée après un diagnostic terminé |

Les tests (`kpi.test.ts`) vérifient chaque définition sur un petit jeu de données écrit à la main, plus la cohérence du modèle (DAU ≤ WAU ≤ MAU chaque jour, déterminisme, présence des signaux).

## 4. Priorisation (`src/data/rice.ts`)
- **RICE = Reach × Impact × Confiance ÷ Effort.**
- **Reach** : calculé sur les données fictives du dashboard, sur environ un trimestre (jours 31 à 120), avec une règle explicite par proposition (par exemple « utilisateurs ayant atteint l’étape photo »).
- **Impact** (0,25 à 3), **Confiance** (50 / 80 / 100 %) et **Effort** (personne-mois) sont mes estimations ; elles sont modifiables dans l’interface.
- **Roadmap** : les propositions sont placées par score décroissant dans Now puis Next selon la capacité (personne-mois). Une proposition n’est jamais placée avant ses dépendances. Option : les propositions à **échéance** (le décommissionnement de MyTechXpert) passent en premier, car le RICE ne mesure pas le coût de perdre des utilisateurs à une date donnée.

## 5. Expérimentation
Taille d’échantillon par groupe pour comparer deux proportions (test bilatéral) :

n = (z₁₋α/₂ + z₁₋β)² × [p₁(1 − p₁) + p₂(1 − p₂)] / (p₂ − p₁)²

La référence p₁ est le taux de complétion des 30 derniers jours du modèle. Simplification assumée : l’unité est le diagnostic ; une vraie expérience randomiserait par utilisateur, ce qui augmente la taille nécessaire (effet de grappe).

## 6. Décisions de passage (`src/data/gates.ts`)
- **Marché** : score pondéré (vérifié = 1, à vérifier = 0,5, bloquant = 0). Pilote à partir de 60 %, lancement à partir de 90 %, et jamais de lancement avec un point bloquant.
- **Décommissionnement** : six critères, tous nécessaires (fonctions à risque élevé décidées, inventaire complet, données récupérables, annonce à T − 60 j, support préparé, usage résiduel sous le seuil).

## 7. Limites
- Je n’ai pas testé MyXpert. Le prototype illustre un parcours ; il ne reproduit pas l’interface.
- Les règles de diagnostic du prototype sont fictives et ne constituent pas un conseil technique.
- Les marchés du chapitre 04 sont illustratifs ; je ne sais pas où MyXpert est déjà disponible.
- Les estimations d’impact et d’effort sont personnelles et doivent être remplacées par celles de l’équipe.
