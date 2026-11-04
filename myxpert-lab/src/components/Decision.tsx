import { useEffect, useMemo, useState } from 'react';
import type { Dataset } from '../data/model';
import { completionRate, mean } from '../data/kpi';
import { plan, rice, sampleSizePerArm, type Horizon } from '../data/rice';
import { BACKLOG, REACH_FROM, REACH_TO } from '../content/backlog';
import { ChapterHead, Tag, fmt, pct } from './ui';

const IMPACTS = [.25, .5, 1, 2, 3];
const IMPACT_LABEL: Record<number, string> = { .25: '0,25 minime', .5: '0,5 faible', 1: '1 moyen', 2: '2 fort', 3: '3 massif' };
const CONF = [.5, .8, 1];

function Matrix({ items, selected, onSelect }: { items: { id: string; title: string; value: number; effort: number; reach: number }[]; selected: string; onSelect: (id: string) => void }) {
  const W = 560, H = 340, L = 50, B = 40, T = 16, R = 16;
  const maxE = 6, maxV = 3;
  const maxR = Math.max(1, ...items.map(i => i.reach));
  const x = (e: number) => L + (Math.min(e, maxE) / maxE) * (W - L - R);
  const y = (v: number) => T + (1 - Math.min(v, maxV) / maxV) * (H - T - B);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Matrice impact pondéré par la confiance, en fonction de l’effort. Taille des bulles : reach.">
      <rect x={L} y={T} width={(W - L - R) / 2} height={(H - T - B) / 2} fill="var(--good-soft)" opacity={.6} />
      <text x={L + 8} y={T + 16} style={{ fill: 'var(--good)' }}>GAINS RAPIDES</text>
      <text x={W - R - 8} y={T + 16} textAnchor="end">PARIS STRUCTURANTS</text>
      <text x={L + 8} y={H - B - 8}>PETITS PLUS</text>
      <text x={W - R - 8} y={H - B - 8} textAnchor="end" style={{ fill: 'var(--bad)' }}>À REMETTRE EN CAUSE</text>
      <line className="grid" x1={L} x2={W - R} y1={y(maxV / 2)} y2={y(maxV / 2)} />
      <line className="grid" x1={x(maxE / 2)} x2={x(maxE / 2)} y1={T} y2={H - B} />
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--ink-3)" /><line x1={L} x2={L} y1={T} y2={H - B} stroke="var(--ink-3)" />
      {[0, 1, 2, 3, 4, 5, 6].map(e => <text key={e} x={x(e)} y={H - B + 16} textAnchor="middle">{e}</text>)}
      {[0, 1, 2, 3].map(v => <text key={v} x={L - 8} y={y(v) + 4} textAnchor="end">{v}</text>)}
      <text x={(L + W) / 2} y={H - 4} textAnchor="middle">effort (personne-mois)</text>
      <text x={12} y={(T + H - B) / 2} transform={`rotate(-90 12 ${(T + H - B) / 2})`} textAnchor="middle">impact × confiance</text>
      {items.map(i => {
        const r = 8 + Math.sqrt(i.reach / maxR) * 18, sel = i.id === selected;
        return (
          <g key={i.id} role="button" tabIndex={0} aria-label={`${i.id} ${i.title}`} style={{ cursor: 'pointer' }}
            onClick={() => onSelect(i.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i.id); } }}>
            <circle cx={x(i.effort)} cy={y(i.value)} r={r} fill={sel ? 'var(--mark)' : 'var(--blue)'} fillOpacity={sel ? .9 : .22} stroke={sel ? 'var(--ink)' : 'var(--blue)'} strokeWidth={sel ? 2 : 1} />
            <text x={x(i.effort)} y={y(i.value) + 4} textAnchor="middle" style={{ fill: 'var(--ink)', fontWeight: 600 }}>{i.id}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function DecisionStudio({ ds, focus }: { ds: Dataset; focus: string | null }) {
  const reach = useMemo(() => Object.fromEntries(BACKLOG.map(b => [b.id, b.computeReach(ds)])), [ds]);
  const [params, setParams] = useState(() => Object.fromEntries(BACKLOG.map(b => [b.id, { impact: b.impact, confidence: b.confidence, effort: b.effort }])));
  const [capNow, setCapNow] = useState(5.5);
  const [capNext, setCapNext] = useState(6);
  const [deadlines, setDeadlines] = useState(true);
  const [selected, setSelected] = useState('B2');
  useEffect(() => { if (focus) setSelected(focus); }, [focus]);

  const items = BACKLOG.map(b => ({ ...b, ...params[b.id], reach: reach[b.id] }));
  const placement = plan(items, { now: capNow, next: capNext }, deadlines);
  const pl = (id: string) => placement.find(p => p.id === id)!;
  const sorted = [...items].sort((a, b) => rice(b) - rice(a));
  const sel = items.find(i => i.id === selected)!;
  const set = (id: string, k: 'impact' | 'confidence' | 'effort', v: number) => setParams(p => ({ ...p, [id]: { ...p[id], [k]: v } }));
  const resetParams = () => setParams(Object.fromEntries(BACKLOG.map(b => [b.id, { impact: b.impact, confidence: b.confidence, effort: b.effort }])));
  const lanes: [Horizon, string][] = [['now', 'Now'], ['next', 'Next'], ['later', 'Later']];
  const used = (h: Horizon) => items.filter(i => pl(i.id).horizon === h).reduce((s, i) => s + i.effort, 0);

  // Arbitrage : B3 seul contre B1 + B2
  const b1 = items.find(i => i.id === 'B1')!, b2 = items.find(i => i.id === 'B2')!, b3 = items.find(i => i.id === 'B3')!;
  const combo = { effort: b1.effort + b2.effort, score: (b1.reach * b1.impact * b1.confidence + b2.reach * b2.impact * b2.confidence) / (b1.effort + b2.effort) };

  // Calculateur A/B, ancré sur les données fictives
  const [pop, setPop] = useState<'weak' | 'all'>('weak');
  const [mde, setMde] = useState(5);
  const [power, setPower] = useState(.8);
  const ab = useMemo(() => {
    const recent = ds.diagnoses.filter(d => d.day >= 90 && d.day <= 119 && (pop === 'all' || d.weakNetwork));
    const base = completionRate(recent);
    const weekly = mean([0, 1, 2, 3].map(w => recent.filter(d => d.day >= 90 + w * 7 && d.day < 97 + w * 7).length));
    const target = Math.min(.999, base + mde / 100);
    const n = sampleSizePerArm(base, target, .05, power);
    return { base, target, n, weekly, weeks: weekly ? (2 * n) / weekly : Infinity };
  }, [ds, pop, mde, power]);

  return (
    <section className="chapter" aria-labelledby="decision">
      <div className="wrap">
        <ChapterHead n="03" id="decision" title="De la donnée à la décision">Huit propositions, chacune reliée à un problème et à une métrique. Le score RICE est calculé ; modifiez les hypothèses et regardez la roadmap se réorganiser.</ChapterHead>

        <div className="fict-banner"><Tag p="fict" /><span>Le Reach est calculé sur les données fictives du chapitre 02 (jours {REACH_FROM + 1} à {REACH_TO + 1}, environ un trimestre). Impact, confiance et effort sont mes estimations, à remplacer par celles de l’équipe.</span></div>

        <div className="bl" role="region" aria-label="Backlog priorisé">
          <table>
            <thead><tr><th>Proposition</th><th>Métrique</th><th style={{ textAlign: 'right' }}>Reach</th><th>Impact</th><th>Confiance</th><th>Effort (p-m)</th><th style={{ textAlign: 'right' }}>RICE</th><th>Horizon</th></tr></thead>
            <tbody>
              {sorted.map(i => (
                <tr key={i.id} aria-selected={i.id === selected}>
                  <td><button type="button" className="ttl" onClick={() => setSelected(i.id)}>{i.id} · {i.title}</button>{i.deadline && <span className="badge dl">échéance</span>}{i.dependsOn && <span className="badge">après {i.dependsOn.join(', ')}</span>}</td>
                  <td className="small muted">{i.metric}</td>
                  <td className="mono num" style={{ textAlign: 'right' }} title={i.reachRule}>{fmt(i.reach)}</td>
                  <td><select aria-label={`Impact ${i.id}`} value={i.impact} onChange={e => set(i.id, 'impact', +e.target.value)}>{IMPACTS.map(v => <option key={v} value={v}>{IMPACT_LABEL[v]}</option>)}</select></td>
                  <td><select aria-label={`Confiance ${i.id}`} value={i.confidence} onChange={e => set(i.id, 'confidence', +e.target.value)}>{CONF.map(v => <option key={v} value={v}>{pct(v)}</option>)}</select></td>
                  <td><input aria-label={`Effort ${i.id}`} type="number" min={.5} max={12} step={.5} value={i.effort} onChange={e => { const v = +e.target.value; if (v > 0) set(i.id, 'effort', v); }} /></td>
                  <td className="score num">{fmt(rice(i))}</td>
                  <td><span className={`pill ${pl(i.id).horizon}`}>{pl(i.id).horizon.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="def">RICE = Reach × Impact × Confiance ÷ Effort. <button type="button" className="btn small ghost" style={{ marginLeft: 8, color: 'var(--ink-2)' }} onClick={resetParams}>Rétablir mes estimations</button></p>

        <div className="block grid2">
          <div className="panel">
            <div className="ph"><h4>{sel.id} · {sel.title}</h4>{sel.deadline && <span className="badge dl">échéance</span>}</div>
            <dl className="dl-list">
              <dt>Problème</dt><dd>{sel.problem}</dd>
              <dt>User story</dt><dd>{sel.story}</dd>
              <dt>Critères</dt><dd><ul className="clean">{sel.acceptance.map(a => <li key={a}>{a}</li>)}</ul></dd>
              <dt>Métrique</dt><dd>{sel.metric}</dd>
              <dt>Reach</dt><dd>{fmt(sel.reach)} — {sel.reachRule.toLowerCase()}</dd>
              <dt>Risques</dt><dd>{sel.risks}</dd>
              <dt>Placement</dt><dd>{pl(sel.id).horizon.toUpperCase()} — {pl(sel.id).reason}</dd>
            </dl>
          </div>
          <div className="panel">
            <div className="ph"><h4>Matrice impact / effort</h4><span className="label">taille = reach</span></div>
            <Matrix items={items.map(i => ({ id: i.id, title: i.title, value: i.impact * i.confidence, effort: i.effort, reach: i.reach }))} selected={selected} onSelect={setSelected} />
          </div>
        </div>

        <div className="block">
          <h3 className="sub">Roadmap Now / Next / Later <Tag p="reco" /></h3>
          <div className="controls">
            <label className="range">Capacité Now : <b className="mono">{capNow} p-m</b><input type="range" min={1} max={10} step={.5} value={capNow} onChange={e => setCapNow(+e.target.value)} /></label>
            <label className="range">Capacité Next : <b className="mono">{capNext} p-m</b><input type="range" min={1} max={12} step={.5} value={capNext} onChange={e => setCapNext(+e.target.value)} /></label>
            <label className="switch"><input type="checkbox" checked={deadlines} onChange={e => setDeadlines(e.target.checked)} />Tenir compte de l’échéance de décommissionnement</label>
          </div>
          <div className="roadmap">
            {lanes.map(([h, l]) => (
              <div key={h} className="lane">
                <h4>{l}<span>{h !== 'later' ? `${fmt(used(h), 1)} / ${h === 'now' ? capNow : capNext} p-m` : `${fmt(used(h), 1)} p-m`}</span></h4>
                {items.filter(i => pl(i.id).horizon === h).sort((a, b) => rice(b) - rice(a)).map(i => (
                  <button key={i.id} type="button" className="rcard" onClick={() => setSelected(i.id)} style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', outline: i.id === selected ? '2px solid var(--ink)' : undefined }}>
                    <b>{i.id} · {i.title}</b><small>RICE {fmt(rice(i))} · {fmt(i.effort, 1)} p-m · {pl(i.id).reason}</small>
                  </button>
                ))}
                {!items.some(i => pl(i.id).horizon === h) && <p className="small muted">Rien pour l’instant.</p>}
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 12, maxWidth: '80ch' }}>
            <b>À essayer :</b> désactivez l’échéance. B5, la migration depuis MyTechXpert, a un score RICE modeste : sans contrainte de calendrier, elle glisse. C’est la limite du RICE, qui ne mesure pas le coût de perdre des utilisateurs à une date donnée. Le Product Manager doit l’arbitrer explicitement.
          </p>
        </div>

        <div className="block">
          <h3 className="sub">L’arbitrage principal : tout hors ligne, ou deux petites briques ? <Tag p="reco" /></h3>
          <div className="tradeoff">
            <div>
              <div className="label">Option A</div>
              <h4 style={{ font: '600 18px var(--sans)', margin: '4px 0 8px' }}>B3 · Diagnostic entièrement hors connexion</h4>
              <dl className="dl-list"><dt>RICE</dt><dd className="mono">{fmt(rice(b3))}</dd><dt>Effort</dt><dd>{fmt(b3.effort, 1)} p-m</dd><dt>Pour</dt><dd>Traite la cause racine en zone blanche.</dd><dt>Contre</dt><dd>Coûteux, confiance faible, risque sur la diffusion des mises à jour de sécurité.</dd></dl>
            </div>
            <div>
              <div className="label">Option B</div>
              <h4 style={{ font: '600 18px var(--sans)', margin: '4px 0 8px' }}>B1 + B2 · Reprise et photo différée</h4>
              <dl className="dl-list"><dt>RICE combiné</dt><dd className="mono">{fmt(combo.score)}</dd><dt>Effort</dt><dd>{fmt(combo.effort, 1)} p-m</dd><dt>Pour</dt><dd>Rapide, réversible, mesurable par un test A/B.</dd><dt>Contre</dt><dd>Ne règle pas l’absence totale de réseau.</dd></dl>
            </div>
            <div className="verdict-row">
              <b>Ma recommandation :</b> commencer par B1 + B2, mesurer l’abandon résiduel en réseau faible, puis décider de B3 avec des données. Seuil de décision proposé : si l’abandon à l’étape photo en réseau faible reste au-dessus de 15 % après le test, B3 passe en Next.
            </div>
          </div>
        </div>

        <div className="block">
          <h3 className="sub">Expérimentation A/B : combien de temps pour conclure ? <Tag p="fict" /></h3>
          <div className="calc">
            <div className="panel stack" style={{ gap: 14 }}>
              <p className="small"><b>Test :</b> photo obligatoire (A) contre photo facultative (B). Critère principal : taux de diagnostics terminés.</p>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="label" style={{ marginBottom: 6 }}>Population</legend>
                <div className="chips">
                  <button type="button" className="chip" aria-pressed={pop === 'weak'} onClick={() => setPop('weak')}>Diagnostics en réseau faible</button>
                  <button type="button" className="chip" aria-pressed={pop === 'all'} onClick={() => setPop('all')}>Tous les diagnostics</button>
                </div>
              </fieldset>
              <label className="range">Effet minimal détectable : <b className="mono">+{mde} points</b><input type="range" min={2} max={12} step={1} value={mde} onChange={e => setMde(+e.target.value)} /></label>
              <label className="range">Puissance : <b className="mono">{pct(power)}</b><input type="range" min={.7} max={.95} step={.05} value={power} onChange={e => setPower(+e.target.value)} /></label>
              <p className="def">Formule de comparaison de deux proportions, α = 5 % bilatéral. Simplification : l’unité est le diagnostic ; en réalité on randomiserait par utilisateur, ce qui augmente la taille nécessaire.</p>
            </div>
            <div className="panel stack" style={{ gap: 10 }}>
              <span className="label">Référence (30 derniers jours)</span>
              <span>Complétion actuelle : <b className="mono">{pct(ab.base, 1)}</b> → cible <b className="mono">{pct(ab.target, 1)}</b></span>
              <span className="label" style={{ marginTop: 6 }}>Taille par groupe</span>
              <span className="out">{Number.isFinite(ab.n) ? fmt(ab.n) : '—'}</span>
              <span className="label" style={{ marginTop: 6 }}>Durée estimée</span>
              <span className="out">{Number.isFinite(ab.weeks) ? `${fmt(Math.ceil(ab.weeks))} sem.` : '—'}</span>
              <span className="small muted">au rythme de {fmt(ab.weekly)} diagnostics par semaine dans cette population.</span>
              <p className="small" style={{ marginTop: 6 }}><b>Garde-fous :</b> part des résultats avec photo, CSAT, contacts support.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
