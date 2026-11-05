import { useMemo, useState } from 'react';
import { DATA, days, expiresSoon, inStock, indexes, isExpired, qualityChecks } from '../data/lab';
import { Gauge } from './Hero';

export function Tracabilite() {
  const { mel, mv } = useMemo(() => indexes(DATA), []);
  const anomalies = useMemo(() => qualityChecks(DATA), []);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'stock' | 'all'>('stock');
  const [sel, setSel] = useState(anomalies.find(a => a.rule === 'Conditions de conservation non respectées')?.lot ?? DATA.lots[0].num);
  const lots = DATA.lots.filter(l => (scope === 'all' || inStock(l)) && (!q || `${l.num} ${l.melange} ${l.emplacement ?? ''} ${l.labo}`.toLowerCase().includes(q.toLowerCase())));
  const lot = DATA.lots.find(l => l.num === sel)!;
  const m = mel.get(lot.melange)!;
  const hist = mv.get(lot.num) ?? [];
  const lotAnoms = anomalies.filter(a => a.lot === lot.num);
  const tone = (l: typeof lot) => (!inStock(l) ? 'var(--ink-3)' : isExpired(l, DATA.ref) ? 'var(--bad)' : expiresSoon(l, DATA.ref, 14) ? 'var(--amber)' : 'var(--good)');
  const stockLots = DATA.lots.filter(inStock);
  const clean = stockLots.filter(l => !anomalies.some(a => a.lot === l.num)).length;
  const groups = [...new Set(anomalies.map(a => a.rule))].map(r => ({ r, items: anomalies.filter(a => a.rule === r) }));

  return (
    <>
      <div className="ph" data-n="04">
        <div>
          <div className="kicker">Mission 04 · Traçabilité sur tout le cycle de vie</div>
          <h1>Retrouver n’importe quel lot, et savoir si l’on peut s’y fier</h1>
          <p>L’état d’un lot (où, combien, jusqu’à quand) et son histoire complète. Les contrôles signalent les données incohérentes, qui rendent la traçabilité illusoire.</p>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi gauge-kpi"><Gauge share={clean / stockLots.length} label="Fiabilité du stock" sub={`${clean} lots sur ${stockLots.length} sans aucune anomalie`} tone={clean / stockLots.length < .9 ? 'var(--amber)' : 'var(--good)'} /></div>
        {groups.slice(0, 3).map(g => <div key={g.r} className={`kpi ${g.items[0].severity === 'haute' ? 'bad' : 'warn'}`}><span className="label">{g.r}</span><span className="v">{g.items.length}</span></div>)}
      </div>

      <div className="split2 mt">
        <section className="panel">
          <input className="search" type="search" placeholder="Lot, mélange, emplacement, labo" value={q} onChange={e => setQ(e.target.value)} aria-label="Rechercher un lot" />
          <div className="seg" style={{ margin: '10px 0' }}><button type="button" aria-pressed={scope === 'stock'} onClick={() => setScope('stock')}>En stock</button><button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Tout l’historique</button></div>
          <div className="lotlist" role="listbox" aria-label="Lots">
            {lots.length ? lots.map(l => (
              <button key={l.num} type="button" className="lotbtn" role="option" aria-pressed={l.num === sel} aria-selected={l.num === sel} onClick={() => setSel(l.num)}>
                <span className="dot" style={{ background: tone(l) }} />
                <span><b className="mono">{l.num}</b> <span className="muted small">{l.melange}</span></span>
                <span className="mono small muted">{inStock(l) ? l.emplacement : l.statut}</span>
              </button>
            )) : <p className="small muted">Aucun lot ne correspond.</p>}
          </div>
        </section>

        <section className="panel">
          <header><h3 className="mono">{lot.num}</h3><span className="status" style={{ color: tone(lot), background: 'transparent', border: '1px solid currentColor' }}>{isExpired(lot, DATA.ref) ? 'Périmé' : lot.statut}</span></header>
          <div className="grid2" style={{ gap: 18 }}>
            <div className="stack" style={{ gap: 6, fontSize: 13.5 }}>
              {([['Mélange', `${m.code} · ${m.libelle}`], ['Conservation', m.conservation], ['Labo demandeur', lot.labo], ['Fabrication', lot.fab], ['Péremption', `${lot.peremption}${inStock(lot) ? ` (${isExpired(lot, DATA.ref) ? 'dépassée de ' + days(lot.peremption, DATA.ref) : 'dans ' + days(DATA.ref, lot.peremption)} j)` : ''}`], ['Quantité', `${lot.qteReste} kg restants sur ${lot.qteInit} kg`], ['Emplacement', lot.emplacement ?? '—']] as const).map(([k, v]) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 10, borderBottom: '1px solid var(--line)', paddingBottom: 5 }}><span className="muted">{k}</span><span>{v}</span></div>
              ))}
              {lotAnoms.length > 0 && <div className="verdict bad" style={{ marginTop: 6 }}><b style={{ fontSize: 15 }}>{lotAnoms.length} anomalie(s)</b>{lotAnoms.map(a => <span key={a.rule} className="small">{a.rule} : {a.detail}</span>)}</div>}
            </div>
            <div>
              <span className="label">Historique ({hist.length} événements)</span>
              <div className="timeline-v" style={{ marginTop: 10 }}>
                {[...hist].reverse().map(h => (
                  <div key={h.id} className={h.type === 'Fin de vie' ? 'end' : ''}>
                    <span className="t">{h.date} · {h.id}</span><br />
                    <b>{h.type}</b> {h.qte ? `· ${h.qte} kg` : ''} {h.vers ? `→ ${h.vers}` : h.de ? `depuis ${h.de}` : ''}
                    <br /><span className="small muted">{h.user}{h.commentaire ? ` · ${h.commentaire}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel mt">
        <header><h3>Contrôles de qualité des données</h3><span className="label">{anomalies.length} anomalies</span></header>
        <div className="tbl"><table>
          <thead><tr><th>Contrôle</th><th>Lot</th><th>Détail</th><th>Gravité</th></tr></thead>
          <tbody>{groups.flatMap(g => g.items.slice(0, g.r === 'Lot périmé encore en stock' ? 4 : 10).map(a => (
            <tr key={a.rule + a.lot} className={a.lot === sel ? 'sel' : ''}><td className="small">{a.rule}</td><td><button type="button" className="row mono" onClick={() => setSel(a.lot)}>{a.lot}</button></td><td className="small muted">{a.detail}</td><td><span className={`status ${a.severity === 'haute' ? 'bad' : 'warn'}`}>{a.severity}</span></td></tr>
          )))}</tbody>
        </table></div>
        <p className="foot">Lots périmés : 4 premiers affichés sur {groups.find(g => g.r === 'Lot périmé encore en stock')?.items.length ?? 0}. Une partie de ces anomalies a été injectée volontairement dans les données fictives pour montrer les contrôles. Chez Mersen, sur des données produits, j’ai appris qu’un référentiel n’est utile que si on contrôle en continu sa cohérence.</p>
      </section>
    </>
  );
}
