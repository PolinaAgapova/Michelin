# Stratégie de réécriture « AI-assisted development » — proposition

> Proposition personnelle, rédigée avant le stage, sans connaissance des pratiques internes.
> Elle sert de base de discussion et sera adaptée aux outils et règles de l'entreprise.

## Principe
L'IA accélère chaque étape, mais **chaque production est relue et validée par un humain**
(et par des tests) avant d'être acceptée. On mesure l'apport de l'IA au lieu de le supposer.

## Chaîne de développement

| Étape | Rôle de l'IA | Contrôle humain / garde-fou |
|---|---|---|
| 1. Comprendre l'existant | Résumer le code legacy, cartographier les modules, extraire les règles de calcul | Validation des règles avec les analystes fonctionnels |
| 2. Spécifier | Proposer user stories + critères d'acceptation (Gherkin) | Atelier avec le PO, priorisation MoSCoW |
| 3. Tester d'abord | Générer des cas de test à partir des critères d'acceptation | Exemples recalculés à la main ; comparaison avec les résultats de l'ancienne application (tests de non-régression) |
| 4. Coder | Générer le code par petites itérations | Revue de code, tests verts obligatoires, règles de qualité (Sonar, etc.) |
| 5. Documenter | Générer README, documentation API, commentaires | Relecture |
| 6. Évaluer | — | Indicateurs ci-dessous, journal de bord |

## Indicateurs pour évaluer l'apport de l'IA
- **Productivité** : temps passé par user story (avec IA vs estimation sans IA), nombre d'itérations de prompt
- **Qualité** : % de code généré conservé sans modification, défauts trouvés en revue / en test, couverture de tests
- **Fiabilité** : nombre d'erreurs ou d'« hallucinations » détectées (règle métier inventée, donnée irréaliste, API inexistante)
- **Documentation** : complétude, exactitude après relecture
- **Ressenti équipe** : questionnaire court après chaque sprint

## Risques identifiés
- Règles métier « plausibles mais fausses » générées par l'IA → tests de non-régression contre l'ancienne application
- Confidentialité : n'utiliser que les outils IA autorisés par l'entreprise, sans exposer de données sensibles
- Dépendance : l'équipe doit comprendre et pouvoir maintenir le code produit
