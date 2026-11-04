/** Priorisation RICE, allocation Now / Next / Later et taille d'échantillon A/B. */

export type Horizon = 'now' | 'next' | 'later';

export interface Item {
  id: string;
  title: string;
  reach: number;        // utilisateurs touchés par trimestre
  impact: number;       // 0.25 · 0.5 · 1 · 2 · 3
  confidence: number;   // 0.5 · 0.8 · 1
  effort: number;       // personne-mois
  dependsOn?: string[];
  deadline?: boolean;   // contrainte de calendrier (ex. décommissionnement)
}

/** RICE = (Reach × Impact × Confidence) / Effort. */
export function rice(i: Pick<Item, 'reach' | 'impact' | 'confidence' | 'effort'>): number {
  if (i.effort <= 0) throw new Error('effort must be > 0');
  return (i.reach * i.impact * i.confidence) / i.effort;
}

export interface Capacity { now: number; next: number }
export interface Placement { id: string; horizon: Horizon; score: number; reason: string }

/**
 * Remplit Now puis Next selon la capacité (personne-mois), par score RICE décroissant.
 * - un élément n'est jamais planifié avant ses dépendances ;
 * - si respectDeadlines, les éléments à contrainte de calendrier passent en premier ;
 * - ce qui ne rentre pas va en Later.
 */
export function plan(items: Item[], cap: Capacity, respectDeadlines: boolean): Placement[] {
  const order = [...items].sort((a, b) => {
    if (respectDeadlines && !!a.deadline !== !!b.deadline) return a.deadline ? -1 : 1;
    return rice(b) - rice(a);
  });
  const left = { now: cap.now, next: cap.next };
  const placed = new Map<string, Placement>();
  const rank: Record<Horizon, number> = { now: 0, next: 1, later: 2 };
  const pending = [...order];
  let guard = 0;
  while (pending.length && guard++ < 1000) {
    const idx = pending.findIndex(i => (i.dependsOn || []).every(d => placed.has(d) || !items.some(x => x.id === d)));
    if (idx === -1) break; // dépendance circulaire : le reste part en Later ci-dessous
    const it = pending.splice(idx, 1)[0];
    const minRank = Math.max(0, ...(it.dependsOn || []).map(d => (placed.get(d) ? rank[placed.get(d)!.horizon] + 1 : 0)));
    let horizon: Horizon = 'later', reason = 'Capacité épuisée';
    if (minRank <= 0 && left.now >= it.effort) { horizon = 'now'; left.now -= it.effort; reason = it.deadline && respectDeadlines ? 'Contrainte de calendrier' : 'Score RICE et capacité disponible'; }
    else if (minRank <= 1 && left.next >= it.effort) { horizon = 'next'; left.next -= it.effort; reason = minRank === 1 ? 'Après sa dépendance' : 'Capacité Now épuisée'; }
    else if (minRank >= 2) reason = 'Après sa dépendance';
    placed.set(it.id, { id: it.id, horizon, score: rice(it), reason });
  }
  for (const it of pending) placed.set(it.id, { id: it.id, horizon: 'later', score: rice(it), reason: 'Dépendance circulaire' });
  return items.map(i => placed.get(i.id)!);
}

/** Quantile de la loi normale centrée réduite (approximation d'Acklam, erreur < 1e-8). */
export function normInv(p: number): number {
  if (p <= 0 || p >= 1) throw new Error('p must be in ]0,1[');
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = .02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) return -normInv(1 - p);
  const q = p - .5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Taille d'échantillon par groupe pour comparer deux proportions (test bilatéral) :
 * n = (z(1−α/2) + z(1−β))² × [p1(1−p1) + p2(1−p2)] / (p2 − p1)²
 */
export function sampleSizePerArm(p1: number, p2: number, alpha = .05, power = .8): number {
  if (p1 === p2) return Infinity;
  const z = normInv(1 - alpha / 2) + normInv(power);
  return Math.ceil((z * z * (p1 * (1 - p1) + p2 * (1 - p2))) / ((p2 - p1) ** 2));
}
