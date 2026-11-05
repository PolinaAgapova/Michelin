const BRIDGES: [string, string][] = [
  ['Analyser la fiabilité des prévisions et leurs écarts avec le réel (forecast accuracy, MAPE, écart)', 'Module C : biais, WAPE, MAPE, écart cumulé, et leurs conséquences sur le stock'],
  ['Suivre des KPI et les rendre utiles aux équipes', 'Module A : chaque indicateur a une définition, une formule et une lecture'],
  ['Exploiter des données SAP et Slim4 dans Power BI et Excel', 'Un modèle de données explicite : stocks, besoins, ordres, capacités, incidents'],
  ['Comparer plusieurs périmètres (France, Italie, Suisse)', 'Filtres par atelier, famille et criticité ; comparaison de scénarios'],
  ['Travailler avec la Supply Chain, l’IT et le métier', 'Recommandations lisibles, hypothèses visibles, points à valider avec le métier'],
  ['Mersen : fiabilité et structuration des données produits', 'Un référentiel des mélanges (maturation, durée de vie, criticité) dont dépendent tous les calculs'],
];

export function Parcours() {
  return (
    <>
      <div className="ph">
        <div>
          <div className="kicker">Module F · Ma démarche</div>
          <h1>Pourquoi ce projet ? De mon expérience Supply Chain à un nouveau défi industriel</h1>
        </div>
      </div>
      <div className="story">
        <div className="stack" style={{ gap: 16 }}>
          <p className="muted">Je suis en Master 2 Management de l’Innovation et Transformation Numérique à l’IAE Clermont Auvergne, après un BUT Science des Données. De février à août 2026, j’ai effectué mon stage chez Atos, sur un projet Supply Chain pour Euromaster.</p>
          <p className="muted">J’y ai analysé la fiabilité des prévisions : écarts entre prévu et réel, KPI comme la forecast accuracy et le MAPE, données issues de SAP et de Slim4, reportings Power BI et Excel, sur plusieurs périmètres européens, avec des interlocuteurs Supply Chain, IT et métier.</p>
          <p className="muted">Sur un périmètre comparable de mon analyse, j’ai par exemple mesuré une précision de prévision de 93,76 % et étudié un écart cumulé de −239 unités. Ce sont des mesures issues de mon analyse, pas des gains attribuables à mon intervention.</p>
          <p className="muted">Je n’ai jamais travaillé sur la fabrication des mélanges. Ce prototype est ma façon d’apprendre ce sujet : comprendre ses contraintes propres (maturation, durée de vie, capacité des mélangeurs), puis voir comment mes compétences peuvent s’y transférer.</p>
          <p className="quote">« Chez Euromaster, j’ai appris à analyser les écarts entre les prévisions et la réalité. Avec ce projet, j’ai voulu explorer une étape supplémentaire : comment transformer ces analyses en décisions opérationnelles pour mieux piloter les flux industriels. »</p>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <div className="bridge" aria-hidden="true"><span className="label">Ce que j’ai fait</span><span /><span className="label">Ce que ce prototype en fait</span></div>
          {BRIDGES.map(([a, b]) => <div className="bridge" key={a}><div>{a}</div><div className="arrow">→</div><div>{b}</div></div>)}
          <div className="panel small muted" style={{ marginTop: 10 }}>
            <b style={{ color: 'var(--ink)' }}>Ce que je ne sais pas encore.</b> Les vraies règles de planification du site, les contraintes de recette et de changement de série, les données réelles. C’est ce que je voudrais apprendre avec l’équipe : le modèle est conçu pour être corrigé.
          </div>
          <p className="small muted">Prototype réalisé avec l’aide d’outils d’IA pour le code ; la problématique, les indicateurs, la logique du modèle et les arbitrages sont les miens.</p>
        </div>
      </div>
    </>
  );
}
