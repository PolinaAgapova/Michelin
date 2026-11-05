import { COMPOUNDS, COSTS, INCIDENTS, MIXERS } from '../data/config';
import { dayLabel } from '../store';
import { fmt } from './charts';

export function Methode() {
  return (
    <>
      <div className="ph"><div><div className="kicker">Méthode</div><h1>Hypothèses, données et limites</h1><p>Tout ce qui est fictif ou simplifié est écrit ici. Rien n’est présenté comme une donnée de Michelin ou d’Euromaster.</p></div></div>
      <div className="grid2">
        <section className="panel span2">
          <header><h3>Référentiel des mélanges (fictif)</h3></header>
          <div className="tbl"><table>
            <thead><tr><th>Mélange</th><th>Famille</th><th>Crit.</th><th className="n">Besoin moyen (t/j)</th><th className="n">Maturation (j)</th><th className="n">Durée de vie (j)</th><th className="n">Stock sécu. (j)</th><th className="n">Biais injecté</th></tr></thead>
            <tbody>{COMPOUNDS.map(k => <tr key={k.id}><td><b>{k.id}</b> <span className="small muted">{k.label}</span></td><td className="small">{k.family}</td><td className="mono">{k.criticality}</td><td className="n">{fmt(k.baseDemand)}</td><td className="n">{k.maturation}</td><td className="n">{k.shelfLife}</td><td className="n">{fmt(k.safetyDays, 1)}</td><td className="n">{k.forecastBias > 0 ? '+' : ''}{fmt(k.forecastBias * 100)} %</td></tr>)}</tbody>
          </table></div>
          <p className="foot">Biais injecté : écart structurel du réel par rapport à la prévision (+11 % = le réel dépasse la prévision de 11 %, donc sous-prévision).</p>
        </section>
        <section className="panel">
          <header><h3>Mélangeurs et événements</h3></header>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            {MIXERS.map(m => <li key={m.id}><b style={{ color: 'var(--ink)' }}>{m.label}</b> : {m.capacity} t/j · {m.compounds.join(', ')}</li>)}
            {INCIDENTS.map(i => <li key={i.label}><b style={{ color: 'var(--ink)' }}>{i.label}</b> : {dayLabel(i.from)} → {dayLabel(i.to)}, {fmt(i.availability * 100)} % de capacité{i.planned ? ', non intégrée au plan de référence' : ''}</li>)}
          </ul>
        </section>
        <section className="panel">
          <header><h3>Coûts fictifs</h3></header>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li>Possession : {COSTS.holding} €/t/jour (stock disponible et en maturation)</li>
            <li>Rupture : {fmt(COSTS.shortage)} €/t non servie à temps (perturbation de l’atelier aval)</li>
            <li>Rebut : valeur du lot, de 1 800 à 2 500 €/t selon le mélange</li>
            <li>Ces montants servent à comparer des scénarios, pas à estimer des coûts réels.</li>
          </ul>
        </section>
        <section className="panel">
          <header><h3>Génération des données</h3></header>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li>42 jours : 28 jours d’historique et 14 jours de projection ; aujourd’hui = J0.</li>
            <li>Prévision = besoin moyen × cycle hebdomadaire de ±6 % × bruit de 2 %.</li>
            <li>Réel = prévision × (1 + biais) × bruit de 7 %. Graine fixe : mêmes données à chaque chargement.</li>
            <li>Le moteur de simulation, lui, est entièrement déterministe.</li>
          </ul>
        </section>
        <section className="panel">
          <header><h3>Limites, à valider avec le métier</h3></header>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li>Pas de mélanges maîtres ni de passes successives ; pas de changements de recette ni de temps de nettoyage.</li>
            <li>Matières premières supposées toujours disponibles.</li>
            <li>Une seule granularité : la journée et la tonne.</li>
            <li>Le planificateur est volontairement simple (recomplètement jusqu’à une cible) ; un vrai site utilise d’autres règles.</li>
            <li>Cette règle simple fait osciller le stock d’un jour à l’autre quand la capacité est partagée (« nervosité » du plan) : un vrai outil lisserait la production, par exemple sur plusieurs jours.</li>
            <li>Les valeurs de maturation et de durée de vie sont des ordres de grandeur plausibles, pas des données réelles.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
