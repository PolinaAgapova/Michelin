import { DATA, lifecycle, qualityChecks, reslot } from '../data/lab';
import { fmt, pct } from './charts';
import { Sankey, useCountUp } from './Sankey';

const go = (r: string) => { location.hash = r; };

function Big({ value, format, label, sub, tone, delay }: { value: number; format: (v: number) => string; label: string; sub: string; tone: string; delay: number }) {
  const v = useCountUp(value, 1300, delay);
  return (
    <div className={`kpi big ${tone}`}>
      <span className="label">{label}</span>
      <span className="v">{format(v)}</span>
      <span className="d">{sub}</span>
    </div>
  );
}

export function Synthese() {
  const lc = lifecycle(DATA);
  const q = qualityChecks(DATA);
  const rs = reslot(DATA, 10);
  const valid = lc.kgMade - lc.kgUsed - lc.kgDestroyed - lc.kgExpiredInStock;
  const flows = [
    { label: 'Prélevée par les laboratoires', value: lc.kgUsed, color: '#4fc1b3', note: '' },
    { label: 'Encore utilisable en stock', value: valid, color: '#7aa7ff', note: '' },
    { label: 'Périmée, mais encore en stock', value: lc.kgExpiredInStock, color: '#f2b33d', note: '' },
    { label: 'Détruite', value: lc.kgDestroyed, color: '#f2645a', note: '' },
  ];
  const missions = [
    { k: '01', m: 'Analyser et cartographier les flux', r: 'flux', what: 'Le cycle de vie complet, données à l’appui.' },
    { k: '02', m: 'Optimiser le stockage', r: 'stockage', what: 'Rotation, ergonomie, réimplantation en 3D.' },
    { k: '03', m: 'Digitaliser la gestion des stocks', r: 'application', what: 'Une application mobile qui scanne les lots.' },
    { k: '04', m: 'Traçabilité fiable', r: 'tracabilite', what: 'L’histoire de chaque lot, et des données contrôlées.' },
    { k: '05', m: 'Déployer et former', r: 'deploiement', what: 'Six mois, un pilote, des utilisateurs autonomes.' },
  ];
  return (
    <>
      <section className="hero">
        <div className="kicker">Synthèse · données fictives</div>
        <h1 className="hero-t">{fmt(lc.kgMade)} kg de mélanges fabriqués.<br /><span>Seulement {pct(lc.usedShare)} réellement utilisés.</span></h1>
        <p className="hero-p">Une exploration des flux de mélanges d’un environnement de laboratoire, de la commande à la fin de vie : où va la matière, où elle se perd, et ce qu’un outil simple peut changer.</p>
        <div className="hero-viz">
          <Sankey total={lc.kgMade} flows={flows} source={`${fmt(lc.kgMade)} kg fabriqués`} />
          <div className="sk-legend">{flows.map(f => <span key={f.label}><i style={{ background: f.color }} />{f.label} · <b>{fmt(f.value)} kg</b> ({pct(f.value / lc.kgMade)})</span>)}</div>
        </div>
      </section>

      <div className="kpis">
        <Big label="Lots terminés par péremption" value={lc.expiryRate * 100} format={v => `${Math.round(v)} %`} sub={`${lc.destroyedExpiry} lots sur ${lc.ended} terminés`} tone="bad" delay={300} />
        <Big label="Périmés encore en stock" value={lc.expiredInStock} format={v => `${Math.round(v)}`} sub={`${fmt(lc.kgExpiredInStock)} kg occupent des emplacements`} tone="warn" delay={450} />
        <Big label="Anomalies de données" value={q.length} format={v => `${Math.round(v)}`} sub={`sur ${lc.inStock} lots en stock`} tone="warn" delay={600} />
        <Big label="Pénibilité avec 10 déplacements" value={(1 - rs.after / rs.before) * 100} format={v => `−${Math.round(v)} %`} sub="en rapprochant les lots les plus utilisés" tone="ok" delay={750} />
      </div>

      <h2 className="label" style={{ margin: '30px 0 12px' }}>Les cinq missions de l’offre, et où les explorer</h2>
      <div className="missions">
        {missions.map(x => (
          <button key={x.k} type="button" onClick={() => go(x.r)} className="mission">
            <span className="mk">{x.k}</span>
            <b>{x.m}</b>
            <span>{x.what}</span>
            <em aria-hidden="true">→</em>
          </button>
        ))}
      </div>
      <p className="foot" style={{ marginTop: 14 }}>Un mélange de laboratoire est souvent fabriqué en plus grande quantité que ce que les essais consomment. Toute la question est de savoir si l’écart est un choix (marge pour refaire un essai) ou une perte qu’on peut réduire.</p>
    </>
  );
}
