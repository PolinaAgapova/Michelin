import { describe, expect, it } from 'vitest';
import { DATA, abc, effort, indexes, lifecycle, picks, qualityChecks, reslot, slotCost, type Dataset } from './lab';

describe('cycle de vie', () => {
  const lc = lifecycle(DATA);
  it('chaque lot est soit en stock, soit terminé', () => {
    expect(lc.inStock + lc.ended).toBe(lc.lots);
    expect(lc.destroyed + lc.exhausted).toBe(lc.ended);
  });
  it('la matière utilisée ne dépasse pas la matière fabriquée', () => {
    expect(lc.kgUsed + lc.kgDestroyed).toBeLessThanOrEqual(lc.kgMade + 1e-6);
  });
});

describe('contrôles de qualité des données', () => {
  const a = qualityChecks(DATA);
  it('détectent les anomalies injectées dans le jeu de démonstration', () => {
    expect(a.filter(x => x.rule === 'Conditions de conservation non respectées').length).toBe(2);
    expect(a.filter(x => x.rule === 'Stock incohérent avec l’historique').length).toBe(2);
    expect(a.filter(x => x.rule === 'Lot périmé encore en stock').length).toBe(lifecycle(DATA).expiredInStock);
  });
  it('un jeu propre ne déclenche aucune alerte', () => {
    const ds: Dataset = {
      ref: '2026-11-05',
      melanges: [{ code: 'M', libelle: 'm', famille: 'f', dureeVie: 30, conservation: 'Ambiant', labo: 'L' }],
      emplacements: [{ code: 'C-N2-P1', zone: 'Rack ambiant C', niveau: 2, ergo: 'Or', conservation: 'Ambiant', capacite: 4 }],
      lots: [{ num: 'L1', melange: 'M', fab: '2026-11-01', peremption: '2026-12-01', qteInit: 5, qteReste: 4, emplacement: 'C-N2-P1', statut: 'Disponible', labo: 'L' }],
      mouvements: [
        { id: '1', lot: 'L1', date: '2026-11-02', type: 'Rangement', qte: 5, de: 'Quai', vers: 'C-N2-P1', user: 'u', commentaire: null },
        { id: '2', lot: 'L1', date: '2026-11-03', type: 'Prélèvement', qte: 1, de: 'C-N2-P1', vers: null, user: 'u', commentaire: null },
      ],
    };
    expect(qualityChecks(ds)).toEqual([]);
  });
});

describe('stockage', () => {
  it('pénibilité : zone Or proche = 1, niveau 5 éloigné = 3 × 1,3', () => {
    const { emp } = indexes(DATA);
    expect(slotCost(emp.get('A-N2-P1')!)).toBe(1);
    expect(slotCost(emp.get('B-N5-P1')!)).toBeCloseTo(3.9);
  });
  it('ABC : A regroupe environ 80 % des prélèvements', () => {
    const p = picks(DATA), cls = abc(DATA, p);
    const tot = [...cls.keys()].reduce((s, l) => s + (p.get(l) ?? 0), 0);
    const a = [...cls].filter(([, c]) => c === 'A').reduce((s, [l]) => s + (p.get(l) ?? 0), 0);
    expect(a / tot).toBeGreaterThanOrEqual(.75);
  });
  it('la réimplantation réduit la pénibilité et respecte budget, conservation et capacité', () => {
    const r = reslot(DATA, 10);
    expect(r.moves.length).toBeLessThanOrEqual(10);
    expect(r.after).toBeLessThan(r.before);
    const { emp, mel } = indexes(DATA);
    for (const m of r.moves) {
      const lot = DATA.lots.find(l => l.num === m.lot)!;
      expect(emp.get(m.to)!.conservation).toBe(mel.get(lot.melange)!.conservation);
    }
    for (const [code, n] of r.load) expect(n).toBeLessThanOrEqual(emp.get(code)!.capacite);
  });
  it('plus de budget ne fait jamais moins bien', () => {
    expect(reslot(DATA, 20).after).toBeLessThanOrEqual(reslot(DATA, 5).after);
    expect(reslot(DATA, 0).after).toBe(reslot(DATA, 0).before);
  });
  it('l’effort se calcule à la main sur un cas simple', () => {
    const p = new Map([['X', 3]]);
    expect(effort(DATA, new Map([['X', 'B-N5-P1']]), p)).toBeCloseTo(3 * 3.9);
  });
});
