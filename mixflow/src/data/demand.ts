import { COMPOUNDS, DAYS } from './config';

/** Générateur pseudo-aléatoire mulberry32 : données identiques à chaque chargement. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

export interface DemandSeries { forecast: number[]; actual: number[] }

/**
 * Prévision : besoin moyen modulé par un léger cycle hebdomadaire.
 * Réalisé : prévision × (1 + biais structurel) × bruit. Seul l'historique a un réalisé « observé » ;
 * pour la projection, le réalisé sert de « vérité simulée » du scénario de référence.
 */
export function generateDemand(seed = 7): Record<string, DemandSeries> {
  const r = rng(seed);
  const out: Record<string, DemandSeries> = {};
  for (const c of COMPOUNDS) {
    const forecast: number[] = [], actual: number[] = [];
    for (let d = 0; d < DAYS; d++) {
      const weekly = 1 + .06 * Math.sin((2 * Math.PI * d) / 7);
      const f = c.baseDemand * weekly * (1 + .02 * gauss(r));
      const a = f * (1 + c.forecastBias) * (1 + .07 * gauss(r));
      forecast.push(round1(f));
      actual.push(round1(Math.max(0, a)));
    }
    out[c.id] = { forecast, actual };
  }
  return out;
}
export const round1 = (x: number) => Math.round(x * 10) / 10;
