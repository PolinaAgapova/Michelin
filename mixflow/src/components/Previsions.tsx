import { useMemo, useState } from 'react';
import { COMPOUNDS, DAYS, HISTORY, TODAY } from '../data/config';
import { forecastMetrics } from '../data/kpi';
import { dayLabel, useStore } from '../store';
import { LineChart, fmt, pct } from './charts';

type Win = '28' | '14' | '7';

export function Previsions() {
  const { demand, active, go } = useStore();
  const [id, setId] = useState('FL-A');
  const [win, setWin] = useState<Win>('28');
  const a = HISTORY - Number(win), b = HISTORY - 1;
  const k = COMPOUNDS.find(c => c.id === id)!;
  const rows = useMemo(() => COMPOUNDS.map(c => ({ c, m: forecastMetrics(demand[c.id].forecast, demand[c.id].actual, a, b) })), [demand, a, b]);
  const all = useMemo(() => {
    const F: number[] = [], A: number[] = [];
    for (let d = 0; d < HISTORY; d++) { F.push(COMPOUNDS.reduce((s, c) => s + demand[c.id].forecast[d], 0)); A.push(COMPOUNDS.reduce((s, c) => s + demand[c.id].actual[d], 0)); }
    return forecastMetrics(F, A, a, b);
  }, [demand, a, b]);
  const m = rows.find(r => r.c.id === id)!.m;
  const T = active.c[id];
  const labels = Array.from({ length: DAYS }, (_, d) => dayLabel(d));
  const actualHist = demand[id].actual.map((v, d) => (d < HISTORY ? v : NaN));
  const marks = [
    ...T.shortage.map((v, d) => (v > .5 ? { index: d, color: 'var(--bad)', label: `Rupture : ${fmt(v, 1)} t` } : null)),
    ...T.scrapped.map((v, d) => (v > .5 ? { index: d, color: 'var(--amber)', label: `Rebut : ${fmt(v, 1)} t` } : null)),
  ].filter(Boolean) as { index: number; color: string; label: string }[];
  const reading = (x: typeof m) => Math.abs(x.bias) > .07
    ? (x.bias > 0 ? 'Sur-prévision persistante : excès de stock et risque de rebut.' : 'Sous-prévision persistante : le stock s’érode, risque de rupture.')
    : x.wape > .1 ? 'Biais faible mais erreurs fortes : elles se compensent, le stock doit absorber la variabilité.' : 'Prévision fiable sur la fenêtre.';
  const cumulative = (() => { let s = 0; return demand[id].forecast.slice(0, HISTORY).map((f, d) => (s += f - demand[id].actual[d])); })();

  return (
    <>
      <div className="ph">
        <div>
          <div className="kicker">Module C · Prévisions et écarts</div>
          <h1>Quand la prévision se trompe, le stock le paie</h1>
          <p>Prévision et réalisé sur l’historique, puis conséquences sur le stock : une sous-prévision finit en rupture, une sur-prévision en rebut.</p>
        </div>
        <button type="button" className="btn" onClick={() => go('parcours')}>Le lien avec mon expérience Euromaster →</button>
      </div>

      <div className="filters">
        <label><span className="label">Mélange</span><select value={id} onChange={e => setId(e.target.value)}>{COMPOUNDS.map(c => <option key={c.id} value={c.id}>{c.id} · {c.label}</option>)}</select></label>
        <fieldset><legend className="label">Fenêtre de mesure</legend><div className="seg">{(['28', '14', '7'] as Win[]).map(w => <button key={w} type="button" aria-pressed={win === w} onClick={() => setWin(w)}>{w} derniers jours</button>)}</div></fieldset>
      </div>

      <div className="kpis">
        <div className={`kpi ${Math.abs(m.bias) > .07 ? 'bad' : 'ok'}`}><span className="label">Biais · {id}</span><span className="v">{m.bias > 0 ? '+' : ''}{pct(m.bias, 1)}</span><span className="d">{m.bias > 0 ? 'sur-prévision' : 'sous-prévision'} · Σ(F − A) / ΣA</span></div>
        <div className="kpi"><span className="label">Précision (1 − WAPE)</span><span className="v">{pct(m.accuracy, 1)}</span><span className="d">WAPE = Σ|F − A| / ΣA = {pct(m.wape, 1)}</span></div>
        <div className="kpi"><span className="label">MAPE</span><span className="v">{pct(m.mape, 1)}</span><span className="d">moyenne de |F − A| / A, jours où A &gt; 0</span></div>
        <div className={`kpi ${Math.abs(m.tracking) > 4 ? 'warn' : ''}`}><span className="label">Écart cumulé</span><span className="v">{m.gap > 0 ? '+' : ''}{fmt(m.gap)} t</span><span className="d">signal de suivi : {fmt(m.tracking, 1)} (alerte au-delà de ±4)</span></div>
      </div>

      <div className="grid2 mt">
        <section className="panel span2">
          <header><h3>{k.label} : prévu, réel et stock</h3><div className="legend"><span><i style={{ background: 'var(--plan)' }} />Prévision</span><span><i style={{ background: 'var(--data-2)' }} />Réel (historique)</span><span><i style={{ background: 'var(--data)' }} />Stock disponible</span><span><i style={{ background: 'var(--bad)' }} />Rupture</span><span><i style={{ background: 'var(--amber)' }} />Rebut</span></div></header>
          <LineChart labels={labels} unit=" t" today={TODAY} marks={marks} bands={[{ from: TODAY, to: DAYS - 1, color: 'rgba(122,167,255,.05)', label: 'projection' }]}
            series={[{ name: 'Stock disponible', color: 'var(--data)', values: T.available, area: true }, { name: 'Prévision', color: 'var(--plan)', values: demand[id].forecast, dashed: true }, { name: 'Réel', color: 'var(--data-2)', values: actualHist }]} />
          <p className="foot">{reading(m)} Les points en haut du graphique signalent les jours de rupture (rouge) et de rebut (ambre) dans la simulation.</p>
        </section>

        <section className="panel">
          <header><h3>Écart cumulé (prévu − réel)</h3><span className="label">{id}</span></header>
          <LineChart labels={labels.slice(0, HISTORY)} unit=" t" height={180} series={[{ name: 'Écart cumulé', color: m.gap > 0 ? 'var(--amber)' : 'var(--bad)', values: cumulative.map(v => Math.abs(v)), area: true }]} />
          <p className="foot">Valeur absolue de l’écart cumulé. Une pente régulière trahit un biais : les erreurs ne se compensent pas.</p>
        </section>

        <section className="panel">
          <header><h3>Comment lire ces indicateurs</h3></header>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li><b style={{ color: 'var(--ink)' }}>Biais et WAPE se lisent ensemble.</b> Un biais nul peut cacher de grosses erreurs qui se compensent ; un WAPE faible peut cacher un petit biais qui s’accumule.</li>
            <li><b style={{ color: 'var(--ink)' }}>Le MAPE est fragile</b> quand les volumes sont faibles ou nuls : il n’est calculé que sur les jours où le réel est positif.</li>
            <li><b style={{ color: 'var(--ink)' }}>Une erreur de prévision n’a pas le même coût</b> dans les deux sens : ici, la sous-prévision coûte des ruptures, la sur-prévision coûte du rebut, car les mélanges ont une durée de vie.</li>
          </ul>
        </section>

        <section className="panel span2">
          <header><h3>Tous les mélanges</h3><span className="label">fenêtre : {win} jours · agrégé : précision {pct(all.accuracy, 1)}, biais {pct(all.bias, 1)}</span></header>
          <div className="tbl">
            <table>
              <thead><tr><th>Mélange</th><th className="n">Biais</th><th className="n">WAPE</th><th className="n">Précision</th><th className="n">MAPE</th><th className="n">Écart (t)</th><th className="n">Signal</th><th>Lecture</th></tr></thead>
              <tbody>
                {rows.map(({ c, m: x }) => (
                  <tr key={c.id} className={c.id === id ? 'sel' : ''}>
                    <td><button type="button" className="row" onClick={() => setId(c.id)}>{c.id}</button> <span className="small muted">{c.label}</span></td>
                    <td className="n" style={{ color: Math.abs(x.bias) > .07 ? 'var(--bad)' : undefined }}>{x.bias > 0 ? '+' : ''}{pct(x.bias, 1)}</td>
                    <td className="n">{pct(x.wape, 1)}</td><td className="n">{pct(x.accuracy, 1)}</td><td className="n">{pct(x.mape, 1)}</td>
                    <td className="n">{x.gap > 0 ? '+' : ''}{fmt(x.gap)}</td><td className="n">{fmt(x.tracking, 1)}</td>
                    <td className="small muted">{reading(x)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="foot">Données fictives. Les biais de FL-A (sous-prévision) et BR-B (sur-prévision) sont injectés volontairement dans le modèle pour la démonstration.</p>
        </section>
      </div>
    </>
  );
}
