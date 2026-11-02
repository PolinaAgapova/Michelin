# Journal de bord & retour d'expérience

Ce prototype a été produit avec **Claude Code** (assistant de développement IA).
Ce journal note honnêtement ce que l'IA a fait, ce qui a dû être corrigé, et ce que j'en retiens.

## Session 1 — génération initiale (novembre 2026)

**Demande** : à partir de l'offre de stage, produire un prototype Java/Spring Boot de calcul,
simulation et analyse du coût d'un pneu, avec user stories, tests et documentation.

**Produit en une session** : ~15 classes Java, 17 tests automatisés (JUnit 5 / MockMvc), une interface web,
9 user stories, ce journal.

### Erreurs de l'IA détectées et corrigées pendant la session
| # | Problème | Comment il a été détecté | Leçon |
|---|---|---|---|
| 1 | **Données irréalistes** : dans la 1re version, le coût machine dépassait le coût matières, alors que les matières premières représentent généralement la plus grosse part du coût d'un pneu | Lecture critique des résultats chiffrés (contrôle de vraisemblance), pas par les tests | Des tests verts ne garantissent pas un résultat métier crédible : il faut un regard métier |
| 2 | **Inducteur oublié** : l'analyse de sensibilité ignorait le coût horaire machine, alors que c'était le poste le plus sensible | Comparaison entre la décomposition du coût et le tornado | L'IA peut produire un résultat cohérent en apparence mais incomplet |
| 3 | **Libellés techniques affichés à l'utilisateur** (« Prix SYNTHETIC_RUBBER ») | Revue visuelle de l'écran | Prévoir des critères d'acceptation sur l'ergonomie, pas seulement sur le calcul |
| 4 | **Commande d'outillage incorrecte** (arrêt du serveur qui interrompait sa propre session) | Échec d'exécution | Les erreurs ne sont pas seulement dans le code : l'environnement compte aussi |

### Ce qui a bien fonctionné
- Passage très rapide de la description textuelle de l'offre à une structure de code propre (modèle / service / API)
- Tests écrits à partir d'exemples **calculés à la main** et documentés dans les user stories : la règle métier est vérifiable par un non-développeur
- Utilisation de `BigDecimal` pour les montants (pas d'erreurs d'arrondi des `double`)

## Session 2 — appropriation (à compléter par moi)
- [ ] Relire chaque classe et expliquer chaque règle de calcul sans l'aide de l'IA
- [ ] Recalculer à la main le coût du pneu TC-205
- [ ] Implémenter **moi-même** US-04 (sauvegarde de scénarios), avec l'IA en assistant et non en auteur
- [ ] Mesurer : temps passé, nombre de prompts, % de code conservé, erreurs trouvées

| Date | Tâche | Temps | Prompts | Code IA conservé | Erreurs trouvées | Remarques |
|---|---|---|---|---|---|---|
| | | | | | | |

## Session 3 — migration d'un outil legacy (novembre 2026)
Voir [migration-legacy.md](migration-legacy.md). Macro VBA fictive avec 4 pièges, portage fidèle en Java,
tests de non-régression qui expliquent chaque écart. Résultat principal : une seule règle (assiette des frais
de structure) explique ~8 % d'écart de coût. C'est une **décision métier**, pas un bug de code.

### Expérience : l'IA trouve-t-elle les pièges ? (réalisée le 2 novembre 2026)
Même consigne, macro seule, nouvelle conversation pour chaque outil (voir [`legacy/README.md`](../legacy/README.md)).
Correction par comparaison avec la liste des pièges P1–P4 de [migration-legacy.md](migration-legacy.md).

| Piège | ChatGPT | Claude |
|---|---|---|
| P1 Arrondi bancaire VBA | ✅ identifié (R-02) | ✅ identifié (n° 8) |
| P2 Formule du rebut `r` au lieu de `r / (1 − r)` | ✅ identifié (R-03) | ✅ identifié (n° 11) |
| P3 Frais de structure sur la MO seule | 🟡 règle correctement extraite (RG-14) mais **non signalée** comme question à valider | ✅ signalée comme question pour le contrôle de gestion (n° 13) |
| P4 Matière introuvable = 0 € silencieux | ✅ identifié (R-01) | ✅ identifié (n° 1) |
| **Score** | **3,5 / 4** | **4 / 4** |
| Règles fausses ou inventées | aucune règle fausse ; a présenté le module comme faisant partie de « CRINET » alors que le fichier le déclare fictif | aucune |
| Exemple chiffré | exemple fourni et recalculé à la main : correct (76,54 €) | pas d'exemple, propose un jeu de tests de référence |
| Temps / relances | non mesuré / 0 | non mesuré / 0 |

**Risques non prévus trouvés par les deux outils** (absents de ma liste de pièges, et pertinents) :
lignes en double additionnées deux fois, feuille `Resultat` jamais vidée, `Find` qui dépend des derniers réglages de la boîte
« Rechercher » d'Excel, absence de contrôle des unités. Claude ajoute : sensibilité à la casse différente entre `=` et `VLookup`,
calculs en `Double`, dépendance au classeur actif, rebut non appliqué aux frais de structure.

**Ce que j'en retiens**
1. Les deux outils sont très bons pour repérer les risques **techniques**, et vont au-delà de ce que j'avais prévu.
2. Le piège le plus coûteux (P3, ~8 % du coût) est une **question métier** : un outil l'a décrit sans le questionner.
   La relecture humaine reste indispensable sur ce qui a un impact économique.
3. Limites de l'expérience : un seul essai par outil ; les deux ont lu le fichier depuis le dépôt public, où la solution
   existe aussi ; les pièges ont été écrits avec Claude, ce qui peut favoriser cet outil. À refaire sur un code inconnu des deux.

## Premières conclusions
1. L'IA est très efficace pour **structurer** (code, user stories, documentation).
2. Elle est **peu fiable sur la vraisemblance métier** : la valeur ajoutée humaine se déplace vers la
   spécification, la vérification et le dialogue avec les experts métier.
3. Les **tests basés sur des exemples métier** sont le meilleur garde-fou : ils rendent l'IA « contrôlable ».
