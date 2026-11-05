import { createContext, useContext } from 'react';
import { TODAY } from './data/config';
import type { DemandSeries } from './data/demand';
import type { Reco } from './data/rules';
import type { Scenario, SimResult } from './data/sim';

export interface Store {
  demand: Record<string, DemandSeries>;
  base: SimResult;          // plan de référence
  active: SimResult;        // scénario en cours (= référence si aucun changement)
  scenario: Scenario;        // scénario effectif = réglages + recommandations appliquées
  user: Scenario;            // réglages faits dans le simulateur
  setUser: (s: Scenario) => void;
  preset: string | null;
  setPreset: (p: string | null) => void;
  applied: string[];        // recommandations appliquées au scénario
  setApplied: (ids: string[]) => void;
  recos: Reco[];
  go: (route: string) => void;
}
export const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

export const dayLabel = (d: number) => (d === TODAY ? 'J0' : d < TODAY ? `J−${TODAY - d}` : `J+${d - TODAY}`);
