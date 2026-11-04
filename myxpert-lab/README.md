# MyXpert — Field to Decision

*From user insights to product decisions.*

> **Independent exploratory case study — Non-official Michelin project.**
> Ce projet n’est ni affilié, ni approuvé par Michelin. Aucune donnée interne n’a été utilisée.
> Toutes les données chiffrées sont **fictives** et signalées comme telles.

Étude de cas produit interactive réalisée par Polina Agapova dans le cadre de sa candidature au stage
*Chef(fe) de produit digital — Application mobile Michelin MyXpert*.

## L’idée en 15 secondes
Un pneu entaillé, un technicien, trois minutes pour décider. Le dossier suit ce moment du terrain jusqu’à la roadmap :

> **Comment faire en sorte qu’un diagnostic commencé sur le terrain aille jusqu’à une décision utile au client,
> y compris pour les utilisateurs qui arrivent de MyTechXpert ?**

## Les cinq espaces
| Chapitre | Contenu |
|---|---|
| 00 · En 2 minutes | Trois recommandations, ce que je ne sais pas, ce que je ferais la première semaine |
| 01 · Terrain | Persona, chaîne problème → mesure, parcours AS-IS / TO-BE, **prototype mobile cliquable** |
| 02 · Données | Dashboard d’analytics produit sur un **modèle d’événements synthétique** : filtres période / pays / persona, comparaison de segments, funnel, rétention, abandons, CSAT. **From Data to Decision** sur trois signaux |
| 03 · Décision | Backlog avec **RICE calculé** et modifiable, matrice impact / effort, **roadmap Now / Next / Later recalculée**, arbitrage principal, **calculateur de test A/B** |
| 04 · Déploiement | Simulation de lancement sur trois marchés illustratifs avec décision de passage ; **plan de transition MyTechXpert → MyXpert** avec inventaire et critères de décommissionnement |
| 05 · Pourquoi ce travail | Lien avec mon parcours (Mersen, Atos / Euromaster, IAE) |

Chaque affirmation porte une étiquette : **Fait public**, **Hypothèse**, **Recommandation**, **Donnée fictive**.

## Installation
Prérequis : Node.js 18 ou plus.
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 26 tests sur les KPI, le RICE, la roadmap, la taille d’échantillon et les décisions de passage
npm run build      # vérification des types + build statique dans dist/
npm run preview    # sert le build
```
Contrôle qualité navigateur (Playwright requis) :
```bash
npm run build && npm run preview &
node qa/qa.cjs http://localhost:4173/ qa/   # 18 vérifications desktop + mobile
```

## Déploiement sur Vercel
Le site est 100 % statique ; `vercel.json` est fourni.
1. Pousser le dépôt sur GitHub.
2. Sur vercel.com : *Add New → Project*, importer le dépôt.
3. **Root Directory : `myxpert-lab`** (le reste est détecté : Vite, `npm run build`, sortie `dist`).
4. *Deploy*. Aucune variable d’environnement n’est nécessaire.

## Choix techniques
- **Vite + React + TypeScript** plutôt que Next.js : le site n’a ni serveur ni routage, un build statique suffit et se déploie partout.
- **Graphiques en SVG faits main** plutôt qu’une bibliothèque : contrôle complet du design, infobulles au clavier, aucune dépendance lourde.
- **Calculs isolés dans `src/data/`**, en fonctions pures testées avec Vitest.
- Seule dépendance externe à l’exécution : les polices Google Fonts (avec polices de repli).

## Structure
```
src/data/      model.ts (générateur d’événements), kpi.ts, rice.ts, gates.ts + tests
src/content/   backlog.ts, content.ts (sources, signaux, marchés, inventaire, calendrier)
src/components/Terrain, Donnees, Decision, Deploiement, charts, ui
docs/          recherche et stratégie, méthodologie, livrables de candidature
qa/            contrôle qualité navigateur
```

## Documentation
- [Recherche, opportunités et choix stratégique](docs/01-recherche-et-strategie.md)
- [Méthodologie : modèle de données, KPI, priorisation, expérimentation](docs/02-methodologie.md)
- [Livrables de candidature](docs/candidature/)
