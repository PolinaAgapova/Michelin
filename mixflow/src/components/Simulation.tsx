import { useState } from 'react';
import { COMPOUNDS, DAYS, HORIZON, MIXERS, TODAY } from '../data/config';
import { kpis, type Kpis } from '../data/kpi';
import { BASE, type Scenario } from '../data/sim';
import { dayLabel, useStore } from '../store';
import { Bars, LineChart, fmt, pct } from './charts';

export const PRESETS: { id: string; title: string; sub: string; s: Scenario }[] = [
  { id: 'demande', title: 'Besoins +20 %', sub: 'hausse non anticipée par la prévision', s: { ...BASE, demandIncrease: .2 } },
  { id: 'capacite', title: 'M2 à −50 % pendant 5 jours', sub: 'perte de capacité d’un mélangeur', s: { ...BASE, cut: { mixer: 'M2', pct: .5, start: 0, duration: 5 } } },
  { id: 'retard', title: 'Retard de production de 2 jours', sub: 'lots disponibles plus tard pendant 3 jours', s: { ...BASE, delay: { days: 2, start: 0, duration: 3 } } },
  { id: 'securite', title: 'Stock de sécurité +1 jour', sub: 'sur tous les mélanges', s: { ...BASE, safetyExtra: 1 } },
  { id: 'priorite', title: 'Priorité par criticité', sub: 'A, puis B, puis C, au lieu de la couverture', s: { ...BASE, priority: 'criticite' } },
];

type Dir = 'up' | 'down';
const ROWS: { k: string; label: string; get: (x: Kpis) => number; f: (v: number) => string; good: Dir }[] = [
  { k: 'fill', label: 'Taux de service', get: x => x.fillRate, f: v => pct(v, 1), good: 'up' },
  { k: 'short', label: 'Besoin non servi à temps (t)', get: x => x.shortage, f: v => fmt(v), good: 'down' },
  { k: 'days', label: 'Jours de rupture', get: x => x.shortageDays, f: v => fmt(v), good: 'down' },
  { k: 'late', label: 'Retard cumulé (t·jour)', get: x => x.backlogTD, f: v => fmt(v), good: 'down' },
  { k: 'stock', label: 'Stock disponible final (t)', get: x => x.stockEnd, f: v => fmt(v), good: 'up' },
  { k: 'util', label: 'Utilisation capacité', get: x => x.utilization, f: v => pct(v), good: 'up' },
  { k: 'ontime', label: 'Respect des délais', get: x => x.onTime, f: v => pct(v), good: 'up' },
  { k: 'scrap', label: 'Rebut (t)', get: x => x.scrapped, f: v => fmt(v), good: 'down' },
  { k: 'cost', label: 'Coût opérationnel estimé (k€)', get: x => x.cost.total / 1000, f: v => fmt(v), good: 'down' },
];

export function Simulation() {
  const { base, active, user, setUser, applied, setApplied, recos, preset, setPreset } = useStore();
  const [cid, setCid] = useState('FL-A');
  const a = TODAY, b = DAYS - 1;
  const kb = kpis(base, a, b), ks = kpis(active, a, b);
  const set = (p: Partial<Scenario>) => { setUser({ ...user, ...p }); setPreset(null); };
  const changed = JSON.stringify(user) !== JSON.stringify(BASE) || applied.length > 0;

  const verdict = ks.fillRate < .97 ? { tone: 'bad', t: 'Le plan ne tient pas', d: `${fmt(ks.shortage)} t ne seraient pas servies à temps : des ateliers consommateurs devraient s’adapter ou s’arrêter.` }
    : ks.fillRate < .995 ? { tone: 'warn', t: 'Plan sous tension', d: `Ruptures ponctuelles (${fmt(ks.shortageDays)} couple(s) mélange × jour). Voir les recommandations pour les éviter.` }
      : ks.scrapped > 5 ? { tone: 'warn', t: 'Besoins couverts, mais avec du rebut', d: `${fmt(ks.scrapped)} t périmées : le stock protège trop, et cela coûte.` }
        : { tone: 'ok', t: 'Besoins couverts sur la période', d: 'La capacité et le stock couvrent les besoins du scénario.' };

  const labels = Array.from({ length: HORIZON + 7 }, (_, i) => dayLabel(TODAY - 7 + i));
  const slice = (xs: number[]) => xs.slice(TODAY - 7, DAYS);
  const marks = slice(active.c[cid].shortage).map((v, i) => (v > .5 ? { index: i, color: 'var(--bad)', label: `Rupture scénario : ${fmt(v, 1)} t` } : null)).filter(Boolean) as { index: number; color: string; label: string }[];

  return (
    <>
      <div className="ph">
        <div>
          <div className="kicker">Module D · Simulation de scénarios</div>
          <h1>Et si… ? Mesurer avant de décider</h1>
          <p>Chaque scénario relance le moteur jour par jour sur les {HORIZON} prochains jours et le compare au plan de référence. Les résultats sont calculés, jamais tirés au hasard.</p>
        </div>
        {changed && <button type="button" className="btn" onClick={() => { setUser(BASE); setApplied([]); setPreset(null); }}>Revenir à la référence</button>}
      </div>

      <div className="sim">
        <div className="controls">
          <section className="panel">
            <header><h3>Cas prêts à l’emploi</h3></header>
            <div className="presets">
              {PRESETS.map(p => <button key={p.id} type="button" className="preset" aria-pressed={preset === p.id} onClick={() => { setUser(p.s); setPreset(p.id); }}>{p.title}<small>{p.sub}</small></button>)}
            </div>
          </section>
          <section className="panel stack" style={{ gap: 14 }}>
            <header style={{ marginBottom: 0 }}><h3>Réglages</h3></header>
            <label className="ctl">Variation des besoins : <b className="mono">{user.demandIncrease >= 0 ? '+' : ''}{fmt(user.demandIncrease * 100)} %</b>
              <input type="range" min={-.2} max={.4} step={.05} value={user.demandIncrease} onChange={e => set({ demandIncrease: +e.target.value })} /></label>
            <label className="switch"><input type="checkbox" checked={user.anticipated} onChange={e => set({ anticipated: e.target.checked })} />Hausse intégrée à la prévision</label>
            <div className="ctl">
              <span>Réduction de capacité</span>
              <div className="row2">
                <select aria-label="Mélangeur" value={user.cut.mixer ?? ''} onChange={e => set({ cut: { ...user.cut, mixer: e.target.value || null, pct: user.cut.pct || .5, duration: user.cut.duration || 3 } })}>
                  <option value="">Aucune</option>{MIXERS.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                </select>
                <select aria-label="Ampleur" value={user.cut.pct} disabled={!user.cut.mixer} onChange={e => set({ cut: { ...user.cut, pct: +e.target.value } })}>
                  {[.25, .5, .75, 1].map(v => <option key={v} value={v}>−{v * 100} %</option>)}
                </select>
              </div>
              {user.cut.mixer && <div className="row2">
                <label className="ctl small">Début : J+{user.cut.start}<input type="range" min={0} max={HORIZON - 1} value={user.cut.start} onChange={e => set({ cut: { ...user.cut, start: +e.target.value } })} /></label>
                <label className="ctl small">Durée : {user.cut.duration} j<input type="range" min={1} max={HORIZON} value={user.cut.duration} onChange={e => set({ cut: { ...user.cut, duration: +e.target.value } })} /></label>
              </div>}
            </div>
            <label className="ctl">Retard de mise à disposition : <b className="mono">{user.delay.days} j</b>
              <input type="range" min={0} max={4} value={user.delay.days} onChange={e => set({ delay: { ...user.delay, days: +e.target.value, duration: user.delay.duration || 3 } })} /></label>
            {user.delay.days > 0 && <label className="ctl small">sur les lots fabriqués de J+{user.delay.start} à J+{user.delay.start + user.delay.duration - 1}<input type="range" min={1} max={HORIZON} value={user.delay.duration} onChange={e => set({ delay: { ...user.delay, duration: +e.target.value } })} /></label>}
            <label className="ctl">Stock de sécurité : <b className="mono">{user.safetyExtra >= 0 ? '+' : ''}{fmt(user.safetyExtra, 1)} j</b>
              <input type="range" min={-1} max={3} step={.5} value={user.safetyExtra} onChange={e => set({ safetyExtra: +e.target.value })} /></label>
            <fieldset className="ctl" style={{ border: 0, padding: 0, margin: 0 }}><legend style={{ marginBottom: 6 }}>Règle de priorité</legend>
              <div className="seg"><button type="button" aria-pressed={user.priority === 'couverture'} onClick={() => set({ priority: 'couverture' })}>Couverture la plus faible</button><button type="button" aria-pressed={user.priority === 'criticite'} onClick={() => set({ priority: 'criticite' })}>Criticité</button></div>
            </fieldset>
            {applied.length > 0 && <div className="ctl"><span>Recommandations appliquées (cliquer pour retirer)</span>
              <div className="applied">{applied.map(id => <button key={id} type="button" onClick={() => setApplied(applied.filter(x => x !== id))} title={recos.find(r => r.id === id)?.action}>{id} ✕</button>)}</div></div>}
          </section>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          <div className={`verdict ${verdict.tone}`} aria-live="polite"><b>{verdict.t}</b><span className="small">{verdict.d}</span></div>

          <section className="panel">
            <header><h3>Référence contre scénario</h3><span className="label">{dayLabel(a)} → {dayLabel(b)}</span></header>
            <div className="cmp" role="table">
              <div className="h" role="columnheader">Indicateur</div><div className="h n" role="columnheader">Référence</div><div className="h n" role="columnheader">Scénario</div><div className="h n" role="columnheader">Écart</div>
              {ROWS.map(r => {
                const x = r.get(kb), y = r.get(ks), d = y - x;
                const same = Math.abs(d) < 1e-6 * Math.max(1, Math.abs(x));
                const better = r.good === 'up' ? d > 0 : d < 0;
                return [
                  <div key={r.k + 'l'}>{r.label}</div>, <div key={r.k + 'a'} className="n">{r.f(x)}</div>, <div key={r.k + 'b'} className="n">{r.f(y)}</div>,
                  <div key={r.k + 'd'} className={`n ${same ? 'flat' : better ? 'up-good' : 'up-bad'}`}>{same ? '=' : `${d > 0 ? '+' : ''}${r.f(d).replace(/^-/, '−')}`}</div>,
                ];
              })}
            </div>
          </section>

          <section className="panel">
            <header><h3>Stock disponible : {cid}</h3>
              <select aria-label="Mélange affiché" value={cid} onChange={e => setCid(e.target.value)}>{COMPOUNDS.map(k => <option key={k.id} value={k.id}>{k.id} · {k.label}</option>)}</select>
            </header>
            <div className="legend" style={{ marginBottom: 6 }}><span><i style={{ background: 'var(--plan)' }} />Référence</span><span><i style={{ background: 'var(--amber)' }} />Scénario</span><span><i style={{ background: 'var(--ink-3)' }} />Cible de stock (scénario)</span><span><i style={{ background: 'var(--bad)' }} />Rupture</span></div>
            <LineChart labels={labels} unit=" t" today={7} marks={marks}
              series={[{ name: 'Cible', color: 'var(--ink-3)', values: slice(active.c[cid].target), dashed: true }, { name: 'Référence', color: 'var(--plan)', values: slice(base.c[cid].available), dashed: true }, { name: 'Scénario', color: 'var(--amber)', values: slice(active.c[cid].available), area: true }]} />
          </section>

          <div className="grid2">
            <section className="panel">
              <header><h3>Coûts estimés (k€)</h3><span className="label">gris : référence · ambre : scénario</span></header>
              <Bars format={v => fmt(v)} rows={[
                { label: 'Possession du stock', a: kb.cost.holding / 1000, b: ks.cost.holding / 1000 },
                { label: 'Ruptures', a: kb.cost.shortage / 1000, b: ks.cost.shortage / 1000 },
                { label: 'Rebut', a: kb.cost.scrap / 1000, b: ks.cost.scrap / 1000 },
              ]} />
            </section>
            <section className="panel">
              <header><h3>Comment le calcul est fait</h3></header>
              <div className="model">
                <span>Chaque jour : rebut des lots périmés → service du besoin (FIFO, lots mûrs uniquement) → besoin de fabrication = cible − (disponible + en maturation − retard) → allocation de la capacité par priorité → réalisation selon la disponibilité réelle des mélangeurs.</span>
                <span>Cible = (maturation + 1 + stock de sécurité) × besoin moyen prévu.</span>
                <span>Non modélisé : changements de recette, contraintes matières premières, équipes, mélanges maîtres en plusieurs passes. <button type="button" className="btn ghost" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => (location.hash = 'methode')}>Hypothèses complètes</button></span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
