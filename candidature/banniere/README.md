# Bannière LinkedIn — « Entre les données et les gens. »

Bannière codée en HTML/CSS/SVG (aucune image générée) : tout est vectoriel et modifiable.

| Fichier | Rôle |
|---|---|
| `banniere-finale.html` | **Version finale** (direction A retravaillée) |
| `a-atlas.html` | Direction A — Atlas céleste |
| `b-diffusion.html` | Direction B — Diffusion (une grille de données devient un ciel) |
| `c-orbites.html` | Direction C — Orbites sur ivoire |
| `lib.js` | Fonctions SVG partagées (étoiles, champ d'étoiles déterministe) |
| `render.js` | Export PNG |

## Exporter
Prérequis : Node.js + Playwright (`npm i playwright`), connexion internet (polices Google Fonts).
```bash
node render.js banniere-finale.html banniere.png 1   # exactement 1584 × 396 px
node render.js banniere-finale.html banniere@2x.png 2 # 3168 × 792 px, plus net
```

## Modifier
- **Textes** : bloc `<div class="txt">` dans le HTML.
- **Couleurs et polices** : variables dans `:root` (`--night`, `--ivory`, `--champagne`, `--emerald`…).
- **Parcours** : tableau `cities` (vraies coordonnées lon/lat, projetées par la fonction `P`).
- **Étoiles** : la graine `seed` de `field(...)` change la disposition ; les zones `avoid` gardent le texte lisible.

## Contraintes respectées
- Zone de la photo de profil (bas gauche, ≈ x < 470 px et y > 190 px) : aucun texte essentiel.
- Texte principal à partir de x = 556 px ; titre ≥ 74 px et sous-titre 31 px pour rester lisibles sur mobile (affichage ≈ 390 px de large).

## Détails
- Les trois villes sont placées d'après leurs **vraies coordonnées** ; la trajectoire pointillée part de Clermont-Ferrand et rejoint la signature.
- Le petit quadrilatère à droite est **Equuleus, « le petit cheval »**, dont l'étoile principale s'appelle Kitalpha : la seule allusion à l'équitation.
- L'axe gradué en bas se dissout progressivement en étoiles : les données deviennent constellation.
