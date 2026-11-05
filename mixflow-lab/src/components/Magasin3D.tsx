import { useEffect, useRef, useState } from 'react';
import { DATA, inStock, isExpired, type Lot } from '../data/lab';

/**
 * Le magasin en perspective cavalière : chaque lot est un bac coloré.
 * Projection : P(x, y, z) = (x + 0,6·z, −y − 0,35·z). Les bacs sont positionnés par une transformation CSS,
 * ce qui permet d'animer leur déplacement d'un emplacement à l'autre lors de la réimplantation.
 */
const SLOT_W = 30, LVL_H = 36, BAC_D = 13, BOX_W = 24, BOX_H = 18, BOX_D = 11;
const UNIT_GAP = 46, UNIT_X0 = 92, BASE_Y = 238;
const ZONES = ['A', 'B', 'C', 'D'] as const;
const unitWidth = 4 * SLOT_W + 8;
const ux = (u: number) => UNIT_X0 + u * (unitWidth + UNIT_GAP + 4 * BAC_D * .6 - 10);
const P = (x: number, y: number, z: number): [number, number] => [x + .6 * z, BASE_Y - y - .35 * z];
const pts = (ps: [number, number][]) => ps.map(p => p.join(',')).join(' ');

function Box({ color }: { color: string }) {
  const f = (x: number, y: number, z: number) => P(x, y, z);
  const front = pts([f(0, 0, 0), f(BOX_W, 0, 0), f(BOX_W, BOX_H, 0), f(0, BOX_H, 0)]);
  const top = pts([f(0, BOX_H, 0), f(BOX_W, BOX_H, 0), f(BOX_W, BOX_H, BOX_D), f(0, BOX_H, BOX_D)]);
  const side = pts([f(BOX_W, 0, 0), f(BOX_W, 0, BOX_D), f(BOX_W, BOX_H, BOX_D), f(BOX_W, BOX_H, 0)]);
  return (
    <g transform={`translate(0 ${-BASE_Y})`}>
      <polygon points={side} fill={color} /><polygon points={side} fill="#000" opacity={.35} />
      <polygon points={top} fill={color} /><polygon points={top} fill="#fff" opacity={.28} />
      <polygon points={front} fill={color} stroke="rgba(0,0,0,.35)" strokeWidth={.6} />
    </g>
  );
}

export function Magasin3D({ placement, color, label, playing }: {
  placement: (l: Lot) => string; color: (l: Lot) => string; label: (l: Lot) => string; playing: boolean;
}) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const lots = DATA.lots.filter(inStock);
  // ordre des bacs dans chaque emplacement : stable par numéro de lot
  const bySlot = new Map<string, Lot[]>();
  for (const l of [...lots].sort((a, b) => a.num.localeCompare(b.num))) { const c = placement(l); if (!bySlot.has(c)) bySlot.set(c, []); bySlot.get(c)!.push(l); }
  const pos = (l: Lot): [number, number] => {
    const code = placement(l); const u = ZONES.indexOf(code[0] as typeof ZONES[number]);
    const lvl = Number(code[3]) - 1, slot = Number(code[6]) - 1, j = (bySlot.get(code) ?? []).indexOf(l);
    return P(ux(u) + 4 + slot * SLOT_W + (SLOT_W - BOX_W) / 2, lvl * LVL_H + 3, j * BAC_D + 1);
  };
  // ordre de dessin : du fond vers l'avant (z décroissant), puis de bas en haut
  const order = [...lots].sort((a, b) => {
    const ja = (bySlot.get(placement(a)) ?? []).indexOf(a), jb = (bySlot.get(placement(b)) ?? []).indexOf(b);
    return jb - ja || Number(placement(a)[3]) - Number(placement(b)[3]);
  });
  const W = ux(3) + unitWidth + 4 * BAC_D * .6 + 120, H = BASE_Y + 40;
  const goldY0 = P(0, LVL_H * 1, 0)[1], goldY1 = P(0, LVL_H * 3 - 6, 0)[1];

  return (
    <svg className="chart iso" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Vue en perspective des armoires et racks ; chaque bac coloré est un lot.">
      {/* zone Or à hauteur de taille */}
      <rect x={0} y={goldY1} width={W} height={goldY0 - goldY1} fill="rgba(242,179,61,.07)" />
      <text x={W - 8} y={goldY1 + 16} textAnchor="end" style={{ fill: 'var(--amber)' }}>ZONE OR</text>
      <text x={W - 8} y={goldY1 + 30} textAnchor="end" style={{ fill: 'var(--amber)', opacity: .8 }}>niveaux 2–3</text>
      {/* silhouette pour l'échelle : la taille arrive au niveau de la zone Or */}
      <g transform={`translate(22 ${BASE_Y + 6})`} fill="none" stroke="var(--ink-2)" strokeWidth={2.2} strokeLinecap="round">
        <circle cx={22} cy={-176} r={12} />
        <path d={`M22 -163 L22 -92 M22 -150 L4 -112 M22 -150 L40 -112 M22 -92 L8 -6 M22 -92 L36 -6`} />
        <line x1={-4} x2={50} y1={-96} y2={-96} stroke="var(--amber)" strokeDasharray="3 3" strokeWidth={1.2} />
      </g>
      {/* structures */}
      {ZONES.map((z, u) => {
        const x0 = ux(u), cold = z === 'A' || z === 'B';
        const frame = cold ? '#3c6f8f' : '#5d6772';
        const D = 4 * BAC_D + 4;
        return (
          <g key={z}>
            {[0, 1, 2, 3, 4, 5].map(k => {
              const y = k * LVL_H;
              return <polygon key={k} points={pts([P(x0, y, 0), P(x0 + unitWidth, y, 0), P(x0 + unitWidth, y, D), P(x0, y, D)])} fill={k === 5 ? 'transparent' : 'rgba(255,255,255,.04)'} stroke={frame} strokeWidth={1} />;
            })}
            {[[0, 0], [unitWidth, 0], [0, D], [unitWidth, D]].map(([dx, dz], i) => {
              const [a, b] = [P(x0 + dx, 0, dz), P(x0 + dx, 5 * LVL_H, dz)];
              return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={frame} strokeWidth={i < 2 ? 2 : 1} opacity={i < 2 ? 1 : .5} />;
            })}
            {[1, 2, 3, 4, 5].map(n => { const [tx, ty] = P(x0 - 6, (n - 1) * LVL_H + 10, 0); return <text key={n} x={tx} y={ty} textAnchor="end" style={{ fill: n === 2 || n === 3 ? 'var(--amber)' : 'var(--ink-3)' }}>N{n}</text>; })}
            {(() => { const [tx, ty] = P(x0, -18, 0); return <text x={tx} y={ty + 4} style={{ fill: 'var(--ink-2)', font: '600 12px var(--sans)' }}>{cold ? `Armoire froide ${z}` : `Rack ambiant ${z}`}</text>; })()}
          </g>
        );
      })}
      {/* bacs */}
      {order.map(l => {
        const [x, y] = pos(l);
        return (
          <g key={l.num} style={{ transform: `translate(${x}px, ${y}px)`, transition: reduced ? 'none' : `transform ${playing ? 1.1 : 0}s cubic-bezier(.6,.05,.25,1)` }}>
            <title>{label(l)}</title>
            <Box color={color(l)} />
          </g>
        );
      })}
    </svg>
  );
}

/** Petit hook : rejoue l'animation en repassant par l'état « avant ». */
export function useReplay(setAfter: (v: boolean) => void) {
  const [playing, setPlaying] = useState(false);
  const t = useRef<number[]>([]);
  useEffect(() => () => t.current.forEach(clearTimeout), []);
  const replay = () => {
    t.current.forEach(clearTimeout);
    setPlaying(false); setAfter(false);
    t.current = [window.setTimeout(() => { setPlaying(true); setAfter(true); }, 650), window.setTimeout(() => setPlaying(false), 2000)];
  };
  return { playing, replay, setPlaying };
}

export const isExpiredLot = (l: Lot) => isExpired(l, DATA.ref);
