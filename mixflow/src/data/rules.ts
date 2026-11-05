/**
 * Moteur de recommandations à règles explicites (pas d'IA).
 * Chaque règle produit : problème, preuves chiffrées, action, et une ACTION SIMULABLE.
 * Le « résultat attendu » est calculé en relançant la simulation avec l'action appliquée.
 */
import { COMPOUNDS, HISTORY, MIXERS, TODAY, DAYS, type Compound } from './config';
import type { DemandSeries } from './demand';
import { forecastMetrics, kpis } from './kpi';
import { simulate, type Scenario, type SimResult } from './sim';

export type Severity = 'haute' | 'moyenne' | 'faible';
export interface Reco {
  id: string; rule: string; severity: Severity; compound?: string;
  problem: string; evidence: string[]; action: string; assumptions: string;
  patch: (s: Scenario) => Scenario;
  expected?: { before: ReturnType<typeof kpis>; after: ReturnType<typeof kpis> };
  verdict?: 'retenue' | 'écartée';
  verdictReason?: string;
}

const fmt = (x: number, d = 0) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x: number, d = 0) => `${fmt(x * 100, d)} %`;

export function recommend(demand: Record<string, DemandSeries>, _s: Scenario, r: SimResult): Reco[] {
  const out: Reco[] = [];
  const a = TODAY;

  for (const k of COMPOUNDS) {
    const T = r.c[k.id];
    // R1 — rupture projetée : anticiper une fabrication
    const firstShort = T.shortage.findIndex((x, d) => d >= a && x > .5);
    if (firstShort >= 0) {
      const short = T.shortage.slice(a).reduce((x, y) => x + y, 0);
      const latest = Math.max(TODAY, firstShort - k.maturation - 1);
      // capacité libre = capacité disponible − charge planifiée ; on cherche le meilleur couple (jour, mélangeur) avant la date limite
      let best = { day: latest, mixer: MIXERS.find(x => x.compounds.includes(k.id))!, slack: -1 };
      for (let d = TODAY; d <= latest; d++) for (const x of MIXERS.filter(x => x.compounds.includes(k.id))) {
        const slack = Math.min(r.m[x.id].nominal[d], r.m[x.id].capacity[d]) - r.m[x.id].planned[d];
        if (slack > best.slack) best = { day: d, mixer: x, slack };
      }
      const mixer = best.mixer;
      const qty = Math.max(5, Math.min(Math.ceil(short / 5) * 5, Math.floor(Math.max(0, best.slack) / 5) * 5));
      out.push({
        id: `R1-${k.id}`, rule: 'Rupture projetée', severity: k.criticality === 'A' ? 'haute' : 'moyenne', compound: k.id,
        problem: `${k.label} : besoin non couvert à partir du jour J+${firstShort - TODAY}.`,
        evidence: [`${fmt(short)} t non servies à temps sur la projection`, `Maturation : ${k.maturation} j, donc fabrication au plus tard à J+${latest - TODAY}`, `Capacité libre la plus forte avant cette date : ${mixer.label} à J+${best.day - TODAY} (${fmt(Math.max(0, best.slack))} t)`],
        action: `Anticiper un ordre de ${fmt(qty)} t de ${k.id} sur ${mixer.id} à J+${best.day - TODAY}.`,
        assumptions: 'La capacité libre est réellement mobilisable (personnel, matières premières) ; pas de temps de changement de recette modélisé.',
        patch: sc => ({ ...sc, extraOrders: [...sc.extraOrders, { compound: k.id, mixer: mixer.id, day: best.day - TODAY, qty }] }),
      });
    }
    // R2 — biais de prévision persistant sur l'historique
    const fm = forecastMetrics(demand[k.id].forecast, demand[k.id].actual, 0, HISTORY - 1);
    if (Math.abs(fm.bias) > .07) {
      const factor = Math.round((1 / (1 + fm.bias)) * 100) / 100;
      out.push({
        id: `R2-${k.id}`, rule: 'Biais de prévision', severity: fm.bias < 0 ? 'haute' : 'moyenne', compound: k.id,
        problem: `${k.label} : la prévision ${fm.bias < 0 ? 'sous-estime' : 'surestime'} durablement le besoin.`,
        evidence: [`Biais sur ${HISTORY} j : ${fm.bias > 0 ? '+' : ''}${pct(fm.bias, 1)}`, `Écart cumulé (prévu − réel) : ${fmt(fm.gap)} t`, `Signal de suivi : ${fmt(fm.tracking, 1)} (alerte au-delà de ±4)`],
        action: `Investiguer la cause avec le métier, et en attendant corriger la prévision de ${k.id} d’un facteur ${fmt(factor, 2)}.`,
        assumptions: 'Le biais observé se prolonge ; la correction est provisoire et doit être remplacée par une correction à la source.',
        patch: sc => ({ ...sc, forecastFactor: { ...sc.forecastFactor, [k.id]: factor } }),
      });
    }
    // R3 — rebut : stock trop ancien par rapport à la durée de vie
    const scrap = T.scrapped.slice(0, DAYS).reduce((x, y) => x + y, 0);
    if (scrap > 1) {
      out.push({
        id: `R3-${k.id}`, rule: 'Risque de péremption', severity: 'moyenne', compound: k.id,
        problem: `${k.label} : des lots dépassent leur durée de vie (${k.shelfLife} j) et sont rebutés.`,
        evidence: [`${fmt(scrap)} t rebutées sur la période simulée`, `Valeur : ${fmt(scrap * k.value / 1000, 1)} k€`, `Stock de sécurité actuel : ${fmt(k.safetyDays, 1)} j`],
        action: `Réduire le stock de sécurité de ${k.id} d’une demi-journée et vérifier la règle FIFO en stock intermédiaire.`,
        assumptions: 'Le rebut vient d’un surstock et non d’un problème de rotation physique, à vérifier sur le terrain.',
        patch: sc => ({ ...sc, safetyBy: { ...sc.safetyBy, [k.id]: (sc.safetyBy[k.id] ?? 0) - .5 } }),
      });
    }
  }
  // R4 — saturation : mélangeur au-delà de 95 % de sa capacité disponible sur la projection
  for (const x of MIXERS) {
    const M = r.m[x.id];
    const prod = M.produced.slice(a).reduce((p, q) => p + q, 0), cap = M.capacity.slice(a).reduce((p, q) => p + q, 0);
    if (cap && prod / cap > .95) {
      const crit = COMPOUNDS.filter(k => x.compounds.includes(k.id)).some(k => r.c[k.id].shortage.slice(a).some(v => v > .5));
      out.push({
        id: `R4-${x.id}`, rule: 'Goulot d’étranglement', severity: crit ? 'haute' : 'faible',
        problem: `${x.label} est saturé sur la projection.`,
        evidence: [`Charge réalisée / capacité disponible : ${pct(prod / cap)}`, crit ? 'Des mélanges qu’il produit sont en rupture' : 'Pas de rupture associée pour l’instant'],
        action: 'Prioriser la fabrication par criticité (A avant B avant C) plutôt que par couverture, le temps de lever la contrainte.',
        assumptions: 'Les mélanges de criticité A sont ceux dont l’arrêt coûte le plus ; la classification est à valider.',
        patch: sc => ({ ...sc, priority: 'criticite' }),
      });
    }
  }
  const order: Record<Severity, number> = { haute: 0, moyenne: 1, faible: 2 };
  return out.sort((p, q) => order[p.severity] - order[q.severity]);
}

/** Évalue l'effet de chaque recommandation en relançant la simulation (fenêtre : projection). */
/**
 * Garde-fou : une action n'est retenue que si la simulation montre un gain.
 * Retenue si le taux de service progresse sans hausse de coût total de plus de 10 %,
 * ou si le coût total baisse sans dégrader le taux de service de plus de 0,2 point.
 */
export function withExpected(demand: Record<string, DemandSeries>, s: Scenario, base: SimResult, recos: Reco[]): Reco[] {
  const before = kpis(base, TODAY, DAYS - 1);
  return recos.map(rc => {
    const after = kpis(simulate(demand, rc.patch(s)), TODAY, DAYS - 1);
    const dFill = after.fillRate - before.fillRate, dCost = after.cost.total - before.cost.total;
    const keep = (dFill > 1e-4 && dCost <= .1 * before.cost.total) || (dCost < -1 && dFill >= -.002);
    const verdictReason = keep
      ? (dFill > 1e-4 ? 'Le taux de service progresse dans la simulation.' : 'Le coût total baisse sans dégrader le service.')
      : (dFill < -1e-4 ? 'La simulation montre une dégradation du taux de service : l’intuition ne se vérifie pas ici.' : 'Aucun gain mesurable dans la simulation : à ne pas lancer en l’état.');
    return { ...rc, expected: { before, after }, verdict: keep ? 'retenue' : 'écartée', verdictReason };
  });
}

export const compoundById = (id: string): Compound => COMPOUNDS.find(c => c.id === id)!;
