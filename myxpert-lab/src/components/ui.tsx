import type { ReactNode } from 'react';
import type { Prov } from '../content/content';

const PROV_LABEL: Record<Prov, string> = { fact: 'Fait public', hypo: 'Hypothèse', reco: 'Recommandation', fict: 'Donnée fictive' };
export function Tag({ p }: { p: Prov }) {
  return <span className={`tag ${p}`}>{PROV_LABEL[p]}</span>;
}

export function ChapterHead({ n, id, title, children }: { n: string; id: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="chead">
      <div className="n" aria-hidden="true">{n}</div>
      <div>
        <h2 id={id}>{title}</h2>
        {children && <p>{children}</p>}
      </div>
    </header>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}

export const pct = (x: number, d = 0) => `${(x * 100).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
export const fmt = (x: number, d = 0) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
