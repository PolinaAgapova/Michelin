import { describe, expect, it } from 'vitest';
import { COMPOUNDS, DAYS, MIXERS, TODAY, HISTORY } from './config';
import { generateDemand } from './demand';
import { BASE, simulate } from './sim';
import { forecastMetrics, kpis } from './kpi';
import { recommend, withExpected } from './rules';

const dm = generateDemand();
const base = simulate(dm);
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('indicateurs de prévision', () => {
  // F = 110, 90, 100 ; A = 100, 100, 100
  const F = [110, 90, 100], A = [100, 100, 100];
  it('biais, WAPE, précision, MAPE, écart', () => {
    const m = forecastMetrics(F, A, 0, 2);
    expect(m.bias).toBeCloseTo(0);
    expect(m.wape).toBeCloseTo(20 / 300);
    expect(m.accuracy).toBeCloseTo(1 - 20 / 300);
    expect(m.mape).toBeCloseTo(20 / 300);
    expect(m.gap).toBeCloseTo(0);
  });
  it('MAPE non applicable quand tous les réels sont nuls', () => {
    expect(Number.isNaN(forecastMetrics([5, 5], [0, 0], 0, 1).mape)).toBe(true);
  });
  it('biais positif = sur-prévision', () => {
    expect(forecastMetrics([120, 120], [100, 100], 0, 1).bias).toBeCloseTo(.2);
  });
});

describe('moteur de simulation', () => {
  it('conserve la matière : stock initial + produit − servi − rebuté = stock final', () => {
    // le stock est relevé après le service du jour et avant la production du jour : la production du dernier jour n'y figure pas encore
    for (const k of COMPOUNDS) {
      const T = base.c[k.id];
      const end = T.available[DAYS - 1] + T.maturing[DAYS - 1];
      expect(k.initialStock + total(T.produced) - T.produced[DAYS - 1] - total(T.served) - total(T.scrapped)).toBeCloseTo(end, 6);
    }
  });
  it('ne produit jamais au-delà de la capacité disponible', () => {
    for (const x of MIXERS) base.m[x.id].produced.forEach((p, d) => expect(p).toBeLessThanOrEqual(base.m[x.id].capacity[d] + 1e-9));
  });
  it('n’a ni stock ni rupture négatifs', () => {
    for (const k of COMPOUNDS) for (const key of ['available', 'maturing', 'shortage', 'backlog'] as const) base.c[k.id][key].forEach(v => expect(v).toBeGreaterThanOrEqual(-1e-9));
  });
  it('est déterministe', () => {
    expect(kpis(simulate(generateDemand()), 0, DAYS - 1)).toEqual(kpis(base, 0, DAYS - 1));
  });
  it('les scénarios ne modifient pas l’historique', () => {
    const s = simulate(dm, { ...BASE, demandIncrease: .3, safetyExtra: 2 });
    expect(kpis(s, 0, HISTORY - 1)).toEqual(kpis(base, 0, HISTORY - 1));
  });
  it('+20 % de besoins non anticipés dégradent le service', () => {
    const s = simulate(dm, { ...BASE, demandIncrease: .2 });
    expect(kpis(s, TODAY, DAYS - 1).fillRate).toBeLessThan(kpis(base, TODAY, DAYS - 1).fillRate);
  });
  it('arrêter un mélangeur augmente les ruptures', () => {
    const s = simulate(dm, { ...BASE, cut: { mixer: 'M2', pct: 1, start: 0, duration: 4 } });
    expect(kpis(s, TODAY, DAYS - 1).shortage).toBeGreaterThan(kpis(base, TODAY, DAYS - 1).shortage);
  });
  it('un retard de mise à disposition dégrade le respect des délais', () => {
    const s = simulate(dm, { ...BASE, delay: { days: 2, start: 0, duration: 3 } });
    expect(kpis(s, TODAY, DAYS - 1).onTime).toBeLessThan(kpis(base, TODAY, DAYS - 1).onTime);
  });
  it('plus de stock de sécurité = plus de stock, et coût de possession plus élevé', () => {
    const s = simulate(dm, { ...BASE, safetyExtra: 1 });
    expect(kpis(s, TODAY, DAYS - 1).cost.holding).toBeGreaterThan(kpis(base, TODAY, DAYS - 1).cost.holding);
  });
  it('un ordre ajouté ne dépasse jamais la capacité nominale', () => {
    const s = simulate(dm, { ...BASE, extraOrders: [{ compound: 'FL-A', mixer: 'M1', day: 0, qty: 10_000 }] });
    s.m.M1.planned.forEach(p => expect(p).toBeLessThanOrEqual(84 + 1e-9));
  });
});

describe('recommandations', () => {
  const recos = withExpected(dm, BASE, base, recommend(dm, BASE, base));
  it('détectent la rupture projetée et le biais de prévision du cas de démonstration', () => {
    expect(recos.some(r => r.id === 'R1-FL-A')).toBe(true);
    expect(recos.some(r => r.id === 'R2-FL-A')).toBe(true);
  });
  it('une action retenue améliore réellement le résultat simulé', () => {
    for (const r of recos.filter(r => r.verdict === 'retenue')) {
      const e = r.expected!;
      expect(e.after.fillRate > e.before.fillRate || e.after.cost.total < e.before.cost.total).toBe(true);
    }
  });
  it('une action qui dégrade le service est écartée', () => {
    for (const r of recos) if (r.expected!.after.fillRate < r.expected!.before.fillRate - .002) expect(r.verdict).toBe('écartée');
  });
});
