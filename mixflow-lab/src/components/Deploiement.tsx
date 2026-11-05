import { DATA, lifecycle, qualityChecks } from '../data/lab';
import { pct } from './charts';

const PLAN = [
  { m: 'Mars', t: 'Comprendre', items: ['Accueil, sécurité, rencontre de l’équipe de 18 personnes', 'Observation : suivre 3 à 5 lots de bout en bout', 'Entretiens magasin, atelier, laboratoires'], out: 'Cartographie AS-IS validée' },
  { m: 'Avril', t: 'Mesurer et agir vite', items: ['Inventaire ponctuel : fiabilité réelle du stock', 'Sortie des lots périmés, règle FEFO', 'Choix des indicateurs avec le tuteur'], out: 'Premiers gains visibles, sans outil' },
  { m: 'Mai', t: 'Concevoir', items: ['Règles de rangement (conservation, rotation, ergonomie)', 'Maquette Power Apps testée avec 2 ou 3 utilisateurs', 'Choix de la source de données avec l’informatique'], out: 'Application validée sur le papier' },
  { m: 'Juin', t: 'Piloter', items: ['Pilote sur une armoire et un laboratoire', 'Étiquetage QR des lots du pilote', 'Ajustements chaque semaine selon les retours'], out: 'Pilote mesuré' },
  { m: 'Juillet', t: 'Déployer et former', items: ['Généralisation progressive', 'Sessions de 20 minutes au poste, fiche « 3 gestes »', 'Référents dans chaque laboratoire'], out: 'Utilisateurs autonomes' },
  { m: 'Août', t: 'Ancrer', items: ['Bilan des indicateurs avant / après', 'Documentation et transfert', 'Recommandations pour la suite'], out: 'Une organisation qui tient sans moi' },
];

export function Deploiement() {
  const lc = lifecycle(DATA);
  const anomalies = qualityChecks(DATA).length;
  const KPIS = [
    ['Lots périmés encore en stock', `${lc.expiredInStock}`, '0', 'traçabilité'],
    ['Lots terminés par péremption', pct(lc.expiryRate), 'en baisse', 'perte de matière'],
    ['Anomalies de données', `${anomalies}`, 'proche de 0', 'fiabilité'],
    ['Mouvements saisis dans l’application', '—', '> 95 %', 'adoption'],
    ['Temps pour retrouver un lot', 'à mesurer', '< 1 min', 'terrain'],
  ];
  return (
    <>
      <div className="ph">
        <div>
          <div className="kicker">Mission 05 · Déployer, communiquer, former</div>
          <h1>Un outil ne sert à rien si personne ne l’utilise</h1>
          <p>Comment je découperais six mois de stage, de mars à août 2027, pour qu’il reste quelque chose après mon départ.</p>
        </div>
        <span className="hypo">Proposition à ajuster avec le tuteur</span>
      </div>
      <div className="grid3">
        {PLAN.map((p, i) => (
          <section key={p.m} className="panel">
            <header><h3><span className="mono" style={{ color: 'var(--data)', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>{p.m} · {p.t}</h3></header>
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>{p.items.map(x => <li key={x}>{x}</li>)}</ul>
            <p className="small" style={{ marginTop: 10, color: 'var(--data)' }}>→ {p.out}</p>
          </section>
        ))}
      </div>
      <div className="grid2 mt">
        <section className="panel">
          <header><h3>Indicateurs de réussite</h3><span className="label">valeur actuelle (fictive) → cible</span></header>
          <div className="tbl"><table style={{ minWidth: 0 }}>
            <thead><tr><th>Indicateur</th><th className="n">Aujourd’hui</th><th className="n">Cible</th><th>Pour mesurer</th></tr></thead>
            <tbody>{KPIS.map(k => <tr key={k[0]}><td>{k[0]}</td><td className="n">{k[1]}</td><td className="n">{k[2]}</td><td className="small muted">{k[3]}</td></tr>)}</tbody>
          </table></div>
        </section>
        <section className="panel">
          <header><h3>Accompagner les utilisateurs</h3></header>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li><b style={{ color: 'var(--ink)' }}>Associer avant d’imposer :</b> les utilisateurs testent la maquette avant le développement.</li>
            <li><b style={{ color: 'var(--ink)' }}>Former au poste,</b> 20 minutes, avec un vrai lot à scanner, plutôt qu’une présentation en salle.</li>
            <li><b style={{ color: 'var(--ink)' }}>Une fiche « 3 gestes »</b> affichée près des armoires : scanner, saisir, valider.</li>
            <li><b style={{ color: 'var(--ink)' }}>Un référent par laboratoire</b> pour les questions du quotidien.</li>
            <li><b style={{ color: 'var(--ink)' }}>Montrer les résultats :</b> afficher chaque mois les indicateurs, pour que l’effort de saisie ait un sens.</li>
          </ul>
          <p className="small" style={{ marginTop: 10 }}>J’ai enseigné le français à des apprenants russophones : expliquer simplement et adapter le rythme aux personnes, c’est déjà une pratique pour moi.</p>
        </section>
        <section className="panel span2">
          <header><h3>Risques et parades</h3></header>
          <div className="tbl"><table>
            <thead><tr><th>Risque</th><th>Parade</th></tr></thead>
            <tbody>
              <tr><td>La saisie est vécue comme une contrainte de plus</td><td className="small muted">Deux gestes maximum ; bénéfice visible pour l’utilisateur (retrouver un lot, savoir ce qui reste)</td></tr>
              <tr><td>Réseau ou téléphone indisponible près des armoires</td><td className="small muted">Vérifier la couverture dès le mois 1 ; prévoir une tablette fixe si besoin</td></tr>
              <tr><td>Données initiales fausses</td><td className="small muted">Inventaire de départ avant la mise en service ; contrôles de cohérence réguliers</td></tr>
              <tr><td>Dépendance à la stagiaire</td><td className="small muted">Documentation, référents formés, transfert à un propriétaire de l’outil avant la fin du stage</td></tr>
            </tbody>
          </table></div>
        </section>
      </div>
    </>
  );
}
