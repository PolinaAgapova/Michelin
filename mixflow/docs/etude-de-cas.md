# MIXFLOW — étude de cas

*Prototype personnel de candidature. Données 100 % fictives. Projet non affilié à Michelin.*
*Polina Agapova, novembre 2026.*

## Contexte
Dans la fabrication pneumatique, les mélanges de caoutchouc sont produits par des mélangeurs puis consommés par des ateliers comme l’extrusion ou le calandrage. Je n’ai pas eu accès au texte complet de l’offre : je pars de son titre, *Gestion des Flux de Mélanges*, et de contraintes générales du secteur, à valider avec le métier.

## Problématique
**Comment anticiper les ruptures de mélanges sans produire trop, alors que chaque mélange doit mûrir avant usage et devient inutilisable au-delà de sa durée de vie ?**
Le stock protège contre la rupture, mais il expose au rebut. La prévision, la capacité des mélangeurs et les aléas (pannes, maintenance) déplacent cet équilibre chaque jour.

## Méthode
1. **Modéliser** un environnement fictif : 6 mélanges (maturation 1 à 2 jours, durée de vie 4 à 10 jours, criticité A/B/C), 3 mélangeurs aux compatibilités partielles, 3 ateliers consommateurs.
2. **Générer** 28 jours d’historique et 14 jours de projection, avec deux biais de prévision injectés (une sous-prévision, une sur-prévision), une panne passée et une maintenance planifiée absente du plan.
3. **Simuler** jour par jour : rebut des lots périmés, service FIFO des lots mûrs, besoin de fabrication par recomplètement jusqu’à une cible, allocation de la capacité par priorité, réalisation selon la disponibilité réelle.
4. **Mesurer** : taux de service, jours de rupture, couverture, utilisation, plan vs réalisé, respect des délais, coût estimé ; biais, WAPE, MAPE et écart cumulé pour la prévision.
5. **Recommander** avec 4 règles explicites, puis **vérifier chaque action par simulation**.

## Résultats simulés (données fictives)
- La **maintenance planifiée du mélangeur M1**, absente du plan, crée une rupture projetée sur le Flanc A, aggravée par une **sous-prévision de 10 %** de ce mélange.
- La **sur-prévision de 15 %** de la Bande de roulement B produit du **rebut** : la cible de stock dépasse ce que la durée de vie permet d’écouler.
- Une **hausse de 20 % des besoins non anticipée** fait chuter le taux de service sous 90 % : les mélangeurs sont déjà chargés à près de 90 %.
- Actions retenues après simulation : anticiper un ordre de Flanc A avant la maintenance ; corriger provisoirement les deux prévisions biaisées ; réduire le stock de sécurité de la Bande de roulement B. Chacune améliore le taux de service ou réduit le coût dans la simulation.
- **Action écartée :** prioriser les mélanges critiques quand un mélangeur est saturé. L’intuition est séduisante, mais la simulation montre qu’elle prive les autres mélanges de capacité et fait passer le taux de service d’environ 99 % à 92 %.

## Ce que j’en retiens
- Une erreur de prévision n’a pas le même coût dans les deux sens : sous-prévoir crée des ruptures, sur-prévoir crée du rebut quand le produit a une durée de vie.
- Un indicateur n’est utile que s’il mène à une action, et une action n’est crédible que si on peut en estimer l’effet.
- Les règles « de bon sens » doivent être testées avant d’être appliquées.

## Limites
Pas de mélanges maîtres ni de passes successives, pas de changements de recette, matières premières supposées disponibles, planificateur volontairement simple (il fait osciller le stock), coûts et paramètres fictifs.

## Perspectives, à construire avec l’équipe
1. Remplacer le référentiel fictif par les vraies règles : maturation, durée de vie, compatibilités, cadences.
2. Brancher le modèle sur les données réelles d’ordres et de stocks.
3. Mesurer l’écart entre le plan et le réalisé sur quelques semaines pour calibrer les aléas.
4. Choisir avec les planificateurs les 2 ou 3 alertes qui leur seraient réellement utiles au quotidien.
