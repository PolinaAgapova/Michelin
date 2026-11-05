import { useCountUp } from './Sankey';

export interface StatItem { value: number; format: (v: number) => string; label: string; tone?: 'data' | 'warn' | 'bad' | 'ok' }

/** Bandeau de chiffres clés d'une section, qui « montent » à l'affichage. */
export function Stats({ items }: { items: StatItem[] }) {
  return <div className="stats">{items.map((s, i) => <Stat key={s.label} {...s} delay={150 + i * 140} />)}</div>;
}
function Stat({ value, format, label, tone = 'data', delay }: StatItem & { delay: number }) {
  const v = useCountUp(value, 1200, delay);
  return <div className={`stat t-${tone}`}><span className="sv">{format(v)}</span><span className="sl">{label}</span></div>;
}

/** Jauge circulaire animée (part de 0 à 1). */
export function Gauge({ share, label, sub, tone }: { share: number; label: string; sub: string; tone: string }) {
  const v = useCountUp(share, 1500, 250);
  const R = 46, C = 2 * Math.PI * R;
  return (
    <div className="gauge">
      <svg viewBox="0 0 120 120" role="img" aria-label={`${label} : ${Math.round(share * 100)} %`}>
        <circle cx="60" cy="60" r={R} className="g-track" />
        <circle cx="60" cy="60" r={R} className="g-val" style={{ stroke: tone, strokeDasharray: C, strokeDashoffset: C * (1 - v) }} transform="rotate(-90 60 60)" />
        <text x="60" y="66" textAnchor="middle" className="g-num">{Math.round(v * 100)}<tspan className="g-pc"> %</tspan></text>
      </svg>
      <div><span className="label">{label}</span><p className="small muted" style={{ marginTop: 4 }}>{sub}</p></div>
    </div>
  );
}
