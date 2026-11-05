import { useEffect, useRef, useState } from 'react';

/**
 * Démonstration animée du fonctionnement de l'application (« motion design » en code).
 * Six scènes jouées en boucle, synchronisées avec une narration façon « stories ».
 * Avec « mouvement réduit », pas de lecture automatique : chaque scène s'affiche dans son état final.
 */
const SCENES = [
  { k: 'scan', t: 'Scanner', d: 'Le technicien vise l’étiquette QR du bac. Pas de saisie, pas d’erreur de recopie.', ms: 3600 },
  { k: 'id', t: 'Identifier', d: 'La fiche du lot apparaît : où il est, combien il en reste, jusqu’à quand.', ms: 3000 },
  { k: 'take', t: 'Prélever', d: 'Il saisit la quantité prélevée. L’application refuse une quantité supérieure au stock.', ms: 3400 },
  { k: 'update', t: 'Mettre à jour', d: 'Le stock se met à jour et l’événement s’ajoute à l’historique, daté et signé.', ms: 3200 },
  { k: 'alert', t: 'Alerter', d: 'Au scan d’un autre lot, l’application détecte qu’il est mal rangé : froid exigé, rangé en ambiant.', ms: 3600 },
  { k: 'trace', t: 'Tracer', d: 'Chaque geste laisse une trace : l’histoire complète du lot, de sa création à sa fin de vie.', ms: 3600 },
] as const;

function Scan() {
  return (
    <div className="sc-cam">
      <div className="sc-shelf" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div>
      <div className="sc-label">
        <svg viewBox="-1 -1 23 23" className="sc-qr" aria-hidden="true">
          {QR.map((r, y) => [...r].map((c, x) => (c === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} /> : null)))}
        </svg>
        <div><b>LOT-26-0012</b><span>MLG-EX02</span><span>Pér. 10/11/26</span></div>
      </div>
      <div className="sc-frame"><i /><i /><i /><i /></div>
      <div className="sc-beam" />
      <div className="sc-lock" />
      <div className="sc-hint">Visez l’étiquette</div>
    </div>
  );
}

function Fiche({ reste = '4,5', warn = false, lot = 'LOT-26-0012', place = 'A-N3-P2' }: { reste?: string; warn?: boolean; lot?: string; place?: string }) {
  return (
    <div className={`sc-sheet ${warn ? 'warn' : ''}`}>
      <div className="sc-grab" />
      <div className="sc-row1"><b>{lot}</b><span className="sc-chip">{warn ? 'À vérifier' : 'Disponible'}</span></div>
      <p className="sc-l1">Formulation exploratoire 02</p>
      <dl className="sc-dl">
        <dt>Emplacement</dt><dd>{place}</dd>
        <dt>Reste</dt><dd>{reste} kg</dd>
        <dt>Péremption</dt><dd className="sc-soon">10/11/2026</dd>
        <dt>Conservation</dt><dd>Froid +4 °C</dd>
      </dl>
    </div>
  );
}

function Take() {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'];
  return (
    <div className="sc-take">
      <p className="sc-small">LOT-26-0012 · reste 5 kg</p>
      <div className="sc-field"><span className="sc-typed"><i>0</i><i>,</i><i>5</i></span><em>kg</em><span className="sc-caret" /></div>
      <div className="sc-pad">{keys.map(k => <span key={k} className={`k-${k === ',' ? 'c' : k}`}>{k}</span>)}</div>
      <div className="sc-cta">Valider le prélèvement</div>
      <div className="sc-tap" />
    </div>
  );
}

function Update() {
  const [v, setV] = useState(5);
  useEffect(() => {
    const start = performance.now(); let raf = 0;
    const tick = (t: number) => { const k = Math.min(1, Math.max(0, (t - start - 400) / 900)); setV(5 - .5 * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, []);
  const r = 46, c = 2 * Math.PI * r;
  return (
    <div className="sc-update">
      <div className="sc-ring">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r={r} className="bg" /><circle cx="60" cy="60" r={r} className="fg" style={{ strokeDasharray: c, strokeDashoffset: c * (1 - v / 5) }} /></svg>
        <div><b>{v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b><span>kg restants</span></div>
      </div>
      <div className="sc-toast">✓ Prélèvement enregistré</div>
      <div className="sc-hist">
        <div className="sc-ev new"><b>Prélèvement · 0,5 kg</b><span>aujourd’hui · Démo</span></div>
        <div className="sc-ev"><b>Rangement · A-N3-P2</b><span>12/10/2026 · magasin</span></div>
        <div className="sc-ev"><b>Réception · 5 kg</b><span>12/10/2026 · magasin</span></div>
      </div>
    </div>
  );
}

function Alert() {
  return (
    <div className="sc-alertwrap">
      <div className="sc-flash" />
      <div className="sc-banner">⚠ Conservation non respectée : froid exigé, rangé en ambiant (D-N4-P3)</div>
      <div className="sc-fix">Déplacer vers une armoire froide →</div>
      <Fiche lot="LOT-26-0005" place="D-N4-P3" reste="5" warn />
    </div>
  );
}

function Trace() {
  const steps = [['Création', 'atelier mélange'], ['Réception', 'quai magasin'], ['Rangement', 'A-N3-P2'], ['Prélèvement', '0,5 kg · labo'], ['Fin de vie', 'à venir']];
  return (
    <div className="sc-trace">
      <p className="sc-small">LOT-26-0012 · cycle de vie</p>
      <svg viewBox="0 0 40 300" className="sc-line" aria-hidden="true"><path d="M20 14 C 25 60, 15 110, 20 150 S 25 215, 20 240" /></svg>
      <ol>{steps.map(([a, b], i) => <li key={a} style={{ animationDelay: `${.35 + i * .42}s` }} className={i === 4 ? 'todo' : ''}><b>{a}</b><span>{b}</span></li>)}</ol>
    </div>
  );
}

const QR = [
  '111111100100101111111', '100000101111101000001', '101110100101101011101', '101110100110001011101', '101110101011101011101', '100000100011001000001', '111111101010101111111', '000000000100000000000', '101010100110100010010', '000010000101011101100', '100111110011001010000', '010011011011110001110', '010111110001001010110', '000000001110001100001', '111111100010100010100', '100000100110001101000', '101110101100101001111', '101110100011010111110', '101110101011011000101', '100000100111110001011', '111111101101011001001',
];

export function AppShowcase() {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [i, setI] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(reduced);
  const timer = useRef<number>();
  useEffect(() => {
    if (paused) return;
    timer.current = window.setTimeout(() => { setI(x => (x + 1) % SCENES.length); if (i === SCENES.length - 1) setCycle(c => c + 1); }, SCENES[i].ms);
    return () => clearTimeout(timer.current);
  }, [i, paused]);
  const s = SCENES[i];
  const go = (k: number) => { setI(k); setCycle(c => c + 1); };
  return (
    <section className="sc" aria-label="Démonstration animée de l’application">
      <div className="sc-stage">
        <div className="sc-glow" aria-hidden="true" />
        <div className="sc-phone">
          <div className="sc-island" />
          <div className="sc-screen">
            <div className="sc-top"><span>9:41</span><b>MIXFLOW Scan</b><span>●●●</span></div>
            <div className={`sc-body ${reduced ? 'still' : ''}`} key={`${s.k}-${cycle}`}>
              {s.k === 'scan' && <Scan />}
              {s.k === 'id' && <><div className="sc-cam dim"><div className="sc-shelf">{Array.from({ length: 6 }, (_, k) => <i key={k} />)}</div></div><Fiche reste="5" /></>}
              {s.k === 'take' && <Take />}
              {s.k === 'update' && <Update />}
              {s.k === 'alert' && <Alert />}
              {s.k === 'trace' && <Trace />}
            </div>
          </div>
        </div>
      </div>
      <div className="sc-story">
        <div className="sc-bars" role="tablist" aria-label="Étapes">
          {SCENES.map((x, k) => (
            <button key={x.k} type="button" role="tab" aria-selected={k === i} aria-label={`${k + 1}. ${x.t}`} onClick={() => go(k)}>
              <i style={k < i ? { width: '100%' } : k === i ? { animation: paused ? 'none' : `scfill ${x.ms}ms linear forwards`, width: paused ? '100%' : undefined } : { width: 0 }} key={`${k}-${i}-${cycle}-${paused}`} />
            </button>
          ))}
        </div>
        <div className="sc-cap" key={`cap-${i}-${cycle}`}>
          <span className="sc-n">{String(i + 1).padStart(2, '0')}<em>/ {String(SCENES.length).padStart(2, '0')}</em></span>
          <h3>{s.t}</h3>
          <p>{s.d}</p>
        </div>
        <div className="sc-ctrl">
          <button type="button" className="btn ghost" onClick={() => go((i + SCENES.length - 1) % SCENES.length)} aria-label="Étape précédente">←</button>
          <button type="button" className="btn ghost" onClick={() => setPaused(p => !p)}>{paused ? '▶ Lecture' : '❚❚ Pause'}</button>
          <button type="button" className="btn ghost" onClick={() => go((i + 1) % SCENES.length)} aria-label="Étape suivante">→</button>
        </div>
      </div>
    </section>
  );
}
