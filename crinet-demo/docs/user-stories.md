# User stories — prototype « coût industriel pneumatique »

> Périmètre volontairement réduit, inspiré de la description publique de CRINET dans l'offre de stage
> (« calculer, simuler et analyser les coûts industriels des pneumatiques »).
> Je n'ai pas accès à l'application réelle : les règles ci-dessous sont des **hypothèses de travail**,
> à confronter au Product Owner et aux analystes fonctionnels.
>
> Méthode : première version des stories générée avec Claude Code à partir de l'offre,
> puis relue, reformulée et priorisée par moi (MoSCoW).

## Personas
- **Ingénieur·e R&D** : conçoit un nouveau pneu et veut connaître son coût dès la phase de conception.
- **Contrôleur·se de gestion industriel** : vérifie les hypothèses de coût et compare les scénarios.
- **Acheteur·se matières premières** : veut mesurer l'effet d'une hausse de prix fournisseur.

---

## EPIC 1 — Calculer

### US-01 · Calculer le coût de revient d'un pneu — *Must*
**En tant qu'** ingénieur·e R&D, **je veux** obtenir le coût de revient d'un pneu à partir de sa nomenclature
et de sa gamme de fabrication, **afin de** comparer des choix de conception sur un critère économique.

**Règles de gestion**
- RG1 Matières = Σ (kg × prix €/kg)
- RG2 Main d'œuvre = Σ étapes (temps de cycle en h × taux horaire × nb opérateurs)
- RG3 Machine = Σ étapes (temps de cycle en h × coût horaire machine)
- RG4 Énergie = Σ étapes (kWh × prix €/kWh)
- RG5 Rebut = coût direct × r / (1 − r) (le coût des pneus rebutés est porté par les pneus bons)
- RG6 Frais de structure = taux × (main d'œuvre + machine)
- RG7 Arrondi à 2 décimales uniquement sur les valeurs affichées

**Critères d'acceptation**
```gherkin
Scénario: calcul nominal (exemple calculé à la main)
  Étant donné un pneu de 2 kg de matière à 1,50 €/kg
  Et une étape de 6 min, machine 60 €/h, MO 30 €/h, 2 opérateurs, 2 kWh
  Et un prix énergie de 0,20 €/kWh, des frais de structure de 50 % et un rebut de 20 %
  Quand je calcule le coût
  Alors matières = 3,00 €, MO = 6,00 €, machine = 6,00 €, énergie = 0,40 €
  Et rebut = 3,85 €, frais de structure = 6,00 €, total = 25,25 €

Scénario: matière inconnue
  Étant donné une nomenclature qui référence une matière absente du référentiel
  Quand je calcule le coût
  Alors le calcul est refusé avec un message explicite
```
✅ Implémentée — `CostCalculatorTest`

### US-02 · Visualiser la décomposition du coût — *Must*
**En tant que** contrôleur·se de gestion, **je veux** voir la part de chaque poste (matières, MO, machine,
énergie, rebut, frais) et le détail par matière et par étape, **afin de** comprendre d'où vient le coût.

- CA1 Le total et chaque poste sont affichés en € et en %
- CA2 Le détail par ligne de nomenclature et par étape est consultable (traçabilité du calcul)

✅ Implémentée — API `GET /api/tires/{code}/cost` + écran

---

## EPIC 2 — Simuler

### US-03 · Simuler une variation de prix — *Must*
**En tant qu'** acheteur·se, **je veux** appliquer une variation en % au prix d'une famille de matières,
de l'énergie ou du taux horaire, **afin de** mesurer l'impact sur le coût unitaire.

```gherkin
Scénario: hausse du caoutchouc naturel
  Étant donné le pneu de US-01 sans rebut (coût de référence 21,40 €)
  Quand je simule +10 % sur le caoutchouc naturel
  Alors le coût matières passe à 3,30 €
  Et l'écart est de +0,30 € soit +1,40 %

Scénario: hausse du taux horaire
  Quand je simule +10 % sur le taux horaire main d'œuvre
  Alors l'écart est de +0,90 € (0,60 € de MO + 0,30 € de frais de structure induits)

Scénario: variation invalide
  Quand je saisis une baisse de 100 % ou plus
  Alors la simulation est refusée (HTTP 400)
```
- CA La simulation ne modifie jamais les données de référence

✅ Implémentée — `SimulationServiceTest`, API `POST /api/tires/{code}/simulate`

### US-04 · Enregistrer et comparer des scénarios — *Should*
**En tant que** contrôleur·se de gestion, **je veux** nommer, sauvegarder et comparer plusieurs scénarios côte à côte.
⏳ Non implémentée — nécessite une persistance (base de données)

---

## EPIC 3 — Analyser

### US-05 · Identifier les inducteurs de coût les plus sensibles — *Should*
**En tant qu'** ingénieur·e R&D, **je veux** voir l'impact d'une variation de ±X % de chaque inducteur,
classé du plus au moins influent, **afin de** savoir où concentrer les efforts d'optimisation.

- CA1 Inducteurs : chaque famille de matière présente, énergie, taux horaire MO, coût horaire machine, taux de rebut
- CA2 Tri par amplitude décroissante (diagramme « tornado »)
- CA3 X est paramétrable, strictement entre 0 et 100 %

✅ Implémentée — API `GET /api/tires/{code}/sensitivity?variation=0.10`

### US-06 · Comparer deux pneus — *Could*
⏳ Non implémentée

---

## EPIC 4 — Gérer les référentiels

### US-07 · Mettre à jour les prix matières — *Should*
### US-08 · Importer une nomenclature depuis un fichier (CSV / Excel) — *Could*
### US-09 · Historiser les versions de coûts — *Could*
⏳ Non implémentées : ce sont les points où l'application réelle dépend le plus des systèmes existants
(ERP, PLM). C'est le type de question à clarifier en atelier avec le PO.

## Questions ouvertes pour le Product Owner
1. Quelle est la méthode officielle de prise en compte du rebut et des frais de structure ?
2. Les coûts sont-ils calculés par usine / par pays (taux horaires, énergie) ?
3. D'où viennent les données de référence aujourd'hui (ERP, PLM, fichiers) ?
4. Quelles fonctionnalités de l'application actuelle sont réellement utilisées ?
