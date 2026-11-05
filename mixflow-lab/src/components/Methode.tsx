import { DATA, LEVEL_COST, ZONE_FACTOR } from '../data/lab';

export function Methode() {
  return (
    <>
      <div className="ph"><div><div className="kicker">Méthode</div><h1>Données, hypothèses et limites</h1><p>Rien ici ne provient de Michelin. Les données sont fictives et générées par un script, identique pour ce site et pour l’application Power Apps.</p></div></div>
      <div className="grid2">
        <section className="panel"><header><h3>Jeu de données</h3></header><ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>{DATA.melanges.length} mélanges fictifs (durée de vie de 30 à 120 jours, froid ou ambiant)</li>
          <li>{DATA.emplacements.length} emplacements : 2 armoires froides et 2 racks ambiants, 5 niveaux, 4 positions, 4 bacs par position</li>
          <li>{DATA.lots.length} lots et {DATA.mouvements.length} mouvements, jusqu’au {DATA.ref}</li>
          <li>Anomalies injectées volontairement : 2 lots froids sur un rack ambiant, 2 restes incohérents avec l’historique</li>
        </ul></section>
        <section className="panel"><header><h3>Hypothèse de pénibilité</h3></header><ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Coût par niveau : {Object.entries(LEVEL_COST).map(([k, v]) => `N${k} = ${v}`).join(' · ')}</li>
          <li>Facteur de distance : {Object.entries(ZONE_FACTOR).map(([k, v]) => `${k} × ${v}`).join(' · ')}</li>
          <li>Pénibilité = Σ prélèvements des 60 derniers jours × coût de l’emplacement</li>
          <li>À valider avec un ergonome et avec les gestes réels (poids des bacs, fréquence)</li>
        </ul></section>
        <section className="panel"><header><h3>Indicateurs</h3></header><ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Lots terminés par péremption = lots détruits pour péremption / lots terminés (détruits + épuisés)</li>
          <li>Matière prélevée = Σ prélèvements / Σ quantités fabriquées</li>
          <li>Fiabilité du stock = lots en stock sans anomalie / lots en stock</li>
          <li>Classes ABC sur les prélèvements des 60 derniers jours (80 % / 15 % / 5 %)</li>
        </ul></section>
        <section className="panel"><header><h3>Limites</h3></header><ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Le processus réel (demande, fabrication, circuits) est supposé, à cartographier sur le terrain</li>
          <li>Les durées de vie et conditions de conservation sont des ordres de grandeur, pas des données réelles</li>
          <li>La réimplantation est un algorithme glouton simple : il donne une bonne liste de départ, pas un optimum</li>
          <li>Le prototype mobile ne stocke rien ; l’application Power Apps, elle, écrit dans Excel Online</li>
        </ul></section>
      </div>
    </>
  );
}
