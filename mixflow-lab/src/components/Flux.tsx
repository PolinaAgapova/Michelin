import { useState } from 'react';
import { DATA, days, indexes, lifecycle, qualityChecks } from '../data/lab';
import { fmt, pct } from './charts';
import { Stats } from './Hero';

const LANES = ['Laboratoire demandeur', 'Atelier mélange', 'Magasin', 'Laboratoires utilisateurs', 'Fin de vie'];
interface Step { id: string; title: string; lane: number; x: number; metric: string; tone: 'ok' | 'warn' | 'bad'; data: string[]; frictions: string[]; ideas: { t: string; to?: string }[] }

export function Flux() {
  const lc = lifecycle(DATA);
  const q = qualityChecks(DATA);
  const { mv } = indexes(DATA);
  const prel = DATA.mouvements.filter(m => m.type === 'Prélèvement');
  const avgQ = DATA.lots.reduce((s, l) => s + l.qteInit, 0) / DATA.lots.length;
  const endAge = DATA.lots.filter(l => l.statut === 'Détruit' || l.statut === 'Épuisé').map(l => { const ms = mv.get(l.num) || []; const end = ms.filter(m => m.type === 'Fin de vie' || m.type === 'Prélèvement').at(-1); return end ? days(l.fab, end.date) : NaN; }).filter(Number.isFinite);
  const avgAge = endAge.reduce((a, b) => a + b, 0) / Math.max(1, endAge.length);
  const placeIssues = q.filter(a => a.rule === 'Conditions de conservation non respectées' || a.rule === 'Déplacement non tracé').length;

  const STEPS: Step[] = [
    { id: 'demande', title: 'Demande', lane: 0, x: 20, metric: `${lc.lots} lots demandés`, tone: 'warn',
      data: [`${lc.lots} lots demandés sur la période`, `Quantité moyenne commandée : ${fmt(avgQ, 1)} kg`, `Seulement ${pct(lc.usedShare)} de la matière fabriquée est finalement prélevée`],
      frictions: ['La quantité demandée intègre peut-être une marge de sécurité pour refaire un essai', 'Le demandeur ne voit pas ce qui existe déjà en stock'],
      ideas: [{ t: 'Afficher le stock disponible du même mélange au moment de la demande', to: 'application' }, { t: 'Analyser avec les laboratoires la quantité réellement nécessaire par type d’essai' }] },
    { id: 'fabrication', title: 'Fabrication', lane: 1, x: 190, metric: `${fmt(lc.kgMade)} kg fabriqués`, tone: 'ok',
      data: [`${fmt(lc.kgMade)} kg fabriqués`, 'Chaque lot reçoit un numéro dès sa création'],
      frictions: ['Hors périmètre de ce prototype : les contraintes de l’atelier ne sont pas modélisées'],
      ideas: [{ t: 'Imprimer l’étiquette QR du lot dès la fabrication', to: 'application' }] },
    { id: 'reception', title: 'Réception', lane: 2, x: 360, metric: `délai : ${fmt(lc.toShelfDays, 0)} j`, tone: 'ok',
      data: [`Délai fabrication → rangement : ${fmt(lc.toShelfDays, 1)} jour en moyenne`],
      frictions: ['Saisie manuelle possible des informations du lot (risque d’erreur de recopie)'],
      ideas: [{ t: 'Réception par scan du QR : zéro recopie', to: 'application' }] },
    { id: 'rangement', title: 'Rangement', lane: 2, x: 510, metric: `${placeIssues} anomalies`, tone: placeIssues ? 'warn' : 'ok',
      data: [`${placeIssues} lots dont l’emplacement réel ne correspond pas à l’historique ou aux conditions de conservation`],
      frictions: ['L’emplacement est choisi « là où il y a de la place », sans tenir compte de la fréquence d’utilisation', 'Un déplacement n’est pas toujours enregistré'],
      ideas: [{ t: 'Proposer l’emplacement selon la conservation et la rotation', to: 'stockage' }, { t: 'Bloquer un rangement incompatible avec la conservation', to: 'application' }] },
    { id: 'stockage', title: 'Stockage', lane: 2, x: 660, metric: `${lc.expiredInStock} périmés / ${lc.inStock}`, tone: 'bad',
      data: [`${lc.inStock} lots en stock, dont ${lc.expiredInStock} périmés (${fmt(lc.kgExpiredInStock)} kg)`, `${lc.soon} lots périment dans les 7 jours`],
      frictions: ['Personne n’est alerté quand un lot approche de sa péremption', 'Les périmés occupent des emplacements, parfois en zone facile d’accès'],
      ideas: [{ t: 'Alerte de péremption automatique', to: 'application' }, { t: 'Sortir les périmés en priorité : quick win immédiat', to: 'stockage' }] },
    { id: 'prelevement', title: 'Prélèvements', lane: 3, x: 810, metric: `${fmt(lc.kgUsed)} kg prélevés`, tone: lc.neverUsed ? 'warn' : 'ok',
      data: [`${prel.length} prélèvements, ${fmt(lc.kgUsed)} kg`, `Premier prélèvement ${fmt(lc.firstUseDays, 0)} jours après le rangement en moyenne`, `${lc.neverUsed} lots jamais prélevés`],
      frictions: ['Le prélèvement n’est pas toujours déclaré : le stock théorique dérive', 'Chercher un lot prend du temps sans emplacement fiable'],
      ideas: [{ t: 'Déclarer le prélèvement en deux gestes : scan puis quantité', to: 'application' }, { t: 'Contrôler la cohérence stock / historique', to: 'tracabilite' }] },
    { id: 'epuise', title: 'Épuisement', lane: 3, x: 960, metric: `${lc.exhausted} lots épuisés`, tone: 'ok',
      data: [`${lc.exhausted} lots entièrement consommés`, `Durée de vie réelle moyenne d’un lot terminé : ${fmt(avgAge, 0)} jours`],
      frictions: [], ideas: [] },
    { id: 'destruction', title: 'Destruction', lane: 4, x: 960, metric: `${fmt(lc.kgDestroyed)} kg détruits`, tone: 'bad',
      data: [`${lc.destroyed} lots détruits, ${fmt(lc.kgDestroyed)} kg`, `${pct(lc.expiryRate)} des lots terminés le sont par péremption`],
      frictions: ['La fin de vie est constatée tard, lors d’un tri, et non anticipée'],
      ideas: [{ t: 'Tracer la fin de vie et son motif : mesurer la perte réelle', to: 'tracabilite' }, { t: 'Suivre l’indicateur « lots terminés par péremption »', to: 'deploiement' }] },
  ];
  const [sel, setSel] = useState('stockage');
  const s = STEPS.find(x => x.id === sel)!;
  const W = 1110, LH = 78, T = 10, BW = 136, BH = 52;
  const y = (lane: number) => T + lane * LH + (LH - BH) / 2;
  const color = { ok: 'var(--line-2)', warn: 'var(--amber)', bad: 'var(--bad)' };
  // des « lots » circulent le long des flèches ; rouges sur le chemin de la destruction (désactivé si mouvement réduit)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const arrow = (a: Step, b: Step, i: number) => {
    const x1 = a.x + BW, y1 = y(a.lane) + BH / 2, x2 = b.x, y2 = y(b.lane) + BH / 2, mx = (x1 + x2) / 2;
    const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 6},${y2}`;
    const waste = b.id === 'destruction';
    return (
      <g key={a.id + b.id}>
        <path d={d} fill="none" stroke="var(--ink-3)" strokeWidth={1.5} markerEnd="url(#arr)" />
        {!reduced && [0, 1].map(k => (
          <circle key={k} r={waste ? 3.6 : 3} fill={waste ? 'var(--bad)' : 'var(--data)'} opacity={.9}>
            <animateMotion dur={`${waste ? 2.4 : 1.8}s`} repeatCount="indefinite" begin={`${(i * .37 + k * (waste ? 1.2 : .9)) % 2}s`} path={d} />
          </circle>
        ))}
      </g>
    );
  };
  const by = (id: string) => STEPS.find(x => x.id === id)!;

  return (
    <>
      <div className="ph" data-n="01">
        <div>
          <div className="kicker">Mission 01 · Analyser et cartographier les flux</div>
          <h1>Le cycle de vie d’un mélange, de la commande à la fin de vie</h1>
          <p>Chaque étape affiche ce que disent les données. Cliquez pour voir les frictions supposées et les pistes d’amélioration.</p>
        </div>
        <span className="hypo">Cartographie hypothétique · à confronter aux observations terrain</span>
      </div>
      <Stats items={[
        { value: lc.firstUseDays, format: v => `${Math.round(v)} j`, label: 'entre le rangement et le premier prélèvement' },
        { value: lc.neverUsed, format: v => `${Math.round(v)}`, label: 'lots jamais prélevés', tone: 'warn' },
        { value: lc.expiryRate * 100, format: v => `${Math.round(v)} %`, label: 'des lots terminés finissent périmés', tone: 'bad' },
        { value: avgAge, format: v => `${Math.round(v)} j`, label: 'durée de vie réelle d’un lot terminé', tone: 'ok' },
      ]} />
      <section className="panel flow-wrap">
        <svg className="chart flow" viewBox={`0 0 ${W} ${T + LANES.length * LH + 10}`} role="group" aria-label="Cartographie des flux par acteur" style={{ minWidth: 900 }}>
          <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink-3)" /></marker></defs>
          {LANES.map((l, i) => <g key={l}><rect x={0} y={T + i * LH} width={W} height={LH} fill={i % 2 ? 'transparent' : 'rgba(255,255,255,.02)'} /><line x1={0} x2={W} y1={T + i * LH} y2={T + i * LH} stroke="var(--line)" /></g>)}
          {[['demande', 'fabrication'], ['fabrication', 'reception'], ['reception', 'rangement'], ['rangement', 'stockage'], ['stockage', 'prelevement'], ['prelevement', 'epuise'], ['stockage', 'destruction']].map(([a, b], i) => arrow(by(a), by(b), i))}
          {STEPS.map(st => (
            <g key={st.id} className="step" role="button" tabIndex={0} aria-pressed={sel === st.id} aria-label={`${st.title} : ${st.metric}`} style={{ cursor: 'pointer' }}
              onClick={() => setSel(st.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(st.id); } }}>
              <rect x={st.x} y={y(st.lane)} width={BW} height={BH} rx={7} fill={sel === st.id ? 'var(--panel-2)' : 'var(--panel)'} stroke={sel === st.id ? 'var(--data)' : color[st.tone]} strokeWidth={sel === st.id || st.tone !== 'ok' ? 2 : 1} />
              <text x={st.x + 10} y={y(st.lane) + 21} style={{ font: '600 13px var(--sans)', fill: 'var(--ink)' }}>{st.title}</text>
              <text x={st.x + 10} y={y(st.lane) + 39} style={{ font: '400 10.5px var(--mono)', fill: 'var(--ink-3)' }}>{st.metric}</text>
            </g>
          ))}
        </svg>
        <div className="legend" style={{ marginTop: 6 }}>{LANES.map((l, i) => <span key={l}>{i + 1}. {l}</span>)}<span><i style={{ background: 'var(--amber)' }} />vigilance</span><span><i style={{ background: 'var(--bad)' }} />point critique</span></div>
      </section>
      <div className="grid3 mt">
        <section className="panel"><header><h3>{s.title} : ce que disent les données</h3></header><ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>{s.data.map(x => <li key={x}>{x}</li>)}</ul></section>
        <section className="panel"><header><h3>Frictions supposées</h3><span className="hypo">hypothèses</span></header>
          {s.frictions.length ? <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>{s.frictions.map(x => <li key={x}>{x}</li>)}</ul> : <p className="small muted">Pas de friction identifiée à ce stade.</p>}
        </section>
        <section className="panel"><header><h3>Pistes d’amélioration</h3></header>
          {s.ideas.length ? <div className="stack" style={{ gap: 6 }}>{s.ideas.map(x => <div key={x.t} className="small">{x.t}{x.to && <> · <a href={`#${x.to}`}>voir</a></>}</div>)}</div> : <p className="small muted">—</p>}
        </section>
      </div>
      <section className="panel mt">
        <header><h3>Comment je validerais cette cartographie sur le terrain</h3></header>
        <div className="grid3">
          <p className="small muted"><b style={{ color: 'var(--ink)' }}>Observer.</b> Suivre physiquement 3 à 5 lots, de la demande à la fin de vie, et chronométrer les étapes.</p>
          <p className="small muted"><b style={{ color: 'var(--ink)' }}>Écouter.</b> Entretiens courts avec le magasin, l’atelier et chaque laboratoire : ce qui fait perdre du temps, ce qui fait perdre de la matière.</p>
          <p className="small muted"><b style={{ color: 'var(--ink)' }}>Mesurer.</b> Un inventaire ponctuel comparé aux données : il donne le vrai niveau de fiabilité du stock.</p>
        </div>
      </section>
    </>
  );
}
