/** Indicateurs. Toutes les fenêtres [a, b] sont inclusives (index de jours). */
import { COMPOUNDS, COSTS, MIXERS, TODAY, type Compound } from './config';
import type { SimResult } from './sim';

const sum = (xs: number[], a: number, b: number) => { let s = 0; for (let i = a; i <= b; i++) s += xs[i] ?? 0; return s; };

export interface Kpis {
  demand: number; shortage: number; shortageDays: number; fillRate: number; backlogTD: number;
  produced: number; planned: number; adherence: number; onTime: number; utilization: number;
  stockEnd: number; coverageEnd: number; scrapped: number;
  cost: { holding: number; shortage: number; scrap: number; total: number };
}

/**
 * - Taux de service = (besoin − besoin non servi le jour même) / besoin
 * - Jours de rupture = nombre de couples (mélange, jour) avec un besoin non servi
 * - Retard = somme des tonnes en attente en fin de journée (t·jour)
 * - Adhérence au plan = Σ min(réalisé, planifié) / Σ planifié
 * - Respect des délais = part des ordres (mélange, jour) réalisés à au moins 95 % le jour prévu et sans retard de mise à disposition
 * - Utilisation = production réalisée / capacité nominale
 * - Couverture = stock disponible / besoin moyen prévu des 7 jours suivants
 */
export function kpis(r: SimResult, a: number, b: number, ids: string[] = COMPOUNDS.map(c => c.id), mixers: string[] = MIXERS.map(m => m.id)): Kpis {
  let demand = 0, shortage = 0, shortageDays = 0, backlogTD = 0, produced = 0, planned = 0, adh = 0, orders = 0, onTime = 0;
  let holding = 0, scrapCost = 0, scrapped = 0, stockEnd = 0, fcNext = 0;
  const delayed = (d: number) => { const s = r.scenario.delay; return s.days > 0 && d >= TODAY + s.start && d < TODAY + s.start + s.duration; };
  for (const k of COMPOUNDS) {
    if (!ids.includes(k.id)) continue;
    const T = r.c[k.id];
    demand += sum(T.demand, a, b); shortage += sum(T.shortage, a, b); backlogTD += sum(T.backlog, a, b);
    produced += sum(T.produced, a, b); planned += sum(T.planned, a, b);
    scrapped += sum(T.scrapped, a, b); scrapCost += sum(T.scrapped, a, b) * k.value;
    for (let d = a; d <= b; d++) {
      if (T.shortage[d] > 1e-6) shortageDays++;
      adh += Math.min(T.produced[d], T.planned[d]);
      if (T.planned[d] > 1e-6) { orders++; if (T.produced[d] >= .95 * T.planned[d] && !delayed(d)) onTime++; }
      holding += (T.available[d] + T.maturing[d]) * COSTS.holding;
    }
    stockEnd += T.available[b];
    const next = T.forecast.slice(b + 1, b + 8);
    fcNext += next.length ? next.reduce((s, x) => s + x, 0) / next.length : T.forecast[b];
  }
  let cap = 0;
  for (const x of MIXERS) if (mixers.includes(x.id)) cap += sum(r.m[x.id].nominal, a, b);
  let prodM = 0;
  for (const x of MIXERS) if (mixers.includes(x.id)) prodM += sum(r.m[x.id].produced, a, b);
  const shortageCost = shortage * COSTS.shortage;
  return {
    demand, shortage, shortageDays, fillRate: demand ? (demand - shortage) / demand : 1, backlogTD,
    produced, planned, adherence: planned ? adh / planned : 1, onTime: orders ? onTime / orders : 1,
    utilization: cap ? prodM / cap : 0, stockEnd, coverageEnd: fcNext ? stockEnd / fcNext : 0, scrapped,
    cost: { holding, shortage: shortageCost, scrap: scrapCost, total: holding + shortageCost + scrapCost },
  };
}

/** Couverture d'un mélange au jour d, en jours de besoin prévu. */
export function coverage(r: SimResult, k: Compound, d: number): number {
  const T = r.c[k.id];
  const next = T.forecast.slice(d + 1, d + 8);
  const avg = next.length ? next.reduce((s, x) => s + x, 0) / next.length : T.forecast[d];
  return avg ? T.available[d] / avg : 0;
}

/**
 * Indicateurs de prévision sur [a, b] (F = prévision, A = réalisé) :
 * - Biais = Σ(F − A) / ΣA  (positif = sur-prévision)
 * - WAPE = Σ|F − A| / ΣA ; précision = 1 − WAPE
 * - MAPE = moyenne de |F − A| / A sur les jours où A > 0 (non applicable si aucun A > 0)
 * - Signal de suivi = Σ(F − A) / MAD  (alerte usuelle au-delà de ±4)
 */
export function forecastMetrics(F: number[], A: number[], a: number, b: number) {
  let sF = 0, sA = 0, sAbs = 0, mapeSum = 0, mapeN = 0, err = 0;
  for (let i = a; i <= b; i++) {
    sF += F[i]; sA += A[i]; sAbs += Math.abs(F[i] - A[i]); err += F[i] - A[i];
    if (A[i] > 0) { mapeSum += Math.abs(F[i] - A[i]) / A[i]; mapeN++; }
  }
  const n = b - a + 1, mad = sAbs / n;
  const wape = sA ? sAbs / sA : NaN;
  return { bias: sA ? (sF - sA) / sA : NaN, wape, accuracy: 1 - wape, mape: mapeN ? mapeSum / mapeN : NaN, tracking: mad ? err / mad : 0, gap: sF - sA };
}
