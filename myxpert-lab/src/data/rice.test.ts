import { describe, expect, it } from 'vitest';
import { normInv, plan, rice, sampleSizePerArm, type Item } from './rice';

describe('RICE', () => {
  it('calcule (R × I × C) / E', () => {
    expect(rice({ reach: 1000, impact: 2, confidence: .8, effort: 4 })).toBe(400);
  });
  it('refuse un effort nul', () => {
    expect(() => rice({ reach: 1, impact: 1, confidence: 1, effort: 0 })).toThrow();
  });
});

describe('roadmap', () => {
  const items: Item[] = [
    { id: 'a', title: 'A', reach: 1000, impact: 3, confidence: 1, effort: 2 },     // 1500
    { id: 'b', title: 'B', reach: 1000, impact: 1, confidence: 1, effort: 1 },     // 1000
    { id: 'c', title: 'C', reach: 1000, impact: 2, confidence: 1, effort: 1, dependsOn: ['b'] }, // 2000
    { id: 'd', title: 'D', reach: 100, impact: 1, confidence: .5, effort: 1, deadline: true },   // 50
  ];
  const h = (p: ReturnType<typeof plan>, id: string) => p.find(x => x.id === id)!.horizon;

  it('ne place jamais un élément avant sa dépendance', () => {
    const p = plan(items, { now: 10, next: 10 }, false);
    expect(h(p, 'b')).toBe('now');
    expect(h(p, 'c')).toBe('next');
  });
  it('respecte la capacité', () => {
    const p = plan(items, { now: 2, next: 1 }, false);
    expect(h(p, 'a')).toBe('now');   // meilleur score sans dépendance
    expect(h(p, 'b')).toBe('next');
    expect(h(p, 'c')).toBe('later'); // sa dépendance est en Next
  });
  it('fait passer la contrainte de calendrier en premier si demandé', () => {
    expect(h(plan(items, { now: 2, next: 2 }, false), 'd')).not.toBe('now');
    expect(h(plan(items, { now: 2, next: 2 }, true), 'd')).toBe('now');
  });
});

describe('taille d’échantillon', () => {
  it('quantiles normaux usuels', () => {
    expect(normInv(.975)).toBeCloseTo(1.959964, 5);
    expect(normInv(.8)).toBeCloseTo(.841621, 5);
  });
  it('cas de référence : 10 % → 12 %, α = 5 %, puissance 80 %', () => {
    // (1.95996 + 0.84162)² = 7.84886 ; × (0.09 + 0.1056) = 1.53524 ; / 0.0004 = 3 838,1 → 3 839
    expect(sampleSizePerArm(.10, .12)).toBe(3839);
  });
  it('plus l’effet est petit, plus il faut d’utilisateurs', () => {
    expect(sampleSizePerArm(.7, .72)).toBeGreaterThan(sampleSizePerArm(.7, .75));
  });
});
