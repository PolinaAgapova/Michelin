import { useEffect, useState } from 'react';
import { Synthese } from './components/Synthese';
import { Flux } from './components/Flux';
import { Stockage } from './components/Stockage';
import { Application } from './components/Application';
import { Tracabilite } from './components/Tracabilite';
import { Deploiement } from './components/Deploiement';
import { Parcours } from './components/Parcours';
import { Methode } from './components/Methode';

const ROUTES = [
  { id: 'synthese', k: '·', l: 'Synthèse', C: Synthese },
  { id: 'flux', k: '1', l: 'Flux', C: Flux },
  { id: 'stockage', k: '2', l: 'Stockage', C: Stockage },
  { id: 'application', k: '3', l: 'Application', C: Application },
  { id: 'tracabilite', k: '4', l: 'Traçabilité', C: Tracabilite },
  { id: 'deploiement', k: '5', l: 'Déploiement', C: Deploiement },
  { id: 'parcours', k: 'P', l: 'Ma démarche', C: Parcours },
  { id: 'methode', k: '?', l: 'Méthode', C: Methode },
];
const routeOf = () => { const h = location.hash.replace('#', ''); return ROUTES.some(r => r.id === h) ? h : 'synthese'; };

export default function App() {
  const [route, setRoute] = useState(routeOf);
  useEffect(() => {
    const on = () => { setRoute(routeOf()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const Page = ROUTES.find(r => r.id === route)!.C;
  return (
    <>
      <div className="banner" role="note">Prototype personnel de candidature — données 100 % fictives — projet non affilié à Michelin</div>
      <div className="shell">
        <nav className="side" aria-label="Sections">
          <div className="logo"><b>MIX<i>FLOW</i></b><span>Lab · flux, stockage, traçabilité</span></div>
          <ul className="menu">{ROUTES.map(r => <li key={r.id}><a href={`#${r.id}`} aria-current={route === r.id ? 'page' : undefined}><span>{r.k}</span><b>{r.l}</b></a></li>)}</ul>
          <div className="who">Polina Agapova · candidature au stage Supply Chain / Gestion des Flux de Mélanges · novembre 2026</div>
        </nav>
        <main className="page" id="contenu"><Page /></main>
      </div>
    </>
  );
}
