/**
 * Définitions des KPI. Fonctions pures, testées dans kpi.test.ts.
 * Toutes les fenêtres sont inclusives : [from, to].
 */
import { DAYS, F, type Dataset, type Diagnosis, type FeatureKey, type User, type Country, type Persona } from './model';

export interface Filter { from: number; to: number; countries: Country[]; personas: Persona[]; migratedOnly?: boolean }

export const isActive = (u: User, d: number) => d >= 0 && d < u.activity.length && u.activity[d] !== 0;

export function filterUsers(users: User[], f: Pick<Filter, 'countries' | 'personas' | 'migratedOnly'>): User[] {
  return users.filter(u => f.countries.includes(u.country) && f.personas.includes(u.persona) && (!f.migratedOnly || u.migrated));
}

/** Utilisateurs distincts actifs au moins une fois dans [a, b]. */
export function distinctActive(users: User[], a: number, b: number): number {
  let n = 0;
  for (const u of users) for (let d = Math.max(0, a); d <= b; d++) if (u.activity[d]) { n++; break; }
  return n;
}

/** DAU, WAU (fenêtre glissante 7 j) et MAU (fenêtre glissante 30 j) pour chaque jour de [from, to]. */
export function activeSeries(users: User[], from: number, to: number) {
  const dau: number[] = [], wau: number[] = [], mau: number[] = [];
  for (let d = from; d <= to; d++) {
    let x = 0, w = 0, m = 0;
    for (const u of users) {
      if (u.activity[d]) x++;
      let inW = false, inM = false;
      for (let k = d; k >= Math.max(0, d - 29); k--) if (u.activity[k]) { inM = true; if (k > d - 7) inW = true; break; }
      if (inW) w++;
      if (inM) m++;
    }
    dau.push(x); wau.push(w); mau.push(m);
  }
  return { dau, wau, mau };
}

/** Stickiness = moyenne sur la période du ratio DAU(d) / MAU(d). Les jours où MAU = 0 sont ignorés. */
export function stickiness(dau: number[], mau: number[]): number {
  let s = 0, n = 0;
  dau.forEach((v, i) => { if (mau[i] > 0) { s += v / mau[i]; n++; } });
  return n ? s / n : 0;
}

/** Cohorte : utilisateurs installés dans [from, to - minAge] (on ne compte que les cohortes observables). */
export function cohort(users: User[], from: number, to: number, minAge: number): User[] {
  return users.filter(u => u.install >= from && u.install <= to - minAge);
}

/** Rétention Dn « classique » : part de la cohorte active exactement au jour install + n. */
export function retention(users: User[], n: number, from: number, to: number): { rate: number; base: number } {
  const c = cohort(users, from, to, n);
  if (!c.length) return { rate: 0, base: 0 };
  return { rate: c.filter(u => isActive(u, u.install + n)).length / c.length, base: c.length };
}

/** Activation : part des nouveaux utilisateurs ayant TERMINÉ un diagnostic dans leurs 7 premiers jours. */
export function activation(users: User[], diagnoses: Diagnosis[], from: number, to: number): { rate: number; base: number } {
  const c = cohort(users, from, to, 6);
  if (!c.length) return { rate: 0, base: 0 };
  const done = firstCompletion(diagnoses);
  return { rate: c.filter(u => { const d = done.get(u.id); return d !== undefined && d <= u.install + 6; }).length / c.length, base: c.length };
}

function firstCompletion(diagnoses: Diagnosis[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const x of diagnoses) if (x.completed && (!m.has(x.user) || x.day < m.get(x.user)!)) m.set(x.user, x.day);
  return m;
}

export interface FunnelStep { label: string; count: number }
/**
 * Funnel d'activation sur la cohorte installée dans [from, to - 6].
 * Chaque étape exige la précédente ; fenêtre de 7 jours après l'installation.
 */
export function activationFunnel(users: User[], diagnoses: Diagnosis[], from: number, to: number): FunnelStep[] {
  const c = cohort(users, from, to, 6);
  const byUser = new Map<number, Diagnosis[]>();
  for (const x of diagnoses) { if (!byUser.has(x.user)) byUser.set(x.user, []); byUser.get(x.user)!.push(x); }
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0;
  for (const u of c) {
    const end = u.install + 6;
    let consulted = false, shared = false;
    for (let d = u.install; d <= end && d < DAYS; d++) {
      if (u.activity[d] & (F.selector | F.specs | F.pressure)) consulted = true;
      if (u.activity[d] & F.share) shared = true;
    }
    const ds = (byUser.get(u.id) || []).filter(x => x.day <= end);
    const started = ds.length > 0, completed = ds.some(x => x.completed);
    if (!consulted && !started) continue;
    s1++;
    if (!started) continue;
    s2++;
    if (!completed) continue;
    s3++;
    if (shared) s4++;
  }
  return [
    { label: 'Installation', count: c.length },
    { label: 'Première consultation ou diagnostic', count: s1 },
    { label: 'Premier diagnostic démarré', count: s2 },
    { label: 'Premier diagnostic terminé', count: s3 },
    { label: 'Premier résultat partagé', count: s4 },
  ];
}

/** Adoption : part des utilisateurs actifs sur [a, b] ayant utilisé chaque fonctionnalité au moins une fois. */
export function featureAdoption(users: User[], a: number, b: number): Record<FeatureKey, number> {
  const keys: FeatureKey[] = ['selector', 'specs', 'diag', 'pressure', 'share'];
  const used: Record<string, number> = Object.fromEntries(keys.map(k => [k, 0]));
  let active = 0;
  for (const u of users) {
    let mask = 0;
    for (let d = Math.max(0, a); d <= b; d++) mask |= u.activity[d];
    if (!mask) continue;
    active++;
    for (const k of keys) if (mask & F[k]) used[k]++;
  }
  return Object.fromEntries(keys.map(k => [k, active ? used[k] / active : 0])) as Record<FeatureKey, number>;
}

export function diagnosesIn(ds: Diagnosis[], ids: Set<number>, a: number, b: number) {
  return ds.filter(x => x.day >= a && x.day <= b && ids.has(x.user));
}

/** Taux de complétion = diagnostics terminés / diagnostics démarrés. */
export function completionRate(ds: Diagnosis[]): number {
  return ds.length ? ds.filter(x => x.completed).length / ds.length : 0;
}

/**
 * Abandons par étape : nombre de diagnostics qui se sont arrêtés à chaque étape (hors étape finale),
 * et taux d'abandon conditionnel = arrêts à l'étape / diagnostics ayant atteint l'étape.
 */
export function stepAbandon(ds: Diagnosis[], steps = 5) {
  const reached = new Array(steps).fill(0), stopped = new Array(steps).fill(0);
  for (const x of ds) {
    for (let s = 1; s <= x.reached; s++) reached[s - 1]++;
    if (!x.completed) stopped[x.reached - 1]++;
  }
  return reached.map((r, i) => ({ step: i + 1, reached: r, stopped: stopped[i], rate: r ? stopped[i] / r : 0 }));
}

export function csat(ratings: Dataset['ratings'], ids: Set<number>, a: number, b: number) {
  const rs = ratings.filter(x => x.day >= a && x.day <= b && ids.has(x.user));
  const dist = [0, 0, 0, 0, 0];
  rs.forEach(x => dist[x.score - 1]++);
  const mean = rs.length ? rs.reduce((s, x) => s + x.score, 0) / rs.length : 0;
  const satisfied = rs.length ? (dist[3] + dist[4]) / rs.length : 0; // CSAT = part de 4 et 5
  const sat = (xs: typeof rs) => (xs.length ? xs.filter(x => x.score >= 4).length / xs.length : 0);
  const weak = rs.filter(x => x.weak), ok = rs.filter(x => !x.weak);
  return { n: rs.length, mean, satisfied, dist, weak: { n: weak.length, satisfied: sat(weak) }, ok: { n: ok.length, satisfied: sat(ok) } };
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
