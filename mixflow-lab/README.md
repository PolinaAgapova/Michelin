# MIXFLOW Lab — flux, stockage et traçabilité des mélanges de laboratoire

> **Prototype personnel de candidature — données 100 % fictives — projet non affilié à Michelin.**

Projet réalisé par Polina Agapova pour sa candidature au stage *Supply Chain / Gestion des Flux de Mélanges* (Ladoux, Clermont-Ferrand, à partir de mars 2027).
Chaque section répond à une mission de l’offre.

| Mission de l’offre | Section | Ce qu’on y trouve |
|---|---|---|
| Analyser et cartographier les flux | 1 · Flux | Cycle de vie par acteur, de la demande à la fin de vie, avec les données de chaque étape, les frictions supposées et les pistes |
| Optimiser le stockage (terrain, ergonomie) | 2 · Stockage | Plan des armoires, classes ABC, pénibilité des prélèvements, réimplantation simulée avec budget de déplacements |
| Digitaliser la gestion des stocks (Power Apps) | 3 · Application | Parcours mobile cliquable (scan, fiche, prélèvement, déplacement, fin de vie) + **kit Power Apps** |
| Traçabilité fiable sur tout le cycle de vie | 4 · Traçabilité | Historique de chaque lot, contrôles de cohérence des données |
| Déployer, communiquer, former | 5 · Déploiement | Plan sur 6 mois, indicateurs, accompagnement des utilisateurs |

## Kit Power Apps (`powerapps/`)
- `GUIDE.md` : construire l’application dans Power Apps pas à pas (formules Power Fx en notation française, alerte Power Automate).
- `MixflowLab.xlsx` : 4 tableaux Excel prêts à connecter (Melanges, Emplacements, Lots, Mouvements).
- `Etiquettes_QR.pdf` : étiquettes de lots avec QR code, vérifiées par décodage automatique.
- `generate.py` : génère ces fichiers et le jeu de données du site (`src/data/dataset.json`) ; mêmes données partout.

## Lancer le site
```bash
npm install
npm run dev     # http://localhost:5173
npm test        # 9 tests : cycle de vie, contrôles de qualité, ABC, pénibilité, réimplantation
npm run build
```
Contrôle navigateur : `npm run build && npm run preview -- --port 4175 &` puis `node qa/qa.cjs http://localhost:4175/ qa/` (26 vérifications desktop et mobile).
Déploiement Vercel : importer le dépôt, **Root Directory : `mixflow-lab`**.
