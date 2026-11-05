/**
 * Environnement industriel FICTIF, inspiré des problématiques générales de la gestion des flux de mélanges
 * dans la fabrication pneumatique. Aucune valeur ne provient de Michelin ou d'Euromaster.
 * Les ordres de grandeur sont choisis pour être plausibles et sont à valider avec le métier.
 */

export const HISTORY = 28;            // jours observés (réalisé connu)
export const HORIZON = 14;            // jours projetés à partir d'aujourd'hui
export const DAYS = HISTORY + HORIZON;
export const TODAY = HISTORY;         // index du jour courant

export type Criticality = 'A' | 'B' | 'C';
export type Consumer = 'EXT' | 'CAL' | 'TRI';
export const CONSUMER_LABEL: Record<Consumer, string> = { EXT: 'Extrusion', CAL: 'Calandrage', TRI: 'Tringlerie' };

export interface Compound {
  id: string;
  label: string;
  family: string;
  consumer: Consumer;
  criticality: Criticality;
  baseDemand: number;    // t / jour (prévision moyenne)
  forecastBias: number;  // biais structurel du réalisé par rapport à la prévision (+0,10 = réalisé 10 % au-dessus)
  maturation: number;    // jours de repos minimum avant utilisation
  shelfLife: number;     // âge maximal en jours ; au-delà, le lot est rebuté
  safetyDays: number;    // stock de sécurité, en jours de besoin moyen
  value: number;         // valeur d'un lot, €/t (sert au coût du rebut)
  initialStock: number;  // t disponibles au jour 0
}

export const COMPOUNDS: Compound[] = [
  { id: 'BR-A', label: 'Bande de roulement A', family: 'Bande de roulement', consumer: 'EXT', criticality: 'A', baseDemand: 58, forecastBias: .02, maturation: 1, shelfLife: 6, safetyDays: 1.5, value: 2300, initialStock: 140 },
  { id: 'BR-B', label: 'Bande de roulement B', family: 'Bande de roulement', consumer: 'EXT', criticality: 'A', baseDemand: 34, forecastBias: -.12, maturation: 1, shelfLife: 4, safetyDays: 1.5, value: 2500, initialStock: 85 },
  { id: 'FL-A', label: 'Flanc A', family: 'Flanc', consumer: 'EXT', criticality: 'B', baseDemand: 30, forecastBias: .11, maturation: 1, shelfLife: 7, safetyDays: 1, value: 1900, initialStock: 60 },
  { id: 'GI-A', label: 'Gomme intérieure', family: 'Gomme intérieure', consumer: 'CAL', criticality: 'B', baseDemand: 24, forecastBias: 0, maturation: 2, shelfLife: 8, safetyDays: 1, value: 2100, initialStock: 70 },
  { id: 'NC-A', label: 'Nappe carcasse', family: 'Nappe', consumer: 'CAL', criticality: 'A', baseDemand: 40, forecastBias: .03, maturation: 1, shelfLife: 6, safetyDays: 1.5, value: 2000, initialStock: 100 },
  { id: 'TA-A', label: 'Gomme talon', family: 'Talon', consumer: 'TRI', criticality: 'C', baseDemand: 12, forecastBias: -.02, maturation: 2, shelfLife: 10, safetyDays: 1, value: 1800, initialStock: 40 },
];

export interface Mixer { id: string; label: string; capacity: number; compounds: string[] }
export const MIXERS: Mixer[] = [
  { id: 'M1', label: 'Mélangeur 1', capacity: 84, compounds: ['BR-A', 'BR-B', 'FL-A'] },
  { id: 'M2', label: 'Mélangeur 2', capacity: 80, compounds: ['BR-A', 'FL-A', 'GI-A', 'NC-A'] },
  { id: 'M3', label: 'Mélangeur 3', capacity: 58, compounds: ['BR-B', 'GI-A', 'NC-A', 'TA-A'] },
];

/**
 * Événements fictifs (part de la capacité disponible) : une panne passée, et une maintenance PLANIFIÉE
 * dans la projection que le plan de fabrication n'intègre pas (cas de démonstration).
 */
export const INCIDENTS = [
  { mixer: 'M2', from: 15, to: 16, availability: .35, label: 'Panne fictive M2', planned: false },
  { mixer: 'M1', from: HISTORY + 4, to: HISTORY + 6, availability: .15, label: 'Maintenance planifiée M1', planned: true },
];

export const COSTS = {
  holding: 6,      // €/t/jour : immobilisation et stockage
  shortage: 1800,  // €/t non servie à temps : perturbation de l'atelier consommateur
  // le rebut coûte la valeur du lot (Compound.value)
};
