import { describe, expect, it } from 'vitest';
import { readiness } from './gates';

describe('préparation d’un marché', () => {
  it('tout à vérifier = 50 % → pas prêt', () => {
    expect(readiness([{ weight: 3, status: 'todo' }, { weight: 1, status: 'todo' }])).toEqual({ score: .5, blocked: false, verdict: 'no' });
  });
  it('pondère par le poids : 3 vérifiés sur 4 de poids, 1 à vérifier → 87,5 % → pilote', () => {
    const r = readiness([{ weight: 3, status: 'ok' }, { weight: 1, status: 'todo' }]);
    expect(r.score).toBeCloseTo(.875);
    expect(r.verdict).toBe('pilot');
  });
  it('un point bloquant suffit à empêcher le lancement', () => {
    expect(readiness([{ weight: 9, status: 'ok' }, { weight: 1, status: 'block' }]).verdict).toBe('no');
  });
  it('tout vérifié → lancement', () => {
    expect(readiness([{ weight: 2, status: 'ok' }]).verdict).toBe('go');
  });
});
