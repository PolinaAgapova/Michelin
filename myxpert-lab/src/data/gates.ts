export type Status = 'ok' | 'todo' | 'block';

/** Score de préparation pondéré : vérifié = 1, à vérifier = 0,5, bloquant = 0. Un seul point bloquant empêche le lancement. */
export function readiness(checks: { weight: number; status: Status }[]) {
  const total = checks.reduce((s, c) => s + c.weight, 0) || 1;
  const score = checks.reduce((s, c) => s + c.weight * (c.status === 'ok' ? 1 : c.status === 'todo' ? .5 : 0), 0) / total;
  const blocked = checks.some(c => c.status === 'block');
  const verdict: 'go' | 'pilot' | 'no' = blocked ? 'no' : score >= .9 ? 'go' : score >= .6 ? 'pilot' : 'no';
  return { score, blocked, verdict };
}
