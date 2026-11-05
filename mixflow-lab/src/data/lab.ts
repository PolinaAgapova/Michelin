/**
 * Analyses du cycle de vie des mélanges de laboratoire. Données FICTIVES (voir powerapps/generate.py),
 * identiques à celles du kit Power Apps.
 */
import raw from './dataset.json';

export interface Melange { code: string; libelle: string; famille: string; dureeVie: number; conservation: string; labo: string }
export interface Emplacement { code: string; zone: string; niveau: number; ergo: 'Or' | 'Argent' | 'Bronze'; conservation: string; capacite: number }
export interface Lot { num: string; melange: string; fab: string; peremption: string; qteInit: number; qteReste: number; emplacement: string | null; statut: string; labo: string }
export interface Mouvement { id: string; lot: string; date: string; type: string; qte: number; de: string | null; vers: string | null; user: string; commentaire: string | null }
export interface Dataset { ref: string; melanges: Melange[]; emplacements: Emplacement[]; lots: Lot[]; mouvements: Mouvement[] }

export const DATA = raw as unknown as Dataset;

export const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
export const inStock = (l: Lot) => l.statut !== 'Détruit' && l.statut !== 'Épuisé';
export const isExpired = (l: Lot, ref: string) => inStock(l) && l.peremption < ref;
export const expiresSoon = (l: Lot, ref: string, n = 7) => inStock(l) && l.peremption >= ref && l.peremption <= addDays(ref, n);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);

export function indexes(ds: Dataset) {
  const mel = new Map(ds.melanges.map(m => [m.code, m]));
  const emp = new Map(ds.emplacements.map(e => [e.code, e]));
  const mv = new Map<string, Mouvement[]>();
  for (const m of ds.mouvements) { if (!mv.has(m.lot)) mv.set(m.lot, []); mv.get(m.lot)!.push(m); }
  return { mel, emp, mv };
}

/** Indicateurs du cycle de vie, de la commande à la fin de vie. */
export function lifecycle(ds: Dataset) {
  const { mv } = indexes(ds);
  const ended = ds.lots.filter(l => !inStock(l));
  const destroyed = ds.lots.filter(l => l.statut === 'Détruit');
  const destroyedExpiry = destroyed.filter(l => (mv.get(l.num) || []).some(m => m.type === 'Fin de vie' && m.commentaire === 'Péremption'));
  const kgDestroyed = sum(ds.mouvements.filter(m => m.type === 'Fin de vie').map(m => m.qte));
  const kgUsed = sum(ds.mouvements.filter(m => m.type === 'Prélèvement').map(m => m.qte));
  const kgMade = sum(ds.lots.map(l => l.qteInit));
  const toShelf = ds.lots.map(l => { const ms = mv.get(l.num) || []; const c = ms.find(m => m.type === 'Création'), r = ms.find(m => m.type === 'Rangement'); return c && r ? days(c.date, r.date) : NaN; }).filter(Number.isFinite);
  const firstUse = ds.lots.map(l => { const ms = mv.get(l.num) || []; const r = ms.find(m => m.type === 'Rangement'), p = ms.find(m => m.type === 'Prélèvement'); return r && p ? days(r.date, p.date) : NaN; }).filter(Number.isFinite);
  const neverUsed = ds.lots.filter(l => !(mv.get(l.num) || []).some(m => m.type === 'Prélèvement'));
  const expired = ds.lots.filter(l => isExpired(l, ds.ref));
  return {
    lots: ds.lots.length, inStock: ds.lots.filter(inStock).length, ended: ended.length,
    destroyed: destroyed.length, destroyedExpiry: destroyedExpiry.length, exhausted: ds.lots.filter(l => l.statut === 'Épuisé').length,
    expiryRate: ended.length ? destroyedExpiry.length / ended.length : 0,
    kgMade, kgUsed, kgDestroyed, usedShare: kgMade ? kgUsed / kgMade : 0,
    toShelfDays: mean(toShelf), firstUseDays: mean(firstUse), neverUsed: neverUsed.length,
    expiredInStock: expired.length, kgExpiredInStock: sum(expired.map(l => l.qteReste)),
    soon: ds.lots.filter(l => expiresSoon(l, ds.ref)).length,
  };
}

export interface Anomaly { rule: string; lot: string; detail: string; severity: 'haute' | 'moyenne' }
/** Contrôles de cohérence des données de stock : la traçabilité n'est fiable que si ces contrôles sont propres. */
export function qualityChecks(ds: Dataset): Anomaly[] {
  const { mel, emp, mv } = indexes(ds);
  const out: Anomaly[] = [];
  for (const l of ds.lots.filter(inStock)) {
    const m = mel.get(l.melange)!, e = l.emplacement ? emp.get(l.emplacement) : undefined;
    if (l.peremption < ds.ref) out.push({ rule: 'Lot périmé encore en stock', lot: l.num, detail: `Périmé depuis ${days(l.peremption, ds.ref)} j · ${l.qteReste} kg · ${l.emplacement}`, severity: 'haute' });
    if (!e) out.push({ rule: 'Emplacement absent ou inconnu', lot: l.num, detail: `Emplacement « ${l.emplacement ?? '—'} »`, severity: 'haute' });
    else if (e.conservation !== m.conservation) out.push({ rule: 'Conditions de conservation non respectées', lot: l.num, detail: `${m.conservation} exigé, rangé en ${e.zone} (${e.code})`, severity: 'haute' });
    const used = sum((mv.get(l.num) || []).filter(x => x.type === 'Prélèvement').map(x => x.qte));
    const gap = Math.round((l.qteInit - used - l.qteReste) * 10) / 10;
    if (Math.abs(gap) > .05) out.push({ rule: 'Stock incohérent avec l’historique', lot: l.num, detail: `Reste déclaré ${l.qteReste} kg, attendu ${Math.round((l.qteInit - used) * 10) / 10} kg (écart ${gap > 0 ? '+' : ''}${-gap} kg)`, severity: 'moyenne' });
    const placed = (mv.get(l.num) || []).filter(x => x.type === 'Rangement' || x.type === 'Déplacement').at(-1);
    if (placed && e && placed.vers !== l.emplacement) out.push({ rule: 'Déplacement non tracé', lot: l.num, detail: `Dernier mouvement vers ${placed.vers}, lot trouvé en ${l.emplacement}`, severity: 'moyenne' });
  }
  return out;
}

/** Nombre de prélèvements d'un lot sur les n derniers jours. */
export function picks(ds: Dataset, n = 60): Map<string, number> {
  const from = addDays(ds.ref, -n), out = new Map<string, number>();
  for (const m of ds.mouvements) if (m.type === 'Prélèvement' && m.date >= from && m.date <= ds.ref) out.set(m.lot, (out.get(m.lot) ?? 0) + 1);
  return out;
}

/** Classes ABC sur les lots en stock : A = lots qui cumulent 80 % des prélèvements, B = 15 % suivants, C = le reste. */
export function abc(ds: Dataset, p = picks(ds)): Map<string, 'A' | 'B' | 'C'> {
  const lots = ds.lots.filter(l => inStock(l) && !isExpired(l, ds.ref)).sort((a, b) => (p.get(b.num) ?? 0) - (p.get(a.num) ?? 0));
  const total = sum(lots.map(l => p.get(l.num) ?? 0));
  const out = new Map<string, 'A' | 'B' | 'C'>(); let cum = 0;
  for (const l of lots) {
    const v = p.get(l.num) ?? 0;
    out.set(l.num, !v || !total ? 'C' : cum / total < .8 ? 'A' : cum / total < .95 ? 'B' : 'C');
    cum += v;
  }
  return out;
}

/**
 * Pénibilité d'un prélèvement selon l'emplacement (hypothèse à valider avec un ergonome) :
 * niveaux 2–3 (zone Or, hauteur de taille) = 1 ; niveau 1 (se baisser) = 2 ; niveau 4 = 2 ; niveau 5 (bras levés, escabeau) = 3.
 * Les zones B et D, plus éloignées du quai, comptent 30 % de déplacement en plus.
 */
export const LEVEL_COST: Record<number, number> = { 1: 2, 2: 1, 3: 1, 4: 2, 5: 3 };
export const ZONE_FACTOR: Record<string, number> = { A: 1, B: 1.3, C: 1, D: 1.3 };
export const slotCost = (e: Emplacement) => LEVEL_COST[e.niveau] * (ZONE_FACTOR[e.code[0]] ?? 1);

export function effort(ds: Dataset, placement: Map<string, string>, p = picks(ds)): number {
  const { emp } = indexes(ds);
  let s = 0;
  for (const [lot, code] of placement) { const e = emp.get(code); if (e) s += (p.get(lot) ?? 0) * slotCost(e); }
  return s;
}

export interface Move { lot: string; from: string; to: string; gain: number }
/**
 * Réimplantation gloutonne avec un budget de déplacements : à chaque étape, on déplace le lot qui fait gagner
 * le plus de pénibilité vers un emplacement libre compatible (même conservation, capacité respectée).
 * Les lots périmés sont exclus : ils doivent sortir du stock, pas être réimplantés.
 */
export function reslot(ds: Dataset, budget: number, p = picks(ds)) {
  const { emp, mel } = indexes(ds);
  const placement = new Map(ds.lots.filter(l => inStock(l) && !isExpired(l, ds.ref) && l.emplacement && emp.get(l.emplacement)).map(l => [l.num, l.emplacement as string]));
  const load = new Map<string, number>();
  for (const l of ds.lots.filter(l => inStock(l) && l.emplacement)) load.set(l.emplacement as string, (load.get(l.emplacement as string) ?? 0) + 1);
  const before = effort(ds, placement, p);
  const moves: Move[] = [];
  const conservationOf = new Map(ds.lots.map(l => [l.num, mel.get(l.melange)!.conservation]));
  for (let k = 0; k < budget; k++) {
    let best: Move | null = null;
    for (const [lot, code] of placement) {
      const n = p.get(lot) ?? 0; if (!n) continue;
      const cur = slotCost(emp.get(code)!);
      for (const e of ds.emplacements) {
        if (e.conservation !== conservationOf.get(lot) || (load.get(e.code) ?? 0) >= e.capacite) continue;
        const gain = n * (cur - slotCost(e));
        if (gain > 1e-9 && (!best || gain > best.gain)) best = { lot, from: code, to: e.code, gain };
      }
    }
    if (!best) break;
    placement.set(best.lot, best.to);
    load.set(best.from, (load.get(best.from) ?? 1) - 1);
    load.set(best.to, (load.get(best.to) ?? 0) + 1);
    moves.push(best);
  }
  return { before, after: effort(ds, placement, p), moves, placement, load };
}
