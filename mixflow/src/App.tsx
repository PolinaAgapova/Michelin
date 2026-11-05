import { useEffect, useMemo, useState } from 'react';
import { generateDemand } from './data/demand';
import { recommend, withExpected } from './data/rules';
import { BASE, simulate, type Scenario } from './data/sim';
import { Ctx, type Store } from './store';
import { Vue } from './components/Vue';
import { Flux } from './components/Flux';
import { Previsions } from './components/Previsions';
import { Simulation } from './components/Simulation';
import { Recos } from './components/Recos';
import { Parcours } from './components/Parcours';
import { Methode } from './components/Methode';

const ROUTES = [
  { id: 'vue', k: 'A', l: 'Vue globale', C: Vue },
  { id: 'flux', k: 'B', l: 'Flux', C: Flux },
  { id: 'previsions', k: 'C', l: 'Prévisions', C: Previsions },
  { id: 'simulation', k: 'D', l: 'Simulation', C: Simulation },
  { id: 'recommandations', k: 'E', l: 'Recommandations', C: Recos },
  { id: 'parcours', k: 'F', l: 'Ma démarche', C: Parcours },
  { id: 'methode', k: '?', l: 'Méthode', C: Methode },
];
const routeOf = () => { const h = location.hash.replace('#', ''); return ROUTES.some(r => r.id === h) ? h : 'vue'; };

export default function App() {
  const demand = useMemo(() => generateDemand(), []);
  const base = useMemo(() => simulate(demand, BASE), [demand]);
  const recos = useMemo(() => withExpected(demand, BASE, base, recommend(demand, BASE, base)), [demand, base]);
  const [user, setUser] = useState<Scenario>(BASE);
  const [applied, setApplied] = useState<string[]>([]);
  const [preset, setPreset] = useState<string | null>(null);
  const scenario = useMemo(() => applied.reduce((s, id) => recos.find(r => r.id === id)?.patch(s) ?? s, user), [user, applied, recos]);
  const active = useMemo(() => (scenario === BASE ? base : simulate(demand, scenario)), [demand, scenario, base]);
  const [route, setRoute] = useState(routeOf);
  useEffect(() => {
    const on = () => { setRoute(routeOf()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (r: string) => { location.hash = r; };
  const store: Store = { demand, base, active, scenario, user, setUser, preset, setPreset, applied, setApplied, recos, go };
  const Page = ROUTES.find(r => r.id === route)!.C;
  const custom = scenario !== BASE;

  return (
    <Ctx.Provider value={store}>
      <div className="banner" role="note">Prototype personnel de candidature — données 100 % fictives — projet non affilié à Michelin</div>
      <div className="shell">
        <nav className="side" aria-label="Modules">
          <div className="logo"><b>MIX<i>FLOW</i></b><span>Supply Chain Control Tower</span></div>
          <ul className="menu">{ROUTES.map(r => <li key={r.id}><a href={`#${r.id}`} aria-current={route === r.id ? 'page' : undefined}><span>{r.k}</span><b>{r.l}</b></a></li>)}</ul>
          <div className={`scen-chip ${custom ? 'on' : ''}`}>
            <span className="label" style={{ color: 'inherit' }}>Plan affiché</span>
            {custom ? <>Scénario modifié{applied.length ? ` · ${applied.length} action(s)` : ''}<button type="button" className="btn ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => { setUser(BASE); setApplied([]); setPreset(null); }}>Revenir à la référence</button></> : 'Plan de référence'}
          </div>
          <div className="who">Polina Agapova · candidature Supply Chain, Michelin · novembre 2026</div>
        </nav>
        <main className="page" id="contenu"><Page /></main>
      </div>
    </Ctx.Provider>
  );
}
