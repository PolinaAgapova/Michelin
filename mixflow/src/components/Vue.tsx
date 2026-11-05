import { useMemo, useState } from 'react';
import { COMPOUNDS, CONSUMER_LABEL, DAYS, HISTORY, INCIDENTS, MIXERS, TODAY, type Compound } from '../data/config';
import { coverage, kpis } from '../data/kpi';
import { dayLabel, useStore } from '../store';
import { Heat, LineChart, fmt, pct } from './charts';

type Period = 'hist' | 'proj' | 'all';
const PERIOD: Record<Period, [number, number, string]> = { hist: [0, HISTORY - 1, 'Historique 4 sem.'], proj: [TODAY, DAYS - 1, 'Projection 2 sem.'], all: [0, DAYS - 1, 'Tout'] };

interface Def { def: string; formula: string; read: string }
function Kpi({ label, value, detail, tone, def }: { label: string; value: string; detail?: string; tone?: 'ok' | 'warn' | 'bad'; def: Def }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`kpi ${tone ?? ''}`}>
      <span className="label">{label}</span>
      <span className="v">{value}</span>
      {detail && <span className="d">{detail}</span>}
      <button type="button" className="info" aria-expanded={open} aria-label={`Définition : ${label}`} onClick={() => setOpen(o => !o)}>i</button>
      {open && <div className="def"><span><b>Définition.</b> {def.def}</span><span><b>Formule.</b> <code>{def.formula}</code></span><span><b>Lecture.</b> {def.read}</span></div>}
    </div>
  );
}

export function status(r: ReturnType<typeof useStore>['active'], k: Compound): { tone: 'ok' | 'warn' | 'bad'; label: string } {
  const T = r.c[k.id];
  if (T.shortage.slice(TODAY).some(v => v > .5)) return { tone: 'bad', label: 'Rupture projetée' };
  if (T.scrapped.slice(TODAY).some(v => v > .5)) return { tone: 'warn', label: 'Risque de péremption' };
  if (coverage(r, k, TODAY) < k.maturation + .5) return { tone: 'warn', label: 'Couverture faible' };
  return { tone: 'ok', label: 'Sous contrôle' };
}

export function Vue() {
  const { active, recos, go } = useStore();
  const [period, setPeriod] = useState<Period>('all');
  const [workshop, setWorkshop] = useState<string>('all');
  const [family, setFamily] = useState<string>('all');
  const [crit, setCrit] = useState<string>('all');
  const [a, b] = PERIOD[period];

  const ids = COMPOUNDS.filter(k => (family === 'all' || k.family === family) && (crit === 'all' || k.criticality === crit)
    && (workshop === 'all' || (workshop.startsWith('M') ? MIXERS.find(m => m.id === workshop)!.compounds.includes(k.id) : k.consumer === workshop))).map(k => k.id);
  const mixers = workshop.startsWith('M') ? [workshop] : MIXERS.filter(m => m.compounds.some(c => ids.includes(c))).map(m => m.id);
  const K = useMemo(() => kpis(active, a, b, ids, mixers), [active, a, b, ids.join(), mixers.join()]);
  const atRisk = COMPOUNDS.filter(k => ids.includes(k.id) && status(active, k).tone !== 'ok');
  const labels = Array.from({ length: b - a + 1 }, (_, i) => dayLabel(a + i));
  const series = (key: 'planned' | 'produced' | 'demand') => labels.map((_, i) => ids.reduce((s, id) => s + active.c[id][key][a + i], 0));
  const capacity = labels.map((_, i) => mixers.reduce((s, m) => s + active.m[m].capacity[a + i], 0));
  const families = [...new Set(COMPOUNDS.map(k => k.family))];
  const empty = ids.length === 0;

  return (
    <>
      <div className="ph">
        <div>
          <div className="kicker">Module A · Vue globale</div>
          <h1>État des flux de mélanges</h1>
          <p>Ce qui s’est passé sur les 4 dernières semaines, et ce qui se prépare sur les 2 prochaines selon le plan actif.</p>
        </div>
        <span className="hypo">Environnement fictif · modèle à valider avec le métier</span>
      </div>

      <div className="filters" role="region" aria-label="Filtres">
        <fieldset><legend className="label">Période</legend>
          <div className="seg">{(Object.keys(PERIOD) as Period[]).map(p => <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>{PERIOD[p][2]}</button>)}</div>
        </fieldset>
        <label><span className="label">Atelier</span>
          <select value={workshop} onChange={e => setWorkshop(e.target.value)}>
            <option value="all">Tous</option>
            <optgroup label="Mélangeage">{MIXERS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</optgroup>
            <optgroup label="Ateliers consommateurs">{Object.entries(CONSUMER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</optgroup>
          </select>
        </label>
        <label><span className="label">Famille</span>
          <select value={family} onChange={e => setFamily(e.target.value)}><option value="all">Toutes</option>{families.map(f => <option key={f}>{f}</option>)}</select>
        </label>
        <label><span className="label">Criticité</span>
          <select value={crit} onChange={e => setCrit(e.target.value)}><option value="all">Toutes</option><option value="A">A (arrêt coûteux)</option><option value="B">B</option><option value="C">C</option></select>
        </label>
      </div>

      {empty ? <div className="panel muted">Aucun mélange ne correspond à ces filtres.</div> : <>
        <div className="kpis">
          <Kpi label="Taux de service" value={pct(K.fillRate, 1)} tone={K.fillRate < .99 ? 'bad' : 'ok'} detail={`${fmt(K.shortage)} t non servies à temps`}
            def={{ def: 'Part du besoin des ateliers consommateurs servie le jour même.', formula: '(besoin − besoin non servi) / besoin', read: 'Sous 99 %, des ateliers en aval risquent de s’arrêter ou de changer de programme.' }} />
          <Kpi label="Jours de rupture" value={fmt(K.shortageDays)} tone={K.shortageDays ? 'bad' : 'ok'} detail="couples mélange × jour"
            def={{ def: 'Nombre de couples (mélange, jour) où une partie du besoin n’a pas été servie.', formula: 'Σ [besoin non servi > 0]', read: 'Mesure la fréquence des ruptures, là où le taux de service mesure leur volume.' }} />
          <Kpi label="Couverture" value={`${fmt(K.coverageEnd, 1)} j`} tone={K.coverageEnd < 1.5 ? 'warn' : 'ok'} detail={`stock disponible : ${fmt(K.stockEnd)} t`}
            def={{ def: 'Nombre de jours de besoin que le stock disponible permet de couvrir, en fin de période.', formula: 'stock disponible / besoin moyen prévu des 7 jours suivants', read: 'À comparer au temps de maturation : un stock qui couvre moins que la maturation ne peut plus être reconstitué à temps.' }} />
          <Kpi label="Risques de rupture" value={fmt(atRisk.filter(k => status(active, k).tone === 'bad').length)} tone={atRisk.some(k => status(active, k).tone === 'bad') ? 'bad' : 'ok'} detail={`${atRisk.length} mélange(s) sous surveillance`}
            def={{ def: 'Mélanges avec un besoin non couvert projeté sur les 14 prochains jours.', formula: 'mélanges avec rupture projetée > 0,5 t', read: 'C’est la liste à traiter en priorité au point de pilotage quotidien.' }} />
          <Kpi label="Utilisation capacité" value={pct(K.utilization)} tone={K.utilization > .95 ? 'warn' : undefined} detail={mixers.join(' · ')}
            def={{ def: 'Production réalisée rapportée à la capacité nominale des mélangeurs.', formula: 'production réalisée / capacité nominale', read: 'Au-delà de 95 %, la moindre panne se transforme en rupture : il n’y a plus de marge.' }} />
          <Kpi label="Plan vs réalisé" value={pct(K.adherence, 1)} tone={K.adherence < .95 ? 'warn' : undefined} detail={`${fmt(K.produced)} t réalisées / ${fmt(K.planned)} t planifiées`}
            def={{ def: 'Part de la production planifiée effectivement réalisée.', formula: 'Σ min(réalisé, planifié) / Σ planifié', read: 'Un écart durable signale un plan irréaliste ou des aléas non intégrés (pannes, maintenance).' }} />
          <Kpi label="Respect des délais" value={pct(K.onTime)} tone={K.onTime < .95 ? 'warn' : undefined} detail="ordres réalisés le jour prévu"
            def={{ def: 'Part des ordres de fabrication réalisés à au moins 95 % le jour prévu, sans retard de mise à disposition.', formula: 'ordres à l’heure / ordres planifiés', read: 'Complète le taux de service : on peut servir à temps grâce au stock tout en étant en retard sur le plan.' }} />
          <Kpi label="Coût opérationnel estimé" value={`${fmt(K.cost.total / 1000)} k€`} detail={`stock ${fmt(K.cost.holding / 1000)} · rupture ${fmt(K.cost.shortage / 1000)} · rebut ${fmt(K.cost.scrap / 1000)}`}
            def={{ def: 'Somme de trois coûts fictifs : possession du stock, perturbation des ateliers en cas de rupture, rebut des lots périmés.', formula: '6 €/t/j × stock + 1 800 €/t × rupture + valeur × rebut', read: 'Sert à comparer des scénarios entre eux, pas à chiffrer la réalité.' }} />
        </div>

        <div className="grid2 mt">
          <section className="panel span2" aria-label="Plan et réalisé">
            <header><h3>Besoins, plan et réalisé</h3><div className="legend"><span><i style={{ background: 'var(--data-2)' }} />Besoin des ateliers</span><span><i style={{ background: 'var(--plan)' }} />Planifié</span><span><i style={{ background: 'var(--data)' }} />Réalisé</span><span><i style={{ background: 'var(--ink-3)' }} />Capacité disponible</span></div></header>
            <LineChart labels={labels} unit=" t" today={TODAY >= a && TODAY <= b ? TODAY - a : undefined}
              bands={INCIDENTS.filter(i => i.to >= a && i.from <= b && (workshop === 'all' || mixers.includes(i.mixer))).map(i => ({ from: Math.max(0, i.from - a), to: Math.min(b - a, i.to - a), color: i.planned ? 'rgba(242,179,61,.10)' : 'rgba(242,100,90,.10)', label: i.label }))}
              series={[{ name: 'Capacité disponible', color: 'var(--ink-3)', values: capacity, dashed: true, step: true }, { name: 'Besoin', color: 'var(--data-2)', values: series('demand') }, { name: 'Planifié', color: 'var(--plan)', values: series('planned'), dashed: true }, { name: 'Réalisé', color: 'var(--data)', values: series('produced'), area: true }]} />
            <p className="foot">Bandes : panne passée (rouge) et maintenance planifiée (ambre). Le plan de référence ne tient pas compte de la maintenance : c’est un cas de démonstration.</p>
          </section>

          <section className="panel span2" aria-label="État des mélanges">
            <header><h3>État des mélanges à J0</h3><span className="label">couverture vs stock de sécurité</span></header>
            <div className="tbl">
              <table>
                <thead><tr><th>Mélange</th><th>Atelier</th><th>Crit.</th><th className="n">Stock dispo (t)</th><th className="n">En maturation</th><th>Couverture</th><th className="n">Besoin 7 j</th><th>Statut</th></tr></thead>
                <tbody>
                  {COMPOUNDS.filter(k => ids.includes(k.id)).map(k => {
                    const T = active.c[k.id], cov = coverage(active, k, TODAY), st = status(active, k);
                    const need7 = T.forecast.slice(TODAY + 1, TODAY + 8).reduce((s, x) => s + x, 0);
                    return (
                      <tr key={k.id}>
                        <td><b>{k.id}</b> <span className="muted small">{k.label}</span></td>
                        <td className="small muted">{CONSUMER_LABEL[k.consumer]}</td>
                        <td className="mono">{k.criticality}</td>
                        <td className="n">{fmt(T.available[TODAY])}</td>
                        <td className="n">{fmt(T.maturing[TODAY])}</td>
                        <td><div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px,1fr) 52px', gap: 8, alignItems: 'center' }}>
                          <div className="covbar" title={`Stock de sécurité : ${k.safetyDays} j ; maturation : ${k.maturation} j`}><i style={{ width: `${Math.min(100, (cov / 4) * 100)}%`, background: st.tone === 'ok' ? 'var(--data)' : st.tone === 'warn' ? 'var(--amber)' : 'var(--bad)' }} /><em style={{ left: `${Math.min(100, (k.safetyDays / 4) * 100)}%` }} /></div>
                          <span className="mono small">{fmt(cov, 1)} j</span></div></td>
                        <td className="n">{fmt(need7)}</td>
                        <td><span className={`status ${st.tone}`}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="foot">Le trait vertical indique le stock de sécurité en jours. Échelle : 0 à 4 jours.</p>
          </section>

          <section className="panel" aria-label="Utilisation des mélangeurs">
            <header><h3>Utilisation des mélangeurs</h3><span className="label">réalisé / capacité nominale</span></header>
            <Heat labels={labels} today={TODAY >= a && TODAY <= b ? TODAY - a : undefined} rows={MIXERS.filter(m => mixers.includes(m.id)).map(m => ({ label: m.id, values: labels.map((_, i) => active.m[m.id].produced[a + i] / m.capacity) }))} />
          </section>

          <section className="panel" aria-label="Alertes prioritaires">
            <header><h3>Alertes prioritaires</h3><button type="button" className="btn ghost" onClick={() => go('recommandations')}>Toutes les recommandations →</button></header>
            <div className="stack">
              {recos.filter(r => r.verdict === 'retenue').slice(0, 4).map(r => (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '10px minmax(0,1fr)', gap: 10 }}>
                  <span style={{ width: 8, height: 8, marginTop: 7, borderRadius: '50%', background: r.severity === 'haute' ? 'var(--bad)' : r.severity === 'moyenne' ? 'var(--amber)' : 'var(--ink-3)' }} />
                  <div><b style={{ fontSize: 14 }}>{r.rule}</b> <span className="muted small">· {r.problem}</span><br /><span className="small">{r.action}</span></div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </>}
    </>
  );
}
