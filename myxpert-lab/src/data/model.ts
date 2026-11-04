/**
 * Modèle d'événements utilisateurs SYNTHÉTIQUE.
 * Toutes les valeurs sont fictives. Elles ne représentent aucune donnée réelle de Michelin ou de MyXpert.
 *
 * Le générateur est déterministe (graine fixe) : mêmes données à chaque chargement, donc des tests stables.
 * Trois « signaux » sont volontairement injectés pour la démonstration From Data to Decision :
 *  S1 — abandon du diagnostic à l'étape photo, plus fort en réseau faible (techniciens itinérants) ;
 *  S2 — rétention plus faible des utilisateurs venus de MyTechXpert qui utilisaient l'inspection de flotte ;
 *  S3 — baisse d'activité en Pologne après le jour 75 (version fictive mal localisée).
 */

export const DAYS = 120;
/** Premier jour de la période fictive (lundi). */
export const START_DATE = new Date(Date.UTC(2026, 5, 29));

export const COUNTRIES = ['FR', 'DE', 'ES', 'IT', 'PL'] as const;
export type Country = (typeof COUNTRIES)[number];
export const COUNTRY_LABEL: Record<Country, string> = { FR: 'France', DE: 'Allemagne', ES: 'Espagne', IT: 'Italie', PL: 'Pologne' };

export const PERSONAS = ['atelier', 'itinerant', 'conseiller', 'responsable'] as const;
export type Persona = (typeof PERSONAS)[number];
export const PERSONA_LABEL: Record<Persona, string> = {
  atelier: 'Technicien atelier',
  itinerant: 'Technicien itinérant',
  conseiller: 'Conseiller commercial',
  responsable: 'Responsable de centre',
};

/** Bits des fonctionnalités utilisées un jour donné. */
export const F = { open: 1, selector: 2, specs: 4, diag: 8, pressure: 16, share: 32 } as const;
export type FeatureKey = Exclude<keyof typeof F, 'open'>;
export const FEATURE_LABEL: Record<FeatureKey, string> = {
  selector: 'Sélecteur de produits',
  specs: 'Spécifications techniques',
  diag: 'Diagnostic de dommage',
  pressure: 'Pression et montage',
  share: 'Partage d’un résultat',
};

/** Étapes du parcours diagnostic (modèle hypothétique). */
export const STEPS = ['Identification du pneu', 'Zone du dommage', 'Photo', 'Qualification', 'Résultat'] as const;

export interface User {
  id: number;
  country: Country;
  persona: Persona;
  install: number;           // jour d'installation (0..DAYS-1)
  migrated: boolean;         // vient de MyTechXpert
  inspectionUser: boolean;   // utilisait l'inspection de flotte dans MyTechXpert
  activity: Uint8Array;      // masque de fonctionnalités par jour (0 = inactif)
}

export interface Diagnosis {
  user: number;
  day: number;
  reached: number;           // dernière étape atteinte (1..5)
  completed: boolean;
  weakNetwork: boolean;
}

export interface Rating { user: number; day: number; score: 1 | 2 | 3 | 4 | 5; weak?: boolean }

export interface Dataset { users: User[]; diagnoses: Diagnosis[]; ratings: Rating[] }

/** Générateur pseudo-aléatoire mulberry32. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, items: readonly T[], weights: readonly number[]): T => {
  let x = r() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; }
  return items[items.length - 1];
};

interface PersonaProfile { share: number; daily: number; diag: number; selector: number; specs: number; pressure: number; weakNet: number; share_: number }
const PROFILE: Record<Persona, PersonaProfile> = {
  atelier:     { share: .38, daily: .34, diag: .55, selector: .20, specs: .35, pressure: .30, weakNet: .08, share_: .35 },
  itinerant:   { share: .22, daily: .30, diag: .65, selector: .15, specs: .25, pressure: .35, weakNet: .45, share_: .30 },
  conseiller:  { share: .28, daily: .20, diag: .12, selector: .70, specs: .55, pressure: .15, weakNet: .15, share_: .20 },
  responsable: { share: .12, daily: .12, diag: .08, selector: .30, specs: .30, pressure: .10, weakNet: .05, share_: .50 },
};
const COUNTRY_W: Record<Country, number> = { FR: .34, DE: .22, ES: .16, IT: .14, PL: .14 };

/** Probabilité de quitter le parcours à chaque étape (avant de passer à la suivante). */
function stepDrop(step: number, weak: boolean): number {
  switch (step) {
    case 1: return .06;
    case 2: return .05;
    case 3: return weak ? .34 : .09;   // S1
    case 4: return .07;
    default: return 0;
  }
}

export function generate(seed = 2027, nUsers = 6000): Dataset {
  const r = rng(seed);
  const users: User[] = [];
  const diagnoses: Diagnosis[] = [];
  const ratings: Rating[] = [];

  for (let id = 0; id < nUsers; id++) {
    const persona = pick(r, PERSONAS, PERSONAS.map(p => PROFILE[p].share));
    const country = pick(r, COUNTRIES, COUNTRIES.map(c => COUNTRY_W[c]));
    // une base d'utilisateurs migrés arrive tôt ; les nouveaux arrivent ensuite, en légère croissance
    const migrated = r() < .3;
    const install = migrated ? Math.floor(r() * 21) : Math.min(DAYS - 1, Math.floor(Math.sqrt(r()) * DAYS));
    const inspectionUser = migrated && (persona === 'atelier' || persona === 'itinerant' || persona === 'responsable') && r() < .55;
    const P = PROFILE[persona];
    const intensity = .45 + r() * 1.1;
    // durée de vie : loi géométrique ; plus courte pour les utilisateurs d'inspection migrés (S2)
    const hazard = inspectionUser ? .045 : .012;
    let life = 0; while (r() > hazard && life < 400) life++;

    const activity = new Uint8Array(DAYS);
    for (let d = install; d < DAYS; d++) {
      const age = d - install;
      if (age > life) break;
      const weekday = (d % 7) < 5;
      let p = age === 0 ? 1 : P.daily * intensity * (weekday ? 1 : .3) * (age < 7 ? 1.25 : 1);
      if (country === 'PL' && d >= 75) p *= .62;                     // S3
      if (r() >= Math.min(.95, p)) continue;
      let mask: number = F.open;
      if (r() < P.selector) mask |= F.selector;
      if (r() < P.specs) mask |= F.specs;
      if (r() < P.pressure) mask |= F.pressure;
      if (r() < P.diag || (age === 0 && persona !== 'conseiller' && r() < .5)) {
        mask |= F.diag;
        const weakNetwork = r() < P.weakNet;
        let reached = 1;
        while (reached < 5 && r() >= stepDrop(reached, weakNetwork)) reached++;
        const completed = reached === 5;
        diagnoses.push({ user: id, day: d, reached, completed, weakNetwork });
        if (completed) {
          if (r() < P.share_) mask |= F.share;
          if (r() < .3) {
            const base = weakNetwork ? 3.3 : 4.1;
            const score = Math.max(1, Math.min(5, Math.round(base + (r() - .5) * 2.4))) as Rating['score'];
            ratings.push({ user: id, day: d, score, weak: weakNetwork });
          }
        }
      }
      activity[d] = mask;
    }
    users.push({ id, country, persona, install, migrated, inspectionUser, activity });
  }
  return { users, diagnoses, ratings };
}

export function dayLabel(d: number): string {
  const dt = new Date(START_DATE.getTime() + d * 86400000);
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
