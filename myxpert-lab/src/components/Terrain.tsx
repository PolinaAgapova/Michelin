import { useState } from 'react';
import { ChapterHead, Seg, Tag } from './ui';

const STAGES = ['Déclencheur', 'Ouvrir l’app', 'Identifier le pneu', 'Localiser le dommage', 'Photo', 'Qualifier', 'Recommandation', 'Informer le client'];
const ASIS = {
  action: ['Le chauffeur signale une entaille au flanc', 'Ouvre l’application sur le parking', 'Choisit véhicule, essieu, position', 'Indique la zone touchée', 'Prend une photo ; l’envoi tourne', 'Répond aux questions de gravité', 'Lit la recommandation', 'Explique la décision au client, de mémoire'],
  think: ['« Je dois décider vite »', '« Le réseau est faible ici »', '« Ça va, c’est rapide »', '« Flanc, côté extérieur »', '« Ça ne passe pas… »', '« J’ai déjà mon avis »', '« Remplacer, d’accord »', '« Comment je le prouve ? »'],
  friction: ['—', 'Réseau variable', '—', '—', 'Envoi bloquant, gants, lumière', 'Interruption → tout recommencer', '—', 'Rien à transmettre au client'],
};
const TOBE = {
  action: ['Idem', '« Reprendre » si un diagnostic est en cours', 'Position touchée sur un schéma d’essieu', 'Zone sur un schéma de pneu', 'Photo facultative, envoi différé', 'Questions conservées en cas d’interruption', 'Recommandation + raison en une ligne', 'Résumé partageable en un geste'],
  change: ['—', 'Reprise d’un diagnostic', 'Cibles tactiles larges', 'Schéma plutôt que liste', 'Passer et ajouter plus tard', 'Sauvegarde locale', 'Explication courte', 'Partage du résultat'],
  metric: ['—', 'Diagnostics repris', 'Temps jusqu’à l’étape 2', '—', 'Abandon à l’étape photo', 'Taux de complétion', 'CSAT après diagnostic', 'Part des diagnostics partagés'],
};
const EMO_ASIS = [0, -1, 1, 1, -2, -1, 1, -1];
const EMO_TOBE = [0, 1, 1, 1, 0, 1, 1, 2];

function Emotion() {
  const W = 920, H = 90, n = STAGES.length, x = (i: number) => 60 + i * ((W - 80) / (n - 1)), y = (v: number) => 45 - v * 18;
  const path = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Courbe d’émotion hypothétique : la version actuelle chute à l’étape photo et à la fin, la version proposée reste positive.">
      <line className="grid" x1={60} x2={W - 20} y1={45} y2={45} />
      <text x={0} y={y(2) + 4}>serein</text><text x={0} y={y(-2) + 4}>frustré</text>
      <path d={path(EMO_ASIS)} fill="none" stroke="var(--bad)" strokeWidth={2} strokeDasharray="5 4" />
      <path d={path(EMO_TOBE)} fill="none" stroke="var(--good)" strokeWidth={2.5} />
      {EMO_ASIS.map((v, i) => <circle key={'a' + i} cx={x(i)} cy={y(v)} r={3.5} fill="var(--bad)" />)}
      {EMO_TOBE.map((v, i) => <circle key={'b' + i} cx={x(i)} cy={y(v)} r={3.5} fill="var(--good)" />)}
    </svg>
  );
}

function Journey() {
  const [mode, setMode] = useState<'asis' | 'tobe'>('asis');
  const rows = mode === 'asis'
    ? [['Action', ASIS.action, ''], ['Pensée', ASIS.think, ''], ['Friction', ASIS.friction, 'fr']] as const
    : [['Action', TOBE.action, ''], ['Changement', TOBE.change, 'op'], ['Mesure', TOBE.metric, '']] as const;
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <Seg label="Version du parcours" value={mode} onChange={setMode} options={[{ v: 'asis', l: 'AS-IS hypothétique' }, { v: 'tobe', l: 'TO-BE proposé' }]} />
        <div className="legend"><span><i style={{ background: 'var(--bad)' }} />Émotion AS-IS</span><span><i style={{ background: 'var(--good)' }} />Émotion TO-BE</span></div>
      </div>
      <Emotion />
      <div className="journey">
        <table>
          <thead><tr><th scope="col"><span className="sr">Ligne</span></th>{STAGES.map((s, i) => <th key={s} scope="col"><span className="label">{String(i + 1).padStart(2, '0')}</span><br />{s}</th>)}</tr></thead>
          <tbody>
            {rows.map(([name, cells, cls]) => (
              <tr key={name}><th scope="row">{name}</th>{cells.map((c, i) => <td key={i} className={c !== '—' ? cls : ''}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">L’AS-IS est une <b>hypothèse</b> construite à partir des fonctions publiques de MyXpert ; je n’ai pas observé de vrais utilisateurs. À valider par 5 à 8 observations terrain.</p>
    </div>
  );
}

/* ---------------- prototype ---------------- */
type Screen = 'home' | 'tyre' | 'zone' | 'photo' | 'qualify' | 'result' | 'report';
const ORDER: Screen[] = ['tyre', 'zone', 'photo', 'qualify', 'result'];
const ZONES = [
  { id: 'tread', l: 'Bande de roulement' },
  { id: 'sidewall', l: 'Flanc' },
  { id: 'bead', l: 'Talon' },
  { id: 'inner', l: 'Gomme intérieure' },
] as const;
type Zone = (typeof ZONES)[number]['id'];

function TyreIcon({ zone }: { zone: Zone }) {
  const on = (z: Zone) => (z === zone ? '#2a4b9b' : '#c9ccd6');
  return (
    <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
      <rect x="6" y="4" width="28" height="7" rx="3" fill={on('tread')} />
      <rect x="6" y="11" width="5" height="20" fill={on('sidewall')} /><rect x="29" y="11" width="5" height="20" fill={on('sidewall')} />
      <rect x="11" y="12" width="18" height="3" fill={on('inner')} />
      <rect x="6" y="31" width="9" height="5" rx="2" fill={on('bead')} /><rect x="25" y="31" width="9" height="5" rx="2" fill={on('bead')} />
    </svg>
  );
}

const NOTES: Record<Screen, { title: string; body: string; metric?: string }> = {
  home: { title: 'Accueil : reprendre plutôt que recommencer', body: 'Un diagnostic interrompu à 07:09 est proposé en premier. Hypothèse : les interruptions (appel, client, réseau) sont une cause importante d’abandon.', metric: 'Part des diagnostics repris' },
  tyre: { title: 'Identifier le pneu sur un schéma', body: 'Le technicien touche la position sur un schéma d’essieu : cibles larges, utilisables avec des gants.', metric: 'Temps jusqu’à l’étape 2' },
  zone: { title: 'Localiser la zone', body: 'Les quatre zones reprennent celles de l’inspection détaillée décrite publiquement pour MyTechXpert : bande de roulement, flanc, gomme intérieure, talon.' },
  photo: { title: 'La photo n’est plus bloquante', body: 'En réseau faible, la photo se met en file d’attente ; on peut aussi la passer. C’est la réponse directe au signal S1 du dashboard.', metric: 'Abandon à l’étape photo (garde-fou : part des résultats avec photo)' },
  qualify: { title: 'Qualifier, avec sauvegarde', body: 'Deux questions fermées. Les réponses sont conservées si le technicien est interrompu.', metric: 'Taux de complétion' },
  result: { title: 'Une recommandation et sa raison', body: 'Une décision lisible en une seconde et une ligne d’explication. La règle utilisée ici est fictive : les vraies règles relèvent des experts Michelin.', metric: 'CSAT après diagnostic' },
  report: { title: 'Un résultat partageable', body: 'Le diagnostic aide à décider, puis à expliquer. Hypothèse à valider : les clients flotte attendent une trace écrite.', metric: 'Part des diagnostics terminés qui sont partagés' },
};

export function Prototype() {
  const [screen, setScreen] = useState<Screen>('home');
  const [weak, setWeak] = useState(true);
  const [pos, setPos] = useState<number | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [photo, setPhoto] = useState<'none' | 'queued' | 'sent' | 'skipped'>('none');
  const [deep, setDeep] = useState<boolean | null>(null);
  const [big, setBig] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);

  const stepIndex = ORDER.indexOf(screen);
  const reset = () => { setScreen('home'); setPos(null); setZone(null); setPhoto('none'); setDeep(null); setBig(null); setToast(null); setResumed(false); };
  const back = () => { setToast(null); if (screen === 'report') setScreen('result'); else if (stepIndex > 0) setScreen(ORDER[stepIndex - 1]); else setScreen('home'); };
  const flash = (t: string) => { setToast(t); window.setTimeout(() => setToast(c => (c === t ? null : c)), 2600); };

  // Règle FICTIVE, uniquement pour la démonstration.
  const verdict = deep || (zone === 'sidewall' && big) || zone === 'bead'
    ? { big: 'Remplacer le pneu', why: zone === 'sidewall' ? 'Dommage au flanc jugé important.' : deep ? 'Nappes visibles.' : 'Dommage au talon.' }
    : { big: 'Réparation à évaluer en atelier', why: 'Dommage limité, sans nappes visibles.' };
  const posLabel = pos === null ? '' : `Essieu 2 · ${['ext. gauche', 'int. gauche', 'int. droit', 'ext. droit'][pos]}`;
  const zoneLabel = ZONES.find(z => z.id === zone)?.l ?? '';
  const note = NOTES[screen];

  return (
    <div className="proto">
      <div className="phone" aria-label="Prototype mobile interactif">
        <div className="screen">
          <div className="sbar"><span>07:12</span><span className={`net ${weak ? 'weak' : ''}`}>{weak ? '▂▁▁ réseau faible' : '▂▄▆ 4G'}</span></div>
          <div className="appbar">
            {screen !== 'home' && <button className="back" type="button" onClick={back} aria-label="Retour">←</button>}
            <span className="ttl">{screen === 'home' ? 'Diagnostic' : screen === 'report' ? 'Résumé' : `Étape ${stepIndex + 1} sur 5`}</span>
            <span className="concept">CONCEPT · NON OFFICIEL</span>
          </div>
          {stepIndex >= 0 && <div className="progress" aria-hidden="true">{ORDER.map((s, i) => <i key={s} className={i <= stepIndex ? 'on' : ''} />)}</div>}

          <div className="body">
            {screen === 'home' && <>
              {!resumed && <div className="resume">
                <b>Diagnostic en cours</b>
                <span className="hint">Remorque · essieu 2 · interrompu à 07:09 à l’étape 2</span>
                <button className="cta" type="button" onClick={() => { setPos(0); setResumed(true); setScreen('zone'); }}>Reprendre</button>
              </div>}
              <button className="cta alt" type="button" onClick={() => { setPos(null); setScreen('tyre'); }}>Nouveau diagnostic</button>
              <p className="hint">Scénario : Julien, technicien itinérant (persona fictif), sur une aire poids lourds. Le chauffeur signale une entaille.</p>
            </>}

            {screen === 'tyre' && <>
              <h5>Quel pneu est touché ?</h5>
              <p className="hint">Remorque · essieu 2. Touchez la position.</p>
              <div className="axle" role="group" aria-label="Positions de l’essieu">
                {['G ext.', 'G int.', 'D int.', 'D ext.'].map((l, i) => <button key={l} type="button" aria-pressed={pos === i} onClick={() => setPos(i)}>{l}</button>)}
              </div>
              <button className="cta" type="button" disabled={pos === null} onClick={() => setScreen('zone')} style={{ opacity: pos === null ? .4 : 1 }}>Continuer</button>
            </>}

            {screen === 'zone' && <>
              {resumed && <div className="banner ok">Diagnostic repris : {posLabel}</div>}
              <h5>Où est le dommage ?</h5>
              {ZONES.map(z => (
                <button key={z.id} type="button" className="opt" aria-pressed={zone === z.id} style={zone === z.id ? { borderColor: '#2a4b9b', boxShadow: 'inset 0 0 0 1px #2a4b9b' } : undefined} onClick={() => { setZone(z.id); setScreen('photo'); }}>
                  <span className="ic"><TyreIcon zone={z.id} /></span>{z.l}
                </button>
              ))}
            </>}

            {screen === 'photo' && <>
              <h5>Photo du dommage</h5>
              <p className="hint">Facultative. Elle complète le résumé partagé au client.</p>
              {photo === 'none' && <>
                <button className="cta" type="button" onClick={() => { setPhoto(weak ? 'queued' : 'sent'); }}>Prendre la photo (simulée)</button>
                <button className="cta alt" type="button" onClick={() => { setPhoto('skipped'); setScreen('qualify'); }}>Passer, ajouter plus tard</button>
              </>}
              {photo === 'queued' && <div className="banner warn">Réseau faible : photo enregistrée sur l’appareil, envoi automatique au retour du réseau.</div>}
              {photo === 'sent' && <div className="banner ok">Photo ajoutée.</div>}
              {(photo === 'queued' || photo === 'sent') && <button className="cta" type="button" onClick={() => setScreen('qualify')}>Continuer</button>}
            </>}

            {screen === 'qualify' && <>
              <h5>Gravité</h5>
              <p className="hint">Questions illustratives, non issues des règles Michelin.</p>
              <div className="stack" style={{ gap: 6 }}>
                <b style={{ fontSize: 14 }}>Les nappes sont-elles visibles ?</b>
                <div className="axle" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  {[true, false].map(v => <button key={String(v)} type="button" aria-pressed={deep === v} style={{ aspectRatio: 'auto', padding: 12, background: '#fff', color: '#12161f' }} onClick={() => setDeep(v)}>{v ? 'Oui' : 'Non'}</button>)}
                </div>
                <b style={{ fontSize: 14 }}>Le dommage dépasse-t-il la taille d’une pièce ?</b>
                <div className="axle" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  {[true, false].map(v => <button key={String(v)} type="button" aria-pressed={big === v} style={{ aspectRatio: 'auto', padding: 12, background: '#fff', color: '#12161f' }} onClick={() => setBig(v)}>{v ? 'Oui' : 'Non'}</button>)}
                </div>
              </div>
              <button className="cta" type="button" disabled={deep === null || big === null} style={{ opacity: deep === null || big === null ? .4 : 1 }} onClick={() => setScreen('result')}>Voir la recommandation</button>
              <button className="cta alt" type="button" onClick={() => { flash('Diagnostic mis de côté. Il vous attend sur l’accueil.'); window.setTimeout(() => { setScreen('home'); setResumed(false); }, 900); }}>Je suis interrompu</button>
            </>}

            {screen === 'result' && <>
              <div className="verdict">
                <span className="fict">RÈGLE FICTIVE · DÉMONSTRATION</span>
                <span className="big">{verdict.big}</span>
                <span style={{ opacity: .8 }}>{verdict.why}</span>
              </div>
              <div className="hint">{posLabel} · {zoneLabel} · {photo === 'skipped' ? 'sans photo' : photo === 'queued' ? 'photo en attente d’envoi' : 'avec photo'}</div>
              <button className="cta" type="button" onClick={() => setScreen('report')}>Préparer le résumé client</button>
              <button className="cta alt" type="button" onClick={reset}>Terminer</button>
            </>}

            {screen === 'report' && <>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dedfd9', padding: 14, display: 'grid', gap: 6 }}>
                <span className="hint">Résumé de diagnostic</span>
                <b>{verdict.big}</b>
                <span>{posLabel}</span>
                <span>{zoneLabel} · {deep ? 'nappes visibles' : 'nappes non visibles'}</span>
                <span className="hint">{photo === 'skipped' ? 'Aucune photo' : photo === 'queued' ? 'Photo jointe dès le retour du réseau' : 'Photo jointe'}</span>
              </div>
              <button className="cta" type="button" onClick={() => flash('Démo : aucun envoi n’est effectué.')}>Partager au client</button>
              <button className="cta alt" type="button" onClick={reset}>Nouveau diagnostic</button>
            </>}
          </div>
          {toast && <div className="toast" role="status">{toast}</div>}
        </div>
      </div>

      <div className="proto-side">
        <label className="switch"><input type="checkbox" checked={weak} onChange={e => setWeak(e.target.checked)} />Simuler un réseau faible</label>
        <div className="step-note" aria-live="polite">
          <div className="label">Écran affiché</div>
          <h4 style={{ font: '600 18px/1.35 var(--sans)', margin: '4px 0 6px' }}>{note.title}</h4>
          <p className="muted">{note.body}</p>
          {note.metric && <p className="small" style={{ marginTop: 8 }}><span className="label">Mesure</span> {note.metric}</p>}
        </div>
        <div className="card flat">
          <h4 style={{ marginBottom: 8 }}>Compromis assumés</h4>
          <ul className="clean small muted">
            <li><b>Photo facultative</b> : plus de diagnostics terminés, mais des résumés moins riches. Le garde-fou « part des résultats avec photo » est suivi.</li>
            <li><b>Schéma d’essieu</b> : rapide pour une remorque, moins adapté aux engins agricoles ou de manutention. À décliner par segment.</li>
            <li><b>Sauvegarde locale</b> : utile hors réseau, mais impose de gérer l’expiration et la sécurité des données.</li>
          </ul>
        </div>
        <div className="card flat">
          <h4 style={{ marginBottom: 8 }}>Limites</h4>
          <ul className="clean small muted">
            <li>Je n’ai pas utilisé MyXpert : ce prototype ne reproduit pas son interface, il illustre un parcours.</li>
            <li>Les questions et la règle de décision sont fictives ; elles ne constituent pas un conseil technique.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Terrain() {
  return (
    <section className="chapter" aria-labelledby="terrain">
      <div className="wrap">
        <ChapterHead n="01" id="terrain" title="Sur le terrain">Un persona, un problème, un parcours. Puis un prototype qu’on peut réellement parcourir.</ChapterHead>

        <div className="grid2">
          <div className="card">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}><Tag p="fict" /><Tag p="hypo" /></div>
            <h4>Julien, technicien itinérant chez un distributeur poids lourd</h4>
            <dl className="dl-list">
              <dt>Contexte</dt><dd>Interventions sur aires et sites clients, souvent seul, gants, réseau variable.</dd>
              <dt>Objectif</dt><dd>Décider sur place : réparer, remplacer ou immobiliser, puis l’expliquer au client.</dd>
              <dt>Contrainte</dt><dd>Interrompu en permanence : appels, chauffeur, client.</dd>
              <dt>Ce qui compte</dt><dd>Aller vite, ne pas se tromper, pouvoir justifier.</dd>
            </dl>
          </div>
          <div className="card">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}><Tag p="fact" /></div>
            <h4>Ce que l’on sait de MyXpert</h4>
            <p className="muted small" style={{ marginTop: 8 }}>D’après ses fiches publiques : destinée aux distributeurs de pneus commerciaux (transport, agriculture, construction, manutention), avec sélecteur de produits, spécifications, pression et montage, et un <b>diagnostic de dommage pas à pas</b>.</p>
            <p className="muted small" style={{ marginTop: 8 }}>Je n’ai pas pu tester l’application. Le parcours ci-dessous est donc une reconstruction hypothétique.</p>
          </div>
        </div>

        <div className="block">
          <h3 className="sub">Problème → hypothèse → solution → bénéfice → mesure</h3>
          <div className="chain">
            <div><div className="label">Problème <Tag p="hypo" /></div><p>Un diagnostic commencé sur le terrain n’aboutit pas toujours : réseau faible, photo difficile, interruptions.</p></div>
            <div><div className="label">Hypothèse</div><p>L’étape photo et les interruptions concentrent l’essentiel des abandons.</p></div>
            <div><div className="label">Solution <Tag p="reco" /></div><p>Reprise d’un diagnostic, photo facultative et différée, résultat partageable.</p></div>
            <div><div className="label">Bénéfice attendu</div><p>Plus de diagnostics terminés et une décision que le technicien peut justifier.</p></div>
            <div><div className="label">Validation</div><p>Taux de complétion (principal) ; part des résultats avec photo et CSAT (garde-fous).</p></div>
          </div>
        </div>

        <div className="block">
          <h3 className="sub">Parcours utilisateur <Tag p="hypo" /></h3>
          <Journey />
        </div>

        <div className="block">
          <h3 className="sub">Prototype TO-BE <Tag p="reco" /></h3>
          <p className="muted small" style={{ marginBottom: 18 }}>Cliquez dans le téléphone. Essayez « Reprendre », passez la photo, ou dites que vous êtes interrompu à l’étape 4.</p>
          <Prototype />
        </div>
      </div>
    </section>
  );
}
