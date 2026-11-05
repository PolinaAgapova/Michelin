import { useEffect, useState } from 'react';
import { fmt, pct } from './charts';

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Compteur qui « monte » jusqu'à sa valeur (désactivé si mouvement réduit). */
export function useCountUp(target: number, ms = 1300, delay = 0) {
  const [v, setV] = useState(reduced() ? target : 0);
  useEffect(() => {
    if (reduced()) { setV(target); return; }
    let raf = 0; const t0 = performance.now() + delay;
    const tick = (t: number) => { const k = Math.min(1, Math.max(0, (t - t0) / ms)); setV(target * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, ms, delay]);
  return v;
}

export interface Flow { label: string; value: number; color: string; note: string }

/** Diagramme de Sankey : une source qui se partage en plusieurs destinations, avec un écoulement animé. */
export function Sankey({ total, flows, source }: { total: number; flows: Flow[]; source: string }) {
  const W = 960, H = 360, T = 34, HH = 300, X0 = 40, NW = 14, X1 = 600, GAP = 16;
  const sL = HH / total, sR = (HH - GAP * (flows.length - 1)) / total;
  let yl = T, yr = T;
  const bands = flows.map(f => {
    const hl = f.value * sL, hr = f.value * sR;
    const b = { ...f, y0: yl, h0: hl, y1: yr, h1: hr };
    yl += hl; yr += hr + GAP;
    return b;
  });
  const mx = (X0 + NW + X1) / 2;
  const anim = !reduced();
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 700px)').matches);
  useEffect(() => { const m = window.matchMedia?.('(max-width: 700px)'); if (!m) return; const f = () => setNarrow(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  const VB = narrow ? `${X0 - 4} ${T - 4} ${X1 + NW - X0 + 8} ${HH + GAP * 0 + 8 + (flows.length - 1) * 0}` : `0 0 ${W} ${H}`;
  return (
    <svg className="sankey" viewBox={VB} role="img" aria-label={`${source} : ${flows.map(f => `${f.label} ${fmt(f.value)} kg`).join(', ')}`}>
      <defs>
        {bands.map((b, i) => (
          <linearGradient key={i} id={`sk${i}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#4fc1b3" stopOpacity=".55" /><stop offset="1" stopColor={b.color} stopOpacity=".75" />
          </linearGradient>
        ))}
        <clipPath id="skreveal"><rect x="0" y="0" width={anim ? 0 : W} height={H}>{anim && <animate attributeName="width" from="0" to={W} dur="1.6s" begin="0.2s" fill="freeze" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1" />}</rect></clipPath>
      </defs>
      <g clipPath="url(#skreveal)">
        {bands.map((b, i) => {
          const top = `M${X0 + NW},${b.y0} C${mx},${b.y0} ${mx},${b.y1} ${X1},${b.y1}`;
          const d = `${top} L${X1},${b.y1 + b.h1} C${mx},${b.y1 + b.h1} ${mx},${b.y0 + b.h0} ${X0 + NW},${b.y0 + b.h0} Z`;
          const mid = (k: number) => `M${X0 + NW},${b.y0 + b.h0 * k} C${mx},${b.y0 + b.h0 * k} ${mx},${b.y1 + b.h1 * k} ${X1},${b.y1 + b.h1 * k}`;
          return (
            <g key={b.label} className="sk-band">
              <path d={d} fill={`url(#sk${i})`} />
              {[.3, .5, .7].map(k => <path key={k} d={mid(k)} className="sk-flow" stroke="#fff" style={{ animationDuration: `${2.6 + i * .4}s`, animationDelay: `${k * -2}s` }} />)}
              <rect x={X1} y={b.y1} width={NW} height={Math.max(2, b.h1)} rx={3} fill={b.color} />
            </g>
          );
        })}
      </g>
      <rect x={X0} y={T} width={NW} height={HH} rx={3} fill="#4fc1b3" />
      <text x={X0} y={T - 12} className="sk-src">{source}</text>
      {bands.map(b => (
        <g key={b.label} className="sk-lbl" transform={`translate(${X1 + NW + 14} ${b.y1 + b.h1 / 2})`}>
          <text y={-4} className="sk-v" style={{ fill: b.color }}>{fmt(b.value)} kg <tspan className="sk-p">· {pct(b.value / total)}</tspan></text>
          <text y={14} className="sk-l">{b.label}</text>
        </g>
      ))}
    </svg>
  );
}
