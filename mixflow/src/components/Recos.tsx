import { useStore } from '../store';
import { fmt, pct } from './charts';
import type { Reco } from '../data/rules';

function Card({ r, onApply, applied }: { r: Reco; onApply: () => void; applied: boolean }) {
  const e = r.expected!;
  const d = (x: number, y: number, f: (v: number) => string, goodUp: boolean) => {
    const diff = y - x; const cls = Math.abs(diff) < 1e-6 ? 'flat' : (diff > 0) === goodUp ? 'up-good' : 'up-bad';
    return <span className={cls}>{f(x)} → {f(y)}</span>;
  };
  return (
    <article className={`reco sev-${r.severity} ${r.verdict === 'écartée' ? 'out' : ''}`}>
      <div className="main">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="label">{r.id} · {r.rule}</span>
          <span className={`status ${r.severity === 'haute' ? 'bad' : r.severity === 'moyenne' ? 'warn' : 'ok'}`}>priorité {r.severity}</span>
        </div>
        <h4>{r.problem}</h4>
        <div><span className="label">Données qui justifient l’alerte</span><ul>{r.evidence.map(x => <li key={x}>{x}</li>)}</ul></div>
        <p className="act"><span className="label">Action proposée</span><br />{r.action}</p>
        <p className="small muted"><span className="label">Hypothèses et limites</span><br />{r.assumptions}</p>
      </div>
      <div className="side2">
        <span className="label">Résultat attendu (simulé)</span>
        <div className="delta">
          <span className="muted">Taux de service</span>{d(e.before.fillRate, e.after.fillRate, v => pct(v, 1), true)}
          <span className="muted">Non servi (t)</span>{d(e.before.shortage, e.after.shortage, v => fmt(v), false)}
          <span className="muted">Rebut (t)</span>{d(e.before.scrapped, e.after.scrapped, v => fmt(v), false)}
          <span className="muted">Coût (k€)</span>{d(e.before.cost.total / 1000, e.after.cost.total / 1000, v => fmt(v), false)}
        </div>
        <p className={`small ${r.verdict === 'retenue' ? 'up-good' : 'up-bad'}`}><b>{r.verdict === 'retenue' ? 'Retenue' : 'Écartée'}.</b> {r.verdictReason}</p>
        {r.verdict === 'retenue' && <button type="button" className={`btn ${applied ? '' : 'primary'}`} onClick={onApply} disabled={applied}>{applied ? 'Appliquée au scénario' : 'Appliquer dans le simulateur'}</button>}
      </div>
    </article>
  );
}

export function Recos() {
  const { recos, applied, setApplied, go } = useStore();
  const kept = recos.filter(r => r.verdict === 'retenue'), out = recos.filter(r => r.verdict === 'écartée');
  const apply = (id: string) => { if (!applied.includes(id)) setApplied([...applied, id]); go('simulation'); };
  return (
    <>
      <div className="ph">
        <div>
          <div className="kicker">Module E · Recommandations</div>
          <h1>Des règles métier, vérifiées par la simulation</h1>
          <p>Quatre règles explicites analysent le plan de référence. Chaque action proposée est simulée : elle n’est retenue que si le résultat s’améliore réellement.</p>
        </div>
        <span className="hypo">Aucune IA : des règles lisibles et contestables</span>
      </div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="grid3">
          <div><span className="label">Règle 1 · Rupture projetée</span><p className="small muted">Besoin non couvert sur 14 jours → anticiper un ordre, au plus tard (rupture − maturation − 1), sur le mélangeur qui a le plus de capacité libre.</p></div>
          <div><span className="label">Règle 2 · Biais de prévision</span><p className="small muted">|biais| &gt; 7 % sur l’historique → investiguer et corriger provisoirement la prévision.</p></div>
          <div><span className="label">Règles 3 et 4 · Rebut, goulot</span><p className="small muted">Lots périmés → baisser le stock de sécurité ; mélangeur à plus de 95 % → changer la règle de priorité.</p></div>
        </div>
      </div>
      <h2 className="label" style={{ margin: '6px 0 10px' }}>Retenues ({kept.length})</h2>
      <div className="stack">{kept.map(r => <Card key={r.id} r={r} applied={applied.includes(r.id)} onApply={() => apply(r.id)} />)}</div>
      {out.length > 0 && <>
        <h2 className="label" style={{ margin: '24px 0 10px' }}>Écartées après simulation ({out.length})</h2>
        <p className="small muted" style={{ marginBottom: 10, maxWidth: '80ch' }}>Une règle qui semble évidente peut empirer la situation. Par exemple, prioriser les mélanges critiques quand un mélangeur est saturé prive les autres mélanges de capacité et crée plus de ruptures qu’elle n’en évite.</p>
        <div className="stack">{out.map(r => <Card key={r.id} r={r} applied={false} onApply={() => undefined} />)}</div>
      </>}
    </>
  );
}
