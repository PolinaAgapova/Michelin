# MIXFLOW — Supply Chain Control Tower

*De la prévision à la décision : piloter les flux de mélanges.*

> **Prototype personnel de candidature — données 100 % fictives — projet non affilié à Michelin.**
> Aucune donnée de Michelin ni d’Euromaster n’est utilisée. Le modèle industriel est illustratif et doit être validé avec le métier.

Prototype réalisé par Polina Agapova pour accompagner sa candidature au stage *Supply Chain — Gestion des Flux de Mélanges* (Clermont-Ferrand).

## Ce que montre le prototype
Comprendre → analyser → modéliser → simuler → recommander → communiquer, sur un environnement fictif : 6 mélanges, 3 mélangeurs, 3 ateliers consommateurs, 28 jours d’historique et 14 jours de projection.

| Module | Contenu |
|---|---|
| A · Vue globale | 8 KPI avec définition, formule et lecture ; filtres période / atelier / famille / criticité ; état des mélanges ; plan vs réalisé ; utilisation des mélangeurs ; alertes |
| B · Flux | Matières premières → préparation → mélangeurs → stock intermédiaire → ateliers ; épaisseur = tonnes ; détail au clic |
| C · Prévisions | Biais, WAPE, précision, MAPE, écart cumulé, signal de suivi ; effet des erreurs sur le stock |
| D · Simulation | 5 cas prêts (besoins +20 %, perte de capacité, retard, stock de sécurité, priorités) et réglages libres ; comparaison chiffrée à la référence |
| E · Recommandations | 4 règles métier explicites ; **chaque action est simulée et n’est retenue que si le résultat s’améliore** |
| F · Ma démarche | Le lien avec mon expérience Atos / Euromaster et Mersen |
| Méthode | Référentiel, coûts, génération des données, limites |

**La spécificité modélisée :** un mélange doit **mûrir** avant d’être utilisé et **périt** au-delà de sa durée de vie. Produire « pour être tranquille » coûte donc du rebut. Le simulateur rend visible l’arbitrage rupture ↔ rebut.

## Installation
Prérequis : Node.js 18 ou plus.
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 16 tests : indicateurs, conservation de la matière, capacités, scénarios, recommandations
npm run build      # vérification des types + build statique
```
Contrôle qualité navigateur (Playwright) : `npm run build && npm run preview -- --port 4174 &` puis `node qa/qa.cjs http://localhost:4174/ qa/` (24 vérifications, desktop et mobile).

## Déploiement Vercel
Projet statique, `vercel.json` fourni. Sur Vercel : *Add New → Project*, importer le dépôt, **Root Directory : `mixflow`**, *Deploy*. Aucune variable d’environnement.

## Architecture
```
src/data/config.ts   référentiel fictif : mélanges, mélangeurs, incidents, coûts
src/data/demand.ts   génération des prévisions et du réel (graine fixe)
src/data/sim.ts      moteur de simulation journalier (déterministe)
src/data/kpi.ts      indicateurs de pilotage et de prévision
src/data/rules.ts    moteur de recommandations + vérification par simulation
src/components/      modules A à F, graphiques SVG
```
Choix : Vite + React + TypeScript (site statique, aucune API), graphiques SVG faits main et redessinés à la largeur réelle de l’écran.

## Statut de l’analyse de l’offre
Le texte complet de l’offre n’a pas pu être lu (page Workday non extractible, aucune copie publique trouvée). Le prototype s’appuie sur le **titre** du poste ; les missions précises sont des hypothèses, à confronter au texte de l’annonce.
