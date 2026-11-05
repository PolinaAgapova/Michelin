import { DATA, lifecycle, qualityChecks, reslot } from '../data/lab';
import { fmt, pct } from './charts';

const go = (r: string) => { location.hash = r; };

export function Synthese() {
  const lc = lifecycle(DATA);
  const q = qualityChecks(DATA);
  const rs = reslot(DATA, 10);
  const missions = [
    { k: '01', m: 'Analyser et cartographier les flux', r: 'flux', what: 'Cycle complet, de la commande à la fin de vie, avec les données de chaque étape.' },
    { k: '02', m: 'Optimiser le stockage (terrain, ergonomie)', r: 'stockage', what: 'Plan des armoires, classes ABC, pénibilité des prélèvements, réimplantation simulée.' },
    { k: '03', m: 'Digitaliser la gestion des stocks (Power Apps)', r: 'application', what: 'Parcours mobile scan → fiche → prélèvement, reconstruit dans Power Apps.' },
    { k: '04', m: 'Traçabilité fiable sur tout le cycle de vie', r: 'tracabilite', what: 'Historique de chaque lot et contrôles de cohérence des données.' },
    { k: '05', m: 'Déployer, communiquer, former', r: 'deploiement', what: 'Plan sur 6 mois, kit de formation, indicateurs d’adoption.' },
  ];
  return (
    <>
      <div className="ph">
        <div>
          <div className="kicker">Synthèse</div>
          <h1>Des mélanges commandés pour être testés, et qui finissent périmés</h1>
          <p>Une exploration, sur des données fictives, des flux de mélanges d’un environnement de laboratoire : où va la matière, où elle se perd, et ce qu’un outil simple pourrait changer.</p>
        </div>
        <span className="hypo">Données fictives · hypothèses à valider sur le terrain</span>
      </div>

      <div className="kpis">
        <div className="kpi bad"><span className="label">Lots terminés par péremption</span><span className="v">{pct(lc.expiryRate)}</span><span className="d">{lc.destroyedExpiry} lots sur {lc.ended} terminés</span></div>
        <div className="kpi warn"><span className="label">Matière réellement prélevée</span><span className="v">{pct(lc.usedShare)}</span><span className="d">{fmt(lc.kgUsed)} kg sur {fmt(lc.kgMade)} kg fabriqués</span></div>
        <div className="kpi bad"><span className="label">Périmés encore en stock</span><span className="v">{lc.expiredInStock} lots</span><span className="d">{fmt(lc.kgExpiredInStock)} kg qui occupent des emplacements</span></div>
        <div className="kpi ok"><span className="label">Pénibilité avec 10 déplacements</span><span className="v">−{pct(1 - rs.after / rs.before)}</span><span className="d">en réimplantant les lots les plus prélevés</span></div>
      </div>

      <section className="panel mt">
        <header><h3>Où va la matière fabriquée</h3><span className="label">{fmt(lc.kgMade)} kg sur la période</span></header>
        {(() => {
          const valid = lc.kgMade - lc.kgUsed - lc.kgDestroyed - lc.kgExpiredInStock;
          const parts = [
            { l: 'Prélevée par les laboratoires', v: lc.kgUsed, c: 'var(--data)' },
            { l: 'Encore utilisable en stock', v: valid, c: 'var(--data-2)' },
            { l: 'Périmée mais encore en stock', v: lc.kgExpiredInStock, c: 'var(--amber)' },
            { l: 'Détruite', v: lc.kgDestroyed, c: 'var(--bad)' },
          ];
          return <>
            <div className="massbar" role="img" aria-label={parts.map(p => `${p.l} : ${fmt(p.v)} kg`).join(', ')}>{parts.map(p => <i key={p.l} style={{ width: `${(p.v / lc.kgMade) * 100}%`, background: p.c }} />)}</div>
            <div className="legend" style={{ marginTop: 10 }}>{parts.map(p => <span key={p.l}><i style={{ background: p.c, height: 10, width: 10 }} />{p.l} · {fmt(p.v)} kg ({pct(p.v / lc.kgMade)})</span>)}</div>
          </>;
        })()}
        <p className="foot">Un mélange de laboratoire est souvent fabriqué en plus grande quantité que ce que les essais consomment. Toute la question est de savoir si l’écart est un choix (marge pour refaire un essai) ou une perte qu’on pourrait réduire.</p>
      </section>

      <h2 className="label" style={{ margin: '22px 0 10px' }}>Les missions du stage, et où les explorer ici</h2>
      <div className="stack">
        {missions.map(x => (
          <button key={x.k} type="button" onClick={() => go(x.r)} className="panel" style={{ textAlign: 'left', cursor: 'pointer', display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) auto', gap: 14, alignItems: 'center', color: 'inherit', font: 'inherit' }}>
            <span style={{ font: '600 22px var(--display)', color: 'var(--data)' }}>{x.k}</span>
            <span><b>{x.m}</b><br /><span className="small muted">{x.what}</span></span>
            <span className="mono small" style={{ color: 'var(--data)' }}>→</span>
          </button>
        ))}
      </div>
      <p className="foot" style={{ marginTop: 14 }}>{q.length} anomalies de données détectées sur {lc.inStock} lots en stock : voir Traçabilité.</p>
    </>
  );
}
