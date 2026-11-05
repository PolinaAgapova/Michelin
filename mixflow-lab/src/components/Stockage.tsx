import { useMemo, useState } from 'react';
import { DATA, LEVEL_COST, ZONE_FACTOR, abc, expiresSoon, inStock, isExpired, picks, reslot, slotCost, type Lot } from '../data/lab';
import { fmt, pct } from './charts';
import { Magasin3D, useReplay } from './Magasin3D';

type Mode = 'rotation' | 'peremption';
const ZONES = [['A', 'Armoire froide A'], ['B', 'Armoire froide B'], ['C', 'Rack ambiant C'], ['D', 'Rack ambiant D']];

export function Stockage() {
  const [mode, setMode] = useState<Mode>('rotation');
  const [budget, setBudget] = useState(10);
  const [after, setAfter] = useState(false);
  const { playing, replay, setPlaying } = useReplay(setAfter);
  const p = useMemo(() => picks(DATA), []);
  const cls = useMemo(() => abc(DATA, p), [p]);
  const r = useMemo(() => reslot(DATA, budget, p), [budget, p]);
  const moved = new Set(r.moves.map(m => m.lot));
  const stock = DATA.lots.filter(inStock);
  const where = (l: Lot) => (after && r.placement.has(l.num) ? r.placement.get(l.num)! : l.emplacement ?? '');
  const bySlot = new Map<string, Lot[]>();
  for (const l of stock) { const c = where(l); if (!bySlot.has(c)) bySlot.set(c, []); bySlot.get(c)!.push(l); }
  const color = (l: Lot) => {
    if (isExpired(l, DATA.ref)) return 'var(--bad)';
    if (mode === 'peremption') return expiresSoon(l, DATA.ref, 14) ? 'var(--amber)' : 'var(--data)';
    const c = cls.get(l.num); return c === 'A' ? 'var(--data)' : c === 'B' ? 'var(--data-2)' : 'var(--ink-3)';
  };
  const expired = stock.filter(l => isExpired(l, DATA.ref));
  const aInGold = stock.filter(l => cls.get(l.num) === 'A' && DATA.emplacements.find(e => e.code === where(l))?.ergo === 'Or').length;
  const aCount = [...cls.values()].filter(c => c === 'A').length;

  return (
    <>
      <div className="ph">
        <div>
          <div className="kicker">Mission 02 · Optimiser le stockage</div>
          <h1>Mettre les bons mélanges à la bonne hauteur</h1>
          <p>Les lots les plus prélevés devraient être les plus faciles à atteindre. Chaque case est un emplacement ; chaque trait, un lot.</p>
        </div>
        <span className="hypo">Pénibilité : hypothèse à valider avec un ergonome</span>
      </div>

      <div className="filters">
        <fieldset><legend className="label">Couleur</legend><div className="seg"><button type="button" aria-pressed={mode === 'rotation'} onClick={() => setMode('rotation')}>Rotation (ABC)</button><button type="button" aria-pressed={mode === 'peremption'} onClick={() => setMode('peremption')}>Péremption</button></div></fieldset>
        <fieldset><legend className="label">Vue</legend><div className="seg"><button type="button" aria-pressed={!after} onClick={() => setAfter(false)}>Aujourd’hui</button><button type="button" aria-pressed={after} onClick={() => setAfter(true)}>Après réimplantation</button></div></fieldset>
        <div className="legend">
          {mode === 'rotation'
            ? <><span><i style={{ background: 'var(--data)', height: 10, width: 10 }} />A : 80 % des prélèvements</span><span><i style={{ background: 'var(--data-2)', height: 10, width: 10 }} />B</span><span><i style={{ background: 'var(--ink-3)', height: 10, width: 10 }} />C</span></>
            : <><span><i style={{ background: 'var(--data)', height: 10, width: 10 }} />Plus de 14 jours</span><span><i style={{ background: 'var(--amber)', height: 10, width: 10 }} />Moins de 14 jours</span></>}
          <span><i style={{ background: 'var(--bad)', height: 10, width: 10 }} />Périmé</span><span style={{ color: 'var(--amber)' }}>N2–N3 : zone Or</span>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 14 }}>
        <header><h3>Le magasin, vu en perspective</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn primary" onClick={replay}>▶ Rejouer la réimplantation</button>
            <button type="button" className="btn ghost" onClick={() => { setPlaying(true); setAfter(!after); window.setTimeout(() => setPlaying(false), 1300); }}>{after ? 'Revenir à aujourd’hui' : 'Voir après'}</button>
          </div>
        </header>
        <Magasin3D placement={where} color={color} playing={playing} label={l => `${l.num} · ${l.melange} · ${where(l)} · ${p.get(l.num) ?? 0} prélèvement(s) en 60 j · ${isExpired(l, DATA.ref) ? 'périmé' : 'classe ' + (cls.get(l.num) ?? 'C')}`} />
        <p className="foot">Chaque bac est un lot. {after ? `Après réimplantation : les ${r.moves.length} lots les plus prélevés ont rejoint la zone Or, à hauteur de taille.` : 'Aujourd’hui : des lots très utilisés sont rangés en bas ou en haut, au fond des armoires.'} La silhouette donne l’échelle : la zone Or correspond aux gestes sans se baisser ni lever les bras.</p>
      </section>

      <div className="zones">
        {ZONES.map(([z, name]) => (
          <section key={z} className="panel zone">
            <h4>{name}<span>{z === 'A' || z === 'B' ? '+4 °C' : 'ambiant'} · ×{ZONE_FACTOR[z]}</span></h4>
            <div className="shelf">
              {[5, 4, 3, 2, 1].map(n => (
                <div key={n} style={{ display: 'contents' }}>
                  <span className={`lvl ${n === 2 || n === 3 ? 'or' : ''}`}>N{n}</span>
                  {[1, 2, 3, 4].map(pos => {
                    const code = `${z}-N${n}-P${pos}`, lots = bySlot.get(code) ?? [];
                    return (
                      <div key={code} className={`slot ${n === 2 || n === 3 ? 'gold' : ''}`} title={`${code}\n${lots.map(l => `${l.num} · ${l.melange} · ${p.get(l.num) ?? 0} prélèvement(s) · ${cls.get(l.num) ?? 'périmé'}`).join('\n') || 'vide'}`}>
                        {lots.map(l => <i key={l.num} style={{ background: color(l), outline: after && moved.has(l.num) ? '2px solid var(--ink)' : undefined, outlineOffset: -1 }} />)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="grid2 mt">
        <section className="panel">
          <header><h3>Simulation de réimplantation</h3><span className="label">budget de déplacements</span></header>
          <label className="ctl">Nombre maximal de lots à déplacer : <b className="mono">{budget}</b>
            <input type="range" min={0} max={30} value={budget} onChange={e => setBudget(+e.target.value)} /></label>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', marginTop: 12 }}>
            <div className="kpi"><span className="label">Pénibilité avant</span><span className="v">{fmt(r.before)}</span></div>
            <div className="kpi ok"><span className="label">Après</span><span className="v">{fmt(r.after)}</span></div>
            <div className="kpi ok"><span className="label">Gain</span><span className="v">−{pct(r.before ? 1 - r.after / r.before : 0)}</span></div>
          </div>
          <p className="foot">Pénibilité = Σ prélèvements des 60 derniers jours × coût de l’emplacement. Coût : niveaux 2–3 = {LEVEL_COST[2]}, niveaux 1 et 4 = {LEVEL_COST[1]}, niveau 5 = {LEVEL_COST[5]}, × 1,3 pour les zones éloignées du quai. Chaque déplacement respecte la conservation (froid / ambiant) et la capacité des emplacements. Vue affichée ({after ? "après réimplantation" : "aujourd’hui"}) : {aInGold} lots A sur {aCount} en zone Or.</p>
          <p className="small" style={{ marginTop: 8 }}>Les premiers déplacements rapportent le plus : au-delà d’une dizaine, le gain par déplacement diminue. C’est l’argument pour commencer petit.</p>
        </section>
        <section className="panel">
          <header><h3>Liste des déplacements proposés</h3><span className="label">{r.moves.length} lot(s)</span></header>
          {r.moves.length ? (
            <div className="tbl" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table style={{ minWidth: 0 }}>
                <thead><tr><th>Lot</th><th>De</th><th>Vers</th><th className="n">Prél. 60 j</th><th className="n">Gain</th></tr></thead>
                <tbody>{r.moves.map(m => <tr key={m.lot}><td className="mono">{m.lot}</td><td className="mono small">{m.from} <span className="muted">(×{fmt(slotCost(DATA.emplacements.find(e => e.code === m.from)!), 1)})</span></td><td className="mono small">{m.to}</td><td className="n">{p.get(m.lot)}</td><td className="n">{fmt(m.gain, 1)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <p className="small muted">Augmentez le budget pour voir les déplacements proposés.</p>}
        </section>
        <section className="panel span2">
          <header><h3>Avant toute réimplantation : sortir les périmés</h3><span className="status bad">quick win</span></header>
          <p className="small muted">{expired.length} lots périmés ({fmt(expired.reduce((s, l) => s + l.qteReste, 0))} kg) occupent des emplacements, dont {expired.filter(l => DATA.emplacements.find(e => e.code === l.emplacement)?.ergo === 'Or').length} en zone Or. Les traiter libère de la place aux bons endroits, sans aucun outil : c’est la première action que je proposerais, avec une règle simple de rangement FEFO (premier périmé, premier sorti).</p>
        </section>
      </div>
    </>
  );
}
