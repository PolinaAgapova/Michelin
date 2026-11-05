const BRIDGES: [string, string][] = [
  ['Mersen : gestion et contrôle qualité des données produits (PIM, ETIM), automatisation Excel/VBA', 'Un référentiel des mélanges et des emplacements fiable, et des contrôles de cohérence du stock'],
  ['Atos · Euromaster : KPI, analyse des écarts entre prévu et réel, données SAP, Power BI', 'Des indicateurs de cycle de vie qui mesurent la perte de matière et la fiabilité du stock'],
  ['IAE : cas PLM, entretiens avec bureau d’études, méthodes et production', 'La cartographie AS-IS d’un cycle de vie, construite avec les acteurs'],
  ['IAE : conduite du changement, gestion de projet', 'Un plan de déploiement avec pilote, formation et indicateurs d’adoption'],
  ['Enseignement du français (service civique)', 'Former les utilisateurs au poste, simplement'],
];

export function Parcours() {
  return (
    <>
      <div className="ph"><div><div className="kicker">Ma démarche</div><h1>Pourquoi ce projet</h1></div></div>
      <div className="story">
        <div className="stack" style={{ gap: 16 }}>
          <p className="muted">Je suis en Master 2 Management de l’Innovation et Transformation Numérique à l’IAE Clermont Auvergne, après un BUT Science des Données. Le stage commence en mars 2027 : c’est exactement le moment où ma formation me permet de passer à temps plein en entreprise.</p>
          <p className="muted">L’offre parle de flux, de stockage, de traçabilité et de Power Apps. Plutôt que de l’écrire dans une lettre, j’ai voulu essayer : cartographier un cycle de vie, regarder où la matière se perd, et construire l’outil qui permettrait de le suivre.</p>
          <p className="muted">Je n’ai jamais travaillé dans un laboratoire de mélanges, et je n’ai pas encore utilisé Power Apps : j’ai préparé le modèle de données et les formules pour pouvoir m’y mettre dès le début du stage. Ce prototype est ma façon d’apprendre le sujet avant d’arriver, et d’en parler concrètement.</p>
          <p className="quote">« Une traçabilité fiable, ce n’est pas d’abord un outil : ce sont des gestes simples, faits par tout le monde, et des données que l’on contrôle. L’outil vient ensuite les rendre faciles. »</p>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <div className="bridge" aria-hidden="true"><span className="label">Ce que j’ai fait</span><span /><span className="label">Ce que j’en fais ici</span></div>
          {BRIDGES.map(([a, b]) => <div className="bridge" key={a}><div>{a}</div><div className="arrow">→</div><div>{b}</div></div>)}
          <p className="small muted" style={{ marginTop: 10 }}>Prototype réalisé avec l’aide d’outils d’IA pour le code ; l’analyse, les règles de gestion et les choix sont les miens.</p>
        </div>
      </div>
    </>
  );
}
