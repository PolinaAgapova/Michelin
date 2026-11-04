import { useState } from 'react';
import { INVENTORY, MARKETS, SOURCES, TIMELINE, type Market } from '../content/content';
import { readiness, type Status } from '../data/gates';
import { ChapterHead, Tag, pct } from './ui';

const VERDICT = { go: 'Lancement possible', pilot: 'Pilote limité', no: 'Pas encore prêt' };

function MarketLab() {
  const [state, setState] = useState<Record<string, Market['checks']>>(() => Object.fromEntries(MARKETS.map(m => [m.id, m.checks.map(c => ({ ...c }))])));
  const [id, setId] = useState(MARKETS[0].id);
  const m = MARKETS.find(x => x.id === id)!;
  const checks = state[id];
  const r = readiness(checks);
  const setStatus = (i: number, st: Status) => setState(s => ({ ...s, [id]: s[id].map((c, k) => (k === i ? { ...c, status: st } : c)) }));
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="chips" role="group" aria-label="Marché illustratif">
        {MARKETS.map(x => <button key={x.id} type="button" className="chip" aria-pressed={x.id === id} onClick={() => setId(x.id)}>{x.name}</button>)}
      </div>
      <div className="mkt">
        <div className="panel">
          <div className="ph"><h4>{m.name} <Tag p="hypo" /></h4><span className="label">marché illustratif</span></div>
          <p className="small muted" style={{ marginBottom: 6 }}>{m.why}</p>
          {checks.map((c, i) => (
            <div className="check" key={c.label}>
              <span>{c.label} <span className="mono small muted">×{c.weight}</span></span>
              <span className="st" role="group" aria-label={c.label}>
                {(['ok', 'todo', 'block'] as Status[]).map(st => <button key={st} type="button" className={`st-${st}`} aria-pressed={c.status === st} onClick={() => setStatus(i, st)}>{st === 'ok' ? 'Vérifié' : st === 'todo' ? 'À vérifier' : 'Bloquant'}</button>)}
              </span>
              <span className="nt">{c.note}</span>
            </div>
          ))}
        </div>
        <div className="stack" style={{ gap: 14, alignContent: 'start' }}>
          <div className={`gate ${r.verdict}`} aria-live="polite">
            <span className="label">Décision de passage</span>
            <span className="big">{VERDICT[r.verdict]}</span>
            <div className="meter"><i style={{ width: `${r.score * 100}%` }} /></div>
            <span className="small">Préparation pondérée : {pct(r.score)}{r.blocked ? ' · un point bloquant empêche le lancement' : ''}. Seuils : 60 % pour un pilote, 90 % pour un lancement.</span>
          </div>
          <div className="card"><h4>Onboarding</h4><p className="small muted" style={{ marginTop: 6 }}>{m.onboarding}</p></div>
          <div className="card"><h4>Feedback local</h4><p className="small muted" style={{ marginTop: 6 }}>{m.feedback}</p></div>
          <div className="card"><h4>Indicateurs de succès du pilote</h4><ul className="clean small muted" style={{ marginTop: 6 }}><li>Activation à 7 jours comparable aux pays déjà ouverts</li><li>Taux de diagnostics terminés</li><li>Part des retours mentionnant la langue ou les unités</li></ul></div>
        </div>
      </div>
    </div>
  );
}

const RISKS = [
  ['Traduction techniquement inexacte', 'Perte de confiance dans les recommandations', 'Relecture par un expert local, glossaire partagé, contrôle avant chaque version'],
  ['Gamme locale absente du sélecteur', 'Résultats vides, abandon', 'Contrôle du catalogue avant ouverture, suivi des recherches sans résultat'],
  ['Réglementation locale mal reflétée', 'Risque de conseil inadapté', 'Validation juridique et technique ; ne rien affirmer sans source locale'],
  ['Pas de relais terrain', 'Faible adoption après le lancement', 'Ambassadeurs distributeurs, formation courte, point mensuel'],
];

type Cov = 'unknown' | 'kept' | 'alt' | 'dropped';
const COV_LABEL: Record<Cov, string> = { unknown: 'À vérifier', kept: 'Reprise dans MyXpert', alt: 'Alternative communiquée', dropped: 'Arrêtée, expliquée' };

function Transition() {
  const [cov, setCov] = useState<Cov[]>(() => INVENTORY.map(i => (i.inMyXpert === 'listed' ? 'kept' : 'unknown')));
  const [exportOk, setExportOk] = useState(false);
  const [comms, setComms] = useState(false);
  const [support, setSupport] = useState(false);
  const [residual, setResidual] = useState(25);
  const threshold = 10;
  const highUnresolved = INVENTORY.filter((it, i) => it.risk === 'élevé' && cov[i] === 'unknown').map(it => it.feature);
  const anyUnknown = cov.filter(c => c === 'unknown').length;
  const dataItems = INVENTORY.filter((it, i) => it.userData && cov[i] !== 'kept');
  const criteria = [
    { ok: highUnresolved.length === 0, label: 'Aucune fonction à risque élevé sans décision', detail: highUnresolved.length ? `Reste : ${highUnresolved.join(', ')}` : 'Toutes décidées' },
    { ok: anyUnknown === 0, label: 'Inventaire complet', detail: anyUnknown ? `${anyUnknown} fonction(s) encore à vérifier` : 'Complet' },
    { ok: dataItems.length === 0 || exportOk, label: 'Données des utilisateurs récupérables', detail: dataItems.length === 0 ? 'Données reprises dans MyXpert' : exportOk ? 'Export ou migration disponible' : 'Prévoir un export ou une migration' },
    { ok: comms, label: 'Utilisateurs prévenus au moins 60 jours avant', detail: comms ? 'Fait' : 'À faire' },
    { ok: support, label: 'Support et commerciaux préparés', detail: support ? 'Fait' : 'À faire' },
    { ok: residual <= threshold, label: `Usage résiduel de MyTechXpert ≤ ${threshold} %`, detail: `Actuellement ${residual} % des utilisateurs actifs d’il y a 6 mois (valeur simulée)` },
  ];
  const ready = criteria.every(c => c.ok);
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="inv" role="region" aria-label="Inventaire des fonctions de MyTechXpert">
        <table>
          <thead><tr><th>Fonction MyTechXpert</th><th>Dans la fiche publique MyXpert ?</th><th>Risque si perdue</th><th>Décision</th><th>Action</th></tr></thead>
          <tbody>
            {INVENTORY.map((it, i) => (
              <tr key={it.feature}>
                <td><b>{it.feature}</b>{it.userData && <span className="badge dl">données utilisateur</span>}<br /><span className="small muted">source : {SOURCES.find(s => s.id === it.source)?.label.split('—')[0].trim()}</span></td>
                <td>{it.inMyXpert === 'listed' ? <><Tag p="fact" /> mentionnée</> : it.inMyXpert === 'partial' ? 'En partie' : <span className="muted">Non mentionnée</span>}</td>
                <td><span className={`risk ${it.risk}`}>{it.risk}</span></td>
                <td><select aria-label={`Décision pour ${it.feature}`} value={cov[i]} onChange={e => setCov(c => c.map((x, k) => (k === i ? (e.target.value as Cov) : x)))}>{(Object.keys(COV_LABEL) as Cov[]).map(k => <option key={k} value={k}>{COV_LABEL[k]}</option>)}</select></td>
                <td className="small">{it.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginTop: -12 }}>« Non mentionnée » signifie absente de la fiche publique, <b>pas</b> absente de l’application. Les décisions par défaut sont des hypothèses à confirmer avec l’équipe.</p>

      <div className="mkt">
        <div className="panel">
          <div className="ph"><h4>Critères de préparation au décommissionnement</h4></div>
          <div className="stack" style={{ gap: 12 }}>
            <label className="switch"><input type="checkbox" checked={exportOk} onChange={e => setExportOk(e.target.checked)} />Export ou migration des données disponible</label>
            <label className="switch"><input type="checkbox" checked={comms} onChange={e => setComms(e.target.checked)} />Annonce envoyée à T − 60 j</label>
            <label className="switch"><input type="checkbox" checked={support} onChange={e => setSupport(e.target.checked)} />Support et commerciaux préparés</label>
            <label className="range">Usage résiduel de MyTechXpert (simulé) : <b className="mono">{residual} %</b><input type="range" min={0} max={60} value={residual} onChange={e => setResidual(+e.target.value)} /></label>
          </div>
        </div>
        <div className={`gate ${ready ? 'go' : 'no'}`} aria-live="polite">
          <span className="label">Passage en lecture seule</span>
          <span className="big">{ready ? 'Critères atteints' : 'Pas encore'}</span>
          <ul className="clean small" style={{ listStyle: 'none', paddingLeft: 0 }}>
            {criteria.map(c => <li key={c.label}><span aria-hidden="true">{c.ok ? '✓' : '✗'}</span> <b>{c.label}</b><br /><span className="muted">{c.detail}</span></li>)}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="sub">Calendrier de transition <Tag p="reco" /></h3>
        <div className="timeline">
          {TIMELINE.map(t => <div key={t.t} className={t.t === 'T 0' ? 'zero' : ''}><span className="t">{t.t}</span><b>{t.title}</b><p>{t.body}</p></div>)}
        </div>
      </div>

      <div className="grid3">
        <div className="card"><h4>Communication</h4><ul className="clean small muted" style={{ marginTop: 8 }}><li><b>Utilisateurs</b> : message in-app dans MyTechXpert, avec lien direct vers MyXpert et page « avant / après »</li><li><b>Distributeurs</b> : relais par les commerciaux et un kit court</li><li><b>Interne</b> : FAQ pour le support</li></ul></div>
        <div className="card"><h4>Risques de perte d’usage</h4><ul className="clean small muted" style={{ marginTop: 8 }}><li>Fonction utilisée par peu de personnes mais critique pour elles (inspection de flotte)</li><li>Utilisateurs hors ligne ou peu actifs qui ne voient pas l’annonce</li><li>Différences régionales entre versions</li></ul></div>
        <div className="card"><h4>Continuité de service</h4><ul className="clean small muted" style={{ marginTop: 8 }}><li>Phase de lecture seule avant le retrait</li><li>Export des données à tout moment</li><li>Retrait des stores seulement après atteinte des critères</li></ul></div>
      </div>
    </div>
  );
}

export function Deploiement() {
  return (
    <section className="chapter" aria-labelledby="deploiement">
      <div className="wrap">
        <ChapterHead n="04" id="deploiement" title="Déployer sans perdre personne">Deux chantiers liés : ouvrir de nouveaux pays et fermer MyTechXpert. Dans les deux cas, on décide avec des critères explicites plutôt qu’avec une date seule.</ChapterHead>

        <h3 className="sub">Simulation de déploiement international <Tag p="hypo" /></h3>
        <p className="muted small" style={{ marginBottom: 16, maxWidth: '75ch' }}>Trois marchés choisis pour illustrer trois difficultés différentes. Je ne sais pas si MyXpert y est déjà disponible : tous les points sont « à vérifier » par défaut. Changez leur statut pour voir la décision évoluer.</p>
        <MarketLab />

        <div className="block">
          <h3 className="sub">Risques et parades</h3>
          <div className="inv"><table><thead><tr><th>Risque</th><th>Conséquence</th><th>Parade</th></tr></thead><tbody>{RISKS.map(r => <tr key={r[0]}><td><b>{r[0]}</b></td><td className="small">{r[1]}</td><td className="small">{r[2]}</td></tr>)}</tbody></table></div>
        </div>

        <div className="block">
          <h3 className="sub">Transition MyTechXpert → MyXpert</h3>
          <Transition />
        </div>
      </div>
    </section>
  );
}
