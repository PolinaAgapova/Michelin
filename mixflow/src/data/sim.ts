/**
 * Moteur de simulation journalier, entièrement explicite (aucun tirage aléatoire ici).
 *
 * Chaque jour d, pour chaque mélange :
 *  1. les lots trop âgés (âge > durée de vie) sont rebutés ;
 *  2. le besoin du jour (plus le retard accumulé) est servi avec les lots disponibles, plus anciens d'abord (FIFO) ;
 *     un lot n'est disponible qu'après son temps de maturation (et un éventuel retard de production) ;
 *  3. le planificateur calcule un besoin de fabrication (logique « recomplètement jusqu'à une cible ») ;
 *  4. la capacité nominale des mélangeurs est allouée par ordre de priorité ;
 *  5. la production réalisée = production planifiée × disponibilité réelle du mélangeur.
 * Les scénarios ne modifient que la période projetée (à partir d'aujourd'hui).
 * Les stocks enregistrés pour le jour d sont relevés après le service du besoin et avant la production du jour.
 */
import { COMPOUNDS, DAYS, INCIDENTS, MIXERS, TODAY, type Compound } from './config';
import type { DemandSeries } from './demand';

export type Priority = 'couverture' | 'criticite';

export interface Scenario {
  demandIncrease: number;                 // +0,20 = besoins réels +20 % sur la projection
  anticipated: boolean;                   // la hausse est-elle connue du planificateur (intégrée à la prévision) ?
  cut: { mixer: string | null; pct: number; start: number; duration: number }; // réduction de capacité
  delay: { days: number; start: number; duration: number };                   // retard de mise à disposition
  safetyExtra: number;                    // jours de stock de sécurité ajoutés à tous les mélanges
  safetyBy: Record<string, number>;       // jours ajoutés (ou retirés) par mélange
  forecastFactor: Record<string, number>; // correction de prévision par mélange (1 = aucune)
  priority: Priority;
  extraOrders: { compound: string; mixer: string; day: number; qty: number }[]; // OF ajoutés (jours relatifs à aujourd'hui)
}

export const BASE: Scenario = {
  demandIncrease: 0, anticipated: false,
  cut: { mixer: null, pct: 0, start: 0, duration: 0 },
  delay: { days: 0, start: 0, duration: 0 },
  safetyExtra: 0, safetyBy: {}, forecastFactor: {}, priority: 'couverture', extraOrders: [],
};

export interface CompoundTrace {
  demand: number[]; forecast: number[]; served: number[]; shortage: number[]; backlog: number[];
  available: number[]; maturing: number[]; produced: number[]; planned: number[]; scrapped: number[];
  target: number[];
}
export interface MixerTrace { nominal: number[]; capacity: number[]; planned: number[]; produced: number[] }
export interface SimResult { c: Record<string, CompoundTrace>; m: Record<string, MixerTrace>; scenario: Scenario }

interface Lot { qty: number; made: number; ready: number }

const inWindow = (d: number, start: number, duration: number) => d >= TODAY + start && d < TODAY + start + duration;

export function availability(mixer: string, d: number, s: Scenario): number {
  let a = 1;
  for (const i of INCIDENTS) if (i.mixer === mixer && d >= i.from && d <= i.to) a = Math.min(a, i.availability);
  if (s.cut.mixer === mixer && inWindow(d, s.cut.start, s.cut.duration)) a = Math.min(a, 1 - s.cut.pct);
  return a;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function simulate(demand: Record<string, DemandSeries>, s: Scenario = BASE): SimResult {
  const lots: Record<string, Lot[]> = {};
  const backlog: Record<string, number> = {};
  const c: Record<string, CompoundTrace> = {};
  const m: Record<string, MixerTrace> = {};
  for (const k of COMPOUNDS) {
    lots[k.id] = [{ qty: k.initialStock, made: -k.maturation, ready: 0 }];
    backlog[k.id] = 0;
    c[k.id] = { demand: [], forecast: [], served: [], shortage: [], backlog: [], available: [], maturing: [], produced: [], planned: [], scrapped: [], target: [] };
  }
  for (const x of MIXERS) m[x.id] = { nominal: [], capacity: [], planned: [], produced: [] };

  const fc = (k: Compound, d: number) => {
    const base = demand[k.id].forecast[Math.min(d, DAYS - 1)] * (s.forecastFactor[k.id] ?? 1);
    return d >= TODAY && s.anticipated ? base * (1 + s.demandIncrease) : base;
  };

  for (let d = 0; d < DAYS; d++) {
    const position: Record<string, number> = {}, fcMean: Record<string, number> = {}, need: Record<string, number> = {};

    for (const k of COMPOUNDS) {
      const T = c[k.id];
      // 1. rebut des lots périmés
      let scrapped = 0;
      lots[k.id] = lots[k.id].filter(l => { if (d - l.made > k.shelfLife) { scrapped += l.qty; return false; } return true; });
      // 2. service du besoin, retard d'abord, FIFO
      const dem = demand[k.id].actual[d] * (d >= TODAY ? 1 + s.demandIncrease : 1);
      let toServe = backlog[k.id] + dem, served = 0;
      lots[k.id].sort((a, b) => a.made - b.made);
      for (const l of lots[k.id]) {
        if (l.ready > d || toServe <= 0) continue;
        const q = Math.min(l.qty, toServe);
        l.qty -= q; toServe -= q; served += q;
      }
      lots[k.id] = lots[k.id].filter(l => l.qty > 1e-9);
      const fromBacklog = Math.min(backlog[k.id], served);
      const shortage = Math.max(0, dem - (served - fromBacklog));
      backlog[k.id] = toServe;

      const available = lots[k.id].filter(l => l.ready <= d).reduce((a, l) => a + l.qty, 0);
      const maturing = lots[k.id].filter(l => l.ready > d).reduce((a, l) => a + l.qty, 0);
      T.demand.push(dem); T.forecast.push(fc(k, d)); T.served.push(served); T.shortage.push(shortage);
      T.backlog.push(backlog[k.id]); T.available.push(available); T.maturing.push(maturing); T.scrapped.push(scrapped);

      // 3. besoin de fabrication : cible = (maturation + 1 + stock de sécurité) jours de prévision moyenne
      const horizon = k.maturation + 1;
      fcMean[k.id] = mean(Array.from({ length: horizon }, (_, i) => fc(k, d + 1 + i)));
      const safety = Math.max(0, k.safetyDays + (d >= TODAY ? s.safetyExtra + (s.safetyBy[k.id] ?? 0) : 0));
      const target = (horizon + safety) * fcMean[k.id];
      position[k.id] = available + maturing - backlog[k.id];
      need[k.id] = Math.max(0, target - position[k.id]);
      T.target.push(target);
    }

    // 4. allocation de la capacité nominale par priorité
    const remaining: Record<string, number> = Object.fromEntries(MIXERS.map(x => [x.id, x.capacity]));
    const planned: Record<string, Record<string, number>> = Object.fromEntries(MIXERS.map(x => [x.id, {}]));
    // les ordres ajoutés manuellement réservent d'abord leur capacité (jamais au-delà de la capacité nominale)
    for (const o of s.extraOrders) if (TODAY + o.day === d) {
      const take = Math.min(o.qty, remaining[o.mixer] ?? 0);
      remaining[o.mixer] -= take;
      planned[o.mixer][o.compound] = (planned[o.mixer][o.compound] ?? 0) + take;
    }
    const crit = { A: 0, B: 1, C: 2 };
    const order = [...COMPOUNDS].sort((a, b) => {
      const cov = (k: Compound) => position[k.id] / Math.max(1e-9, fcMean[k.id]);
      if (s.priority === 'criticite' && a.criticality !== b.criticality) return crit[a.criticality] - crit[b.criticality];
      return cov(a) - cov(b);
    });
    for (const k of order) {
      let q = need[k.id];
      const compatible = MIXERS.filter(x => x.compounds.includes(k.id)).sort((a, b) => remaining[b.id] - remaining[a.id]);
      for (const x of compatible) {
        if (q <= 1e-9) break;
        const take = Math.min(q, remaining[x.id]);
        remaining[x.id] -= take; q -= take;
        planned[x.id][k.id] = (planned[x.id][k.id] ?? 0) + take;
      }
    }

    // 5. réalisation et création des lots
    const madeBy: Record<string, number> = {}, plannedBy: Record<string, number> = {};
    for (const x of MIXERS) {
      const a = availability(x.id, d, s);
      const M = m[x.id];
      let pl = 0, pr = 0;
      for (const [cid, q] of Object.entries(planned[x.id])) {
        const made = q * a;
        pl += q; pr += made;
        plannedBy[cid] = (plannedBy[cid] ?? 0) + q;
        madeBy[cid] = (madeBy[cid] ?? 0) + made;
      }
      M.nominal.push(x.capacity); M.capacity.push(x.capacity * a); M.planned.push(pl); M.produced.push(pr);
    }
    for (const k of COMPOUNDS) {
      const made = madeBy[k.id] ?? 0;
      const extra = inWindow(d, s.delay.start, s.delay.duration) ? s.delay.days : 0;
      if (made > 0) lots[k.id].push({ qty: made, made: d, ready: d + k.maturation + extra });
      c[k.id].produced.push(made);
      c[k.id].planned.push(plannedBy[k.id] ?? 0);
    }
  }
  return { c, m, scenario: s };
}
