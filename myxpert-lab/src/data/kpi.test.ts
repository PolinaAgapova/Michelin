import { describe, expect, it } from 'vitest';
import { F, generate, type Diagnosis, type User } from './model';
import { activation, activationFunnel, activeSeries, completionRate, csat, distinctActive, featureAdoption, retention, stepAbandon, stickiness } from './kpi';

/** Petit jeu de données écrit à la main : chaque résultat attendu se vérifie de tête. */
function user(id: number, install: number, days: Record<number, number>, len = 40): User {
  const activity = new Uint8Array(len);
  for (const [d, m] of Object.entries(days)) activity[+d] = m;
  return { id, country: 'FR', persona: 'atelier', install, migrated: false, inspectionUser: false, activity };
}
const O = F.open;
const users = [
  user(1, 0, { 0: O, 1: O, 7: O, 30: O }),
  user(2, 0, { 0: O | F.diag, 2: O | F.share }),
  user(3, 5, { 5: O | F.selector }),
];
const diags: Diagnosis[] = [
  { user: 2, day: 0, reached: 5, completed: true, weakNetwork: false },
  { user: 1, day: 1, reached: 3, completed: false, weakNetwork: true },
  { user: 1, day: 7, reached: 3, completed: false, weakNetwork: true },
  { user: 3, day: 5, reached: 1, completed: false, weakNetwork: false },
];

describe('activité', () => {
  it('compte les utilisateurs distincts sur une fenêtre', () => {
    expect(distinctActive(users, 0, 0)).toBe(2);
    expect(distinctActive(users, 0, 6)).toBe(3);
    expect(distinctActive(users, 8, 29)).toBe(0);
  });
  it('calcule DAU, WAU glissant et MAU glissant', () => {
    const { dau, wau, mau } = activeSeries(users, 0, 8);
    expect(dau).toEqual([2, 1, 1, 0, 0, 1, 0, 1, 0]);
    // jour 7 : actifs sur [1..7] = u1 (j1, j7), u2 (j2), u3 (j5)
    expect(wau[7]).toBe(3);
    // jour 8 : actifs sur [2..8] = u1 (j7), u2 (j2), u3 (j5)
    expect(wau[8]).toBe(3);
    expect(mau[8]).toBe(3);
  });
  it('stickiness = moyenne de DAU/MAU, jours sans MAU ignorés', () => {
    expect(stickiness([1, 2], [2, 4])).toBeCloseTo(.5);
    expect(stickiness([0, 1], [0, 4])).toBeCloseTo(.25);
  });
});

describe('rétention et activation', () => {
  it('D1 classique sur les cohortes observables', () => {
    // cohortes installées dans [0, 39-1] : u1, u2, u3 ; actifs à install+1 : u1 seulement
    expect(retention(users, 1, 0, 39)).toEqual({ rate: 1 / 3, base: 3 });
  });
  it('D30 exclut les cohortes trop récentes', () => {
    // fin = 35 : seules les installations ≤ 5 sont observables → u1, u2, u3 ; u1 actif au jour 30
    expect(retention(users, 30, 0, 35)).toEqual({ rate: 1 / 3, base: 3 });
    expect(retention(users, 30, 0, 32).base).toBe(2); // u3 (install 5) exclu
  });
  it('activation = diagnostic terminé dans les 7 premiers jours', () => {
    expect(activation(users, diags, 0, 39)).toEqual({ rate: 1 / 3, base: 3 });
  });
  it('funnel monotone, chaque étape exige la précédente', () => {
    const f = activationFunnel(users, diags, 0, 39).map(s => s.count);
    expect(f).toEqual([3, 3, 3, 1, 1]);
    for (let i = 1; i < f.length; i++) expect(f[i]).toBeLessThanOrEqual(f[i - 1]);
  });
});

describe('diagnostic', () => {
  it('taux de complétion', () => expect(completionRate(diags)).toBe(.25));
  it('abandons par étape : arrêts / diagnostics ayant atteint l’étape', () => {
    const s = stepAbandon(diags);
    expect(s.map(x => x.reached)).toEqual([4, 3, 3, 1, 1]);
    expect(s.map(x => x.stopped)).toEqual([1, 0, 2, 0, 0]);
    expect(s[2].rate).toBeCloseTo(2 / 3);
  });
  it('CSAT = part des notes 4 et 5', () => {
    const r = csat([{ user: 1, day: 0, score: 5 }, { user: 1, day: 1, score: 2 }, { user: 2, day: 1, score: 4 }, { user: 9, day: 1, score: 1 }], new Set([1, 2]), 0, 10);
    expect(r.n).toBe(3);
    expect(r.mean).toBeCloseTo(11 / 3);
    expect(r.satisfied).toBeCloseTo(2 / 3);
  });
});

describe('adoption', () => {
  it('rapportée aux utilisateurs actifs de la fenêtre', () => {
    const a = featureAdoption(users, 0, 6);
    expect(a.diag).toBeCloseTo(1 / 3);
    expect(a.selector).toBeCloseTo(1 / 3);
    expect(a.share).toBeCloseTo(1 / 3);
  });
});

describe('modèle synthétique', () => {
  const ds = generate();
  it('est déterministe', () => {
    const again = generate();
    expect(again.diagnoses.length).toBe(ds.diagnoses.length);
    expect(again.users[42].activity).toEqual(ds.users[42].activity);
  });
  it('contient bien le signal S1 : plus d’abandons à l’étape photo en réseau faible', () => {
    const weak = stepAbandon(ds.diagnoses.filter(d => d.weakNetwork))[2].rate;
    const ok = stepAbandon(ds.diagnoses.filter(d => !d.weakNetwork))[2].rate;
    expect(weak).toBeGreaterThan(ok * 2);
  });
  it('reste cohérent : WAU ≤ MAU et DAU ≤ WAU chaque jour', () => {
    const { dau, wau, mau } = activeSeries(ds.users, 30, 119);
    dau.forEach((v, i) => { expect(v).toBeLessThanOrEqual(wau[i]); expect(wau[i]).toBeLessThanOrEqual(mau[i]); });
  });
});
