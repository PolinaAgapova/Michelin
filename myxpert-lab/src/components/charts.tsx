import { useId, useRef, useState } from 'react';
import { fmt } from './ui';

export interface Series { name: string; color: string; values: number[]; dashed?: boolean }

/**
 * Courbes multi-séries avec infobulle au survol et au clavier (flèches gauche / droite).
 * L'axe Y démarre à 0 ; les graduations sont des valeurs « rondes » réellement atteignables par l'échelle.
 */
export function LineChart({ series, labels, height = 220, format = (v: number) => fmt(v), markers = [] }: {
  series: Series[]; labels: string[]; height?: number; format?: (v: number) => string;
  markers?: { index: number; label: string }[];
}) {
  const W = 720, H = height, L = 44, R = 12, T = 12, B = 26;
  const n = labels.length;
  const max = Math.max(1, ...series.flatMap(s => s.values));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const x = (i: number) => L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const id = useId();

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1)))));
  };
  const ticks = []; for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const every = Math.max(1, Math.ceil(n / 6));

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={ref} className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={id}
        tabIndex={0} onPointerMove={onMove} onPointerLeave={() => setHover(null)}
        onKeyDown={e => { if (e.key === 'ArrowRight') setHover(h => Math.min(n - 1, (h ?? -1) + 1)); if (e.key === 'ArrowLeft') setHover(h => Math.max(0, (h ?? n) - 1)); }}
        onBlur={() => setHover(null)}>
        <title id={id}>{series.map(s => s.name).join(', ')} — {labels[0]} à {labels[n - 1]}</title>
        {ticks.map(v => (
          <g key={v}><line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text x={L - 8} y={y(v) + 4} textAnchor="end">{format(v)}</text></g>
        ))}
        {labels.map((l, i) => (i % every === 0 ? <text key={i} x={x(i)} y={H - 6} textAnchor="middle">{l}</text> : null))}
        {markers.map(m => (
          <g key={m.label}>
            <line x1={x(m.index)} x2={x(m.index)} y1={T} y2={H - B} stroke="var(--bad)" strokeDasharray="3 4" />
            <text x={x(m.index) + 6} y={T + 10} style={{ fill: 'var(--bad)' }}>{m.label}</text>
          </g>
        ))}
        {series.map(s => (
          <g key={s.name}>
            {!s.dashed && <path d={`M${x(0)},${y(0)} ` + s.values.map((v, i) => `L${x(i)},${y(v)}`).join(' ') + ` L${x(n - 1)},${y(0)} Z`} fill={s.color} opacity={.07} />}
            <path d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.5 : 2} strokeDasharray={s.dashed ? '4 4' : undefined} strokeLinejoin="round" />
            <circle cx={x(n - 1)} cy={y(s.values[n - 1] ?? 0)} r={3.5} fill={s.color} />
          </g>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--ink-3)" />}
        {hover !== null && series.map(s => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r={4} fill="var(--surface)" stroke={s.color} strokeWidth={2} />)}
      </svg>
      {hover !== null && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(Math.max(...series.map(s => s.values[hover]))) / H) * 100}%` }}>
          <div>{labels[hover]}</div>
          {series.map(s => <div key={s.name}><span style={{ color: s.color }}>■</span> {s.name} : {format(s.values[hover])}</div>)}
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

/** Barres horizontales simples ou comparées (deux valeurs par ligne). */
export function HBars({ rows, format, compare }: { rows: { label: string; a: number; b?: number; onClick?: () => void; active?: boolean }[]; format: (v: number) => string; compare?: [string, string] }) {
  const max = Math.max(1e-9, ...rows.flatMap(r => [r.a, r.b ?? 0]));
  return (
    <div className="stack">
      {compare && <div className="legend"><span><i style={{ background: 'var(--blue)' }} />{compare[0]}</span><span><i style={{ background: 'var(--mark)' }} />{compare[1]}</span></div>}
      {rows.map(r => {
        const inner = (
          <div className="hbar" key={r.label} style={r.active ? { outline: '2px solid var(--ink)', outlineOffset: 4, borderRadius: 4 } : undefined}>
            <span>{r.label}</span>
            <div style={{ display: 'grid', gap: 3 }}>
              <div className="track"><div className="fill" style={{ width: `${(r.a / max) * 100}%` }} /></div>
              {r.b !== undefined && <div className="track"><div className="fill b" style={{ width: `${(r.b / max) * 100}%` }} /></div>}
            </div>
            <span className="pct">{format(r.a)}{r.b !== undefined && <><br />{format(r.b)}</>}</span>
          </div>
        );
        return r.onClick
          ? <button key={r.label} type="button" onClick={r.onClick} aria-pressed={!!r.active} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>{inner}</button>
          : inner;
      })}
    </div>
  );
}

/** Entonnoir : largeur proportionnelle, taux de passage entre étapes. */
export function Funnel({ steps }: { steps: { label: string; count: number }[] }) {
  const max = Math.max(1, steps[0]?.count ?? 1);
  return (
    <div className="stack" role="list">
      {steps.map((s, i) => {
        const conv = i ? (steps[i - 1].count ? s.count / steps[i - 1].count : 0) : 1;
        return (
          <div role="listitem" key={s.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px', gap: 10, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13.5, marginBottom: 3, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{s.label}</span><span className="mono num muted">{fmt(s.count)}</span>
              </div>
              <div className="track" style={{ height: 14, background: 'var(--paper-2)', borderRadius: 3 }}>
                <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', background: i === steps.length - 1 ? 'var(--mark)' : 'var(--blue)', borderRadius: 3, opacity: 1 - i * .12, transition: 'width .35s' }} />
              </div>
            </div>
            <span className="mono num small" style={{ textAlign: 'right', color: conv < .6 && i ? 'var(--bad)' : 'var(--ink-2)' }}>{i ? `${Math.round(conv * 100)} %` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Histogramme vertical compact (distribution de notes). */
export function Columns({ values, labels, highlight = [] }: { values: number[]; labels: string[]; highlight?: number[] }) {
  const W = 420, H = 130, max = Math.max(1, ...values), bw = W / values.length;
  const total = values.reduce((s, v) => s + v, 0) || 1;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 20}`} role="img" aria-label={labels.map((l, i) => `${l} : ${values[i]}`).join(', ')}>
      {values.map((v, i) => (
        <g key={i}>
          <rect x={i * bw + 6} y={H - (v / max) * (H - 16)} width={bw - 12} height={(v / max) * (H - 16)} rx={3} fill={highlight.includes(i) ? 'var(--blue)' : 'var(--line)'} />
          <text x={i * bw + bw / 2} y={H - (v / max) * (H - 16) - 4} textAnchor="middle">{Math.round((v / total) * 100)} %</text>
          <text x={i * bw + bw / 2} y={H + 14} textAnchor="middle">{labels[i]}</text>
        </g>
      ))}
    </svg>
  );
}
