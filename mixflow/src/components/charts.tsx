import { useEffect, useId, useRef, useState } from 'react';

/** Largeur réelle du conteneur : le graphique est redessiné à sa taille, le texte garde donc une taille lisible. */
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, w] as const;
}

export const fmt = (x: number, d = 0) => (Number.isFinite(x) ? x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
export const pct = (x: number, d = 0) => (Number.isFinite(x) ? `${fmt(x * 100, d)} %` : '—');

export interface Series { name: string; color: string; values: number[]; dashed?: boolean; area?: boolean; step?: boolean }
export interface Band { from: number; to: number; color: string; label?: string }
export interface Mark { index: number; color: string; label: string }

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

/** Courbes avec bandes de fond (projection, incidents), repères et infobulle (souris et flèches du clavier). */
export function LineChart({ series, labels, height = 270, unit = '', bands = [], marks = [], today }: {
  series: Series[]; labels: string[]; height?: number; unit?: string; bands?: Band[]; marks?: Mark[]; today?: number;
}) {
  const [box, cw] = useWidth(960);
  const W = Math.max(300, cw), H = Math.round(Math.min(height, Math.max(190, W * .42))), L = 42, R = 10, T = 14, B = 24;
  const n = labels.length;
  const max = Math.max(1, ...series.flatMap(s => s.values.filter(Number.isFinite)));
  const step = niceStep(max / 4), top = Math.ceil(max / step) * step;
  const x = (i: number) => L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const id = useId();
  const ticks: number[] = []; for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(W / 90))));
  // les valeurs non finies (NaN) interrompent la courbe : utile pour un réel qui n'existe pas encore
  const path = (s: Series) => s.values.map((v, i) => {
    if (!Number.isFinite(v)) return '';
    const prev = i > 0 && Number.isFinite(s.values[i - 1]);
    if (!prev) return `M${x(i)},${y(v)}`;
    return s.step ? `L${x(i)},${y(s.values[i - 1])} L${x(i)},${y(v)}` : `L${x(i)},${y(v)}`;
  }).join(' ');
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <svg ref={ref} className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={id} tabIndex={0}
        onPointerMove={e => { const r = ref.current!.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1))))); }}
        onPointerLeave={() => setHover(null)} onBlur={() => setHover(null)}
        onKeyDown={e => { if (e.key === 'ArrowRight') setHover(h => Math.min(n - 1, (h ?? -1) + 1)); if (e.key === 'ArrowLeft') setHover(h => Math.max(0, (h ?? n) - 1)); }}>
        <title id={id}>{series.map(s => s.name).join(', ')}, {labels[0]} à {labels[n - 1]}</title>
        {bands.map((b, i) => (
          <g key={i}>
            <rect x={x(b.from) - (b.from > 0 ? (W - L - R) / (n - 1) / 2 : 0)} y={T} width={Math.max(2, x(b.to) - x(b.from) + (W - L - R) / (n - 1))} height={H - T - B} fill={b.color} />
            {b.label && <text x={x(b.from) + 4} y={T + 11}>{b.label}</text>}
          </g>
        ))}
        {ticks.map(v => <g key={v}><line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text x={L - 6} y={y(v) + 4} textAnchor="end">{fmt(v)}</text></g>)}
        {labels.map((l, i) => (i % every === 0 ? <text key={i} x={x(i)} y={H - 6} textAnchor="middle">{l}</text> : null))}
        {today !== undefined && <g><line x1={x(today)} x2={x(today)} y1={T} y2={H - B} stroke="var(--ink-2)" strokeDasharray="2 3" /><text x={x(today) + 4} y={H - B - 4} style={{ fill: 'var(--ink-2)' }}>aujourd’hui</text></g>}
        {series.map(s => (
          <g key={s.name}>
            {s.area && <path d={`${path(s)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={s.color} opacity={.12} />}
            <path d={path(s)} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.4 : 2} strokeDasharray={s.dashed ? '4 4' : undefined} strokeLinejoin="round" />
          </g>
        ))}
        {marks.map((m, i) => <g key={i}><circle cx={x(m.index)} cy={T + 4} r={4} fill={m.color} /><title>{m.label}</title></g>)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--ink-3)" />}
        {hover !== null && series.filter(s => Number.isFinite(s.values[hover])).map(s => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r={3.5} fill="var(--bg)" stroke={s.color} strokeWidth={2} />)}
      </svg>
      {hover !== null && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(Math.max(0, ...series.map(s => s.values[hover]).filter(Number.isFinite))) / H) * 100}%` }}>
          <div>{labels[hover]}</div>
          {series.filter(s => Number.isFinite(s.values[hover])).map(s => <div key={s.name}><span style={{ color: s.color }}>■</span> {s.name} : {fmt(s.values[hover], 1)}{unit}</div>)}
          {marks.filter(m => m.index === hover).map(m => <div key={m.label} style={{ color: m.color }}>● {m.label}</div>)}
        </div>
      )}
    </div>
  );
}

/** Bandeau de chaleur : une ligne par entité, une cellule par jour (valeur 0..1+). */
export function Heat({ rows, labels, today }: { rows: { label: string; values: number[] }[]; labels: string[]; today?: number }) {
  const color = (v: number) => (v >= .995 ? 'var(--bad)' : v > .9 ? 'var(--amber)' : v > .6 ? 'var(--data)' : v > .3 ? '#2e6f67' : '#1d3a37');
  const n = labels.length;
  return (
    <div className="heat" role="img" aria-label="Taux d’utilisation par mélangeur et par jour">
      {rows.map(r => (
        <div className="row" key={r.label}>
          <span className="mono small muted">{r.label}</span>
          <div className="cells" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {r.values.map((v, i) => <i key={i} title={`${r.label} · ${labels[i]} : ${pct(v)}`} style={{ background: color(v), outline: i === today ? '1px solid var(--ink-2)' : undefined }} />)}
          </div>
        </div>
      ))}
      <div className="axis"><span>{labels[0]}</span>{today !== undefined && <span>aujourd’hui : {labels[today]}</span>}<span>{labels[n - 1]}</span></div>
      <div className="legend" style={{ paddingLeft: 42, marginTop: 4 }}>
        <span><i style={{ background: '#1d3a37', height: 8 }} />&lt; 30 %</span><span><i style={{ background: 'var(--data)', height: 8 }} />60–90 %</span><span><i style={{ background: 'var(--amber)', height: 8 }} />90–99 %</span><span><i style={{ background: 'var(--bad)', height: 8 }} />pleine charge</span>
      </div>
    </div>
  );
}

/** Barres horizontales comparant référence et scénario. */
export function Bars({ rows, format }: { rows: { label: string; a: number; b?: number }[]; format: (v: number) => string }) {
  const max = Math.max(1e-9, ...rows.flatMap(r => [r.a, r.b ?? 0]));
  return (
    <div className="stack" style={{ gap: 8 }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,130px) minmax(0,1fr) 90px', gap: 10, alignItems: 'center', fontSize: 13 }}>
          <span className="muted">{r.label}</span>
          <div style={{ display: 'grid', gap: 3 }}>
            <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 3 }}><div style={{ width: `${(r.a / max) * 100}%`, height: '100%', background: 'var(--plan)', borderRadius: 3, transition: 'width .3s' }} /></div>
            {r.b !== undefined && <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 3 }}><div style={{ width: `${(r.b / max) * 100}%`, height: '100%', background: 'var(--amber)', borderRadius: 3, transition: 'width .3s' }} /></div>}
          </div>
          <span className="mono num" style={{ textAlign: 'right', fontSize: 12 }}>{format(r.a)}{r.b !== undefined && <><br /><span style={{ color: 'var(--amber)' }}>{format(r.b)}</span></>}</span>
        </div>
      ))}
    </div>
  );
}
