# MyXpert — Field to Decision · Executive summary

*Étude de cas exploratoire et indépendante, sans lien avec Michelin. Polina Agapova, novembre 2026.*

**Problème étudié.** MyXpert propose aux distributeurs de pneus commerciaux un sélecteur de produits, des spécifications, des recommandations de pression et de montage, et un diagnostic de dommage pas à pas *(fiches publiques des stores)*. Je me suis concentrée sur une question : **comment faire en sorte qu’un diagnostic commencé sur le terrain aille jusqu’à une décision utile au client, y compris pour les utilisateurs qui arrivent de MyTechXpert, appelée à être décommissionnée ?**

**Approche.** Recherche sur les sources publiques, en séparant faits, hypothèses, recommandations et données fictives. Persona et parcours AS-IS hypothétiques, prototype TO-BE cliquable. Dashboard d’analytics sur un modèle d’événements synthétique (6 000 utilisateurs fictifs, 120 jours), avec des KPI définis et testés. Priorisation RICE calculée, roadmap dépendante de la capacité et des échéances, plan de déploiement et de transition fondé sur des critères explicites.

**Enseignements, tous hypothétiques à ce stade.**
1. Les abandons de diagnostic se concentreraient sur les moments où le terrain s’impose : réseau faible à l’étape photo, interruptions.
2. Les fiches publiques de MyXpert ne mentionnent ni l’inspection de flotte, ni le suivi des pneus des clients, ni les rapports d’inspection de MyTechXpert. Si ces fonctions ne sont pas reprises, ce sont précisément des **données créées par les utilisateurs** qui sont en jeu au décommissionnement.
3. Le score RICE seul ferait glisser la migration en « plus tard » : une échéance de décommissionnement doit être arbitrée explicitement.

**Recommandations.**
- **Now** : reprise d’un diagnostic interrompu et photo facultative ajoutée plus tard, validées par un test A/B (critère : taux de diagnostics terminés ; garde-fous : part des résultats avec photo, CSAT).
- **Now** : inventaire MyTechXpert → MyXpert et six critères de décommissionnement, avant toute date.
- **Next** : un résultat de diagnostic partageable au client, après entretiens avec des distributeurs et avis juridique.
- **Later, conditionnel** : diagnostic entièrement hors ligne, seulement si l’abandon en réseau faible reste au-dessus de 15 % après le test.

**Limites.** Je n’ai pas testé l’application et n’ai accès à aucune donnée réelle. Les chiffres du dashboard sont fictifs et servent à montrer une méthode. Les règles de diagnostic du prototype sont inventées. Les estimations d’impact et d’effort sont les miennes.

**Prochaines étapes à valider avec l’équipe.**
1. Confronter les hypothèses aux données réelles : abandons par étape, rétention selon l’origine.
2. Établir l’inventaire réel des fonctions reprises de MyTechXpert.
3. Observer 5 à 8 techniciens sur le terrain.
4. Remplacer mes estimations RICE par celles de l’équipe, puis recalculer la roadmap.
