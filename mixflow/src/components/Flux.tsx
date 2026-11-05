import { useState } from 'react';
import { COMPOUNDS, CONSUMER_LABEL, INCIDENTS, MIXERS, TODAY, type Consumer } from '../data/config';
import { dayLabel, useStore } from '../store';
import { fmt, pct } from './charts';

type Win = 'past' | 'next';
type NodeId = 'mp' | 'prep' | 'stock' | `M${number}` | Consumer;

const sum = (xs: number[], a: number, b: number) => xs.slice(a, b + 1).reduce((s, x) => s + x, 0);

export function Flux() {
  const { active } = useStore();
  const [win, setWin] = useState<Win>('next');
  const [sel, setSel] = useState<NodeId>('M1');
  const [a, b] = win === 'past' ? [TODAY - 7, TODAY - 1] : [TODAY, TODAY + 6];

  const prodBy = Object.fromEntries(MIXERS.map(m => [m.id, sum(active.m[m.id].produced, a, b)]));
  const capBy = Object.fromEntries(MIXERS.map(m => [m.id, sum(active.m[m.id].nominal, a, b)]));
  const total = Object.values(prodBy).reduce((s, x) => s + x, 0);
  const consumers = Object.keys(CONSUMER_LABEL) as Consumer[];
  const servedBy = Object.fromEntries(consumers.map(c => [c, COMPOUNDS.filter(k => k.consumer === c).reduce((s, k) => s + sum(active.c[k.id].served, a, b), 0)]));
  const shortBy = Object.fromEntries(consumers.map(c => [c, COMPOUNDS.filter(k => k.consumer === c).reduce((s, k) => s + sum(active.c[k.id].shortage, a, b), 0)]));
  const scrap = COMPOUNDS.reduce((s, k) => s + sum(active.c[k.id].scrapped, a, b), 0);
  const stockAvail = COMPOUNDS.reduce((s, k) => s + active.c[k.id].available[b], 0);
  const stockMat = COMPOUNDS.reduce((s, k) => s + active.c[k.id].maturing[b], 0);
  const incidentIn = (m: string) => INCIDENTS.find(i => i.mixer === m && i.to >= a && i.from <= b);

  const W = 1000, H = 440;
  const maxFlow = Math.max(1, total);
  const w = (v: number) => 2 + (v / maxFlow) * 34;
  const col = { mp: 10, prep: 210, mix: 410, stock: 615, cons: 820 };
  const NW = 168, NH = 64;
  const mixY = (i: number) => 40 + i * 130;
  const consY = (i: number) => 40 + i * 130;
  const pos: Record<string, [number, number]> = { mp: [col.mp, 168], prep: [col.prep, 168], stock: [col.stock, 168] };
  MIXERS.forEach((m, i) => (pos[m.id] = [col.mix, mixY(i)]));
  consumers.forEach((c, i) => (pos[c] = [col.cons, consY(i)]));
  const link = (from: string, to: string, v: number, color: string) => {
    const [x1, y1] = pos[from], [x2, y2] = pos[to];
    const sx = x1 + NW, sy = y1 + NH / 2, tx = x2, ty = y2 + NH / 2, mx = (sx + tx) / 2;
    return <path key={from + to} d={`M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`} fill="none" stroke={color} strokeOpacity={.55} strokeWidth={w(v)} />;
  };
  const tone = (id: string): string => {
    if (id.startsWith('M')) { const u = prodBy[id] / capBy[id]; return incidentIn(id) ? 'var(--bad)' : u > .95 ? 'var(--amber)' : 'var(--line-2)'; }
    if (id === 'stock') return scrap > .5 ? 'var(--amber)' : 'var(--line-2)';
    if (consumers.includes(id as Consumer)) return shortBy[id] > .5 ? 'var(--bad)' : 'var(--line-2)';
    return 'var(--line-2)';
  };
  const node = (id: NodeId, title: string, sub: string) => {
    const [x, y] = pos[id];
    return (
      <g key={id} className="node" role="button" tabIndex={0} aria-pressed={sel === id} aria-label={`${title} : ${sub}`}
        onClick={() => setSel(id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(id); } }}>
        <rect x={x} y={y} width={NW} height={NH} rx={8} fill={sel === id ? 'var(--panel-2)' : 'var(--panel)'} stroke={sel === id ? 'var(--data)' : tone(id)} strokeWidth={sel === id || tone(id) !== 'var(--line-2)' ? 2 : 1} />
        <text x={x + 12} y={y + 26}>{title}</text>
        <text className="sub" x={x + 12} y={y + 46}>{sub}</text>
      </g>
    );
  };

  const detail = (() => {
    if (sel.startsWith('M')) {
      const m = MIXERS.find(x => x.id === sel)!; const inc = incidentIn(m.id);
      const made = COMPOUNDS.filter(k => m.compounds.includes(k.id));
      return { title: m.label, rows: [
        ['Capacité nominale', `${fmt(m.capacity)} t/j`], ['Réalisé sur la fenêtre', `${fmt(prodBy[m.id])} t`],
        ['Planifié', `${fmt(sum(active.m[m.id].planned, a, b))} t`], ['Utilisation', pct(prodBy[m.id] / capBy[m.id])],
        ['Mélanges compatibles', made.map(k => k.id).join(', ')], ['Événement', inc ? `${inc.label} (${dayLabel(inc.from)} → ${dayLabel(inc.to)}, ${pct(inc.availability)} de capacité)` : 'Aucun'],
      ], note: inc?.planned ? 'Maintenance connue mais absente du plan : la production planifiée ces jours-là ne sera pas réalisée.' : prodBy[m.id] / capBy[m.id] > .95 ? 'Goulot : aucune marge pour absorber un aléa.' : '' };
    }
    if (sel === 'stock') return { title: 'Stock intermédiaire', rows: [
      ['Disponible en fin de fenêtre', `${fmt(stockAvail)} t`], ['En maturation', `${fmt(stockMat)} t`], ['Rebuté (périmé)', `${fmt(scrap)} t`],
      ...COMPOUNDS.map(k => [k.id, `${fmt(active.c[k.id].available[b])} t · maturation ${k.maturation} j · vie ${k.shelfLife} j`]),
    ], note: 'Un lot n’est utilisable qu’après sa maturation, et doit l’être avant sa durée de vie : le stock protège contre la rupture mais expose au rebut.' };
    if (consumers.includes(sel as Consumer)) {
      const c = sel as Consumer; const ks = COMPOUNDS.filter(k => k.consumer === c);
      return { title: CONSUMER_LABEL[c], rows: [
        ['Besoin', `${fmt(ks.reduce((s, k) => s + sum(active.c[k.id].demand, a, b), 0))} t`], ['Servi', `${fmt(servedBy[c])} t`], ['Non servi à temps', `${fmt(shortBy[c])} t`],
        ['Mélanges consommés', ks.map(k => `${k.id} (crit. ${k.criticality})`).join(', ')],
      ], note: shortBy[c] > .5 ? 'Rupture : l’atelier doit modifier son programme ou s’arrêter.' : '' };
    }
    return sel === 'mp'
      ? { title: 'Matières premières', rows: [['Consommation', `${fmt(total)} t (hypothèse : 1 t de matières pour 1 t de mélange)`], ['Contrainte modélisée', 'Aucune : disponibilité supposée suffisante']], note: 'Point à valider : les approvisionnements (caoutchoucs, charges, produits chimiques) peuvent eux aussi contraindre le plan.' }
      : { title: 'Pesée et préparation', rows: [['Volume préparé', `${fmt(total)} t`], ['Contrainte modélisée', 'Aucune']], note: 'Étape représentée pour la lisibilité du flux ; non contraignante dans le modèle.' };
  })();

  return (
    <>
      <div className="ph">
        <div>
          <div className="kicker">Module B · Visualisation des flux</div>
          <h1>Où la matière passe, où elle bloque</h1>
          <p>Épaisseur des liens proportionnelle aux tonnes. Cliquez sur une étape pour voir son détail. Bordure ambre ou rouge : point de tension.</p>
        </div>
        <span className="hypo">Chaîne illustrative, à adapter à la réalité du site</span>
      </div>
      <div className="filters"><fieldset><legend className="label">Fenêtre</legend>
        <div className="seg"><button type="button" aria-pressed={win === 'past'} onClick={() => setWin('past')}>7 derniers jours ({dayLabel(TODAY - 7)} → {dayLabel(TODAY - 1)})</button><button type="button" aria-pressed={win === 'next'} onClick={() => setWin('next')}>7 prochains jours ({dayLabel(TODAY)} → {dayLabel(TODAY + 6)})</button></div>
      </fieldset></div>
      <div className="split">
        <section className="panel flow-wrap" aria-label="Diagramme des flux">
          <svg className="chart flow" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Flux de mélanges">
            {link('mp', 'prep', total, 'var(--plan)')}
            {MIXERS.map(m => link('prep', m.id, prodBy[m.id], 'var(--data)'))}
            {MIXERS.map(m => link(m.id, 'stock', prodBy[m.id], 'var(--data)'))}
            {consumers.map(c => link('stock', c, servedBy[c], shortBy[c] > .5 ? 'var(--bad)' : 'var(--data-2)'))}
            {node('mp', 'Matières premières', `${fmt(total)} t`)}
            {node('prep', 'Pesée · préparation', `${fmt(total)} t`)}
            {MIXERS.map(m => node(m.id as NodeId, m.label, `${fmt(prodBy[m.id])} t · ${pct(prodBy[m.id] / capBy[m.id])}`))}
            {node('stock', 'Stock intermédiaire', `${fmt(stockAvail)} t disponibles`)}
            {consumers.map(c => node(c, CONSUMER_LABEL[c], shortBy[c] > .5 ? `${fmt(shortBy[c])} t manquantes` : `${fmt(servedBy[c])} t`))}
          </svg>
        </section>
        <aside className="panel" aria-live="polite">
          <header><h3>{detail.title}</h3><span className="label">{dayLabel(a)} → {dayLabel(b)}</span></header>
          <div className="detail-rows">
            {detail.rows.map(([k, v]) => <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,170px) minmax(0,1fr)', gap: 10, fontSize: 13.5, borderBottom: '1px solid var(--line)', paddingBottom: 6 }}><span className="muted">{k}</span><span className="mono" style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{v}</span></div>)}
          </div>
          {detail.note && <p className="small" style={{ marginTop: 12, color: 'var(--amber)' }}>{detail.note}</p>}
        </aside>
      </div>
    </>
  );
}
