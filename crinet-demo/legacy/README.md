# Outil legacy (fictif) — exercice de migration

`CalculCoutPneu.bas` imite une macro Excel « historique » de calcul de coût pneu.
Elle est **fictive** : écrite pour l'exercice, elle ne provient d'aucune entreprise.

Elle contient volontairement **quatre pièges** typiques des outils Excel/VBA anciens.
La solution est dans [`../docs/migration-legacy.md`](../docs/migration-legacy.md) : ne pas la lire avant l'expérience.

## Expérience : l'IA trouve-t-elle les pièges ?
1. Donner **uniquement** le fichier `.bas` à chaque outil (ChatGPT, Claude…), avec la même consigne :
   > « Voici une macro VBA de calcul de coût. Extrais toutes les règles de calcul sous forme de règles de gestion numérotées,
   > puis liste les comportements risqués ou ambigus à clarifier avant une migration vers Java. »
2. Compter pour chaque outil : pièges trouvés (sur 4), règles inventées ou fausses, temps, nombre de relances.
3. Reporter les résultats dans [`../docs/retour-experience.md`](../docs/retour-experience.md).
