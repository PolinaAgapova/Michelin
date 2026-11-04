import { useEffect, useMemo, useState } from 'react';
import { generate } from './data/model';
import { FACTS, SOURCES } from './content/content';
import { Terrain } from './components/Terrain';
import { Donnees } from './components/Donnees';
import { DecisionStudio } from './components/Decision';
import { Deploiement } from './components/Deploiement';
import { Tag } from './components/ui';

const CHAPTERS = [
  { id: 'recommandation', n: '00', l: 'En 2 minutes' },
  { id: 'terrain', n: '01', l: 'Terrain' },
  { id: 'donnees', n: '02', l: 'Données' },
  { id: 'decision', n: '03', l: 'Décision' },
  { id: 'deploiement', n: '04', l: 'Déploiement' },
  { id: 'pourquoi', n: '05', l: 'Pourquoi ce travail' },
];

function Tread() {
  return (
    <svg className="tread" viewBox="0 0 420 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="#f1ede3" strokeWidth="16" strokeLinecap="round">
        {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M40 ${i * 60 - 20} L140 ${i * 60 + 20} L240 ${i * 60 - 20} L340 ${i * 60 + 20}`} />)}
      </g>
      <line x1="210" y1="0" x2="210" y2="800" stroke="#f1ede3" strokeWidth="6" />
    </svg>
  );
}

/** Chapitre courant : la dernière section dont le haut a dépassé 35 % de la hauteur de l’écran. */
function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * .35;
      let current = ids[0];
      for (const id of ids) {
        const sec = document.getElementById(id)?.closest('section');
        if (sec && sec.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [ids]);
  return active;
}

export default function App() {
  const ds = useMemo(() => generate(), []);
  const [focus, setFocus] = useState<string | null>(null);
  const active = useScrollSpy(useMemo(() => CHAPTERS.map(c => c.id), []));
  const toBacklog = (id: string) => { setFocus(id); document.getElementById('decision')?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <>
      <a href="#recommandation" className="sr">Aller au contenu</a>
      <nav className="nav" aria-label="Chapitres">
        <div className="wrap">
          <a className="brand" href="#top">MyXpert — <em>Field to Decision</em></a>
          <ol>{CHAPTERS.map(c => <li key={c.id}><a className="ch" href={`#${c.id}`} aria-current={active === c.id}><span>{c.n}</span><b>{c.l}</b></a></li>)}</ol>
        </div>
      </nav>

      <header className="hero" id="top">
        <Tread />
        <div className="wrap">
          <span className="disclaimer">Independent exploratory case study — Non-official Michelin project</span>
          <span className="stamp">DOSSIER 07:12 · AIRE POIDS LOURDS · REMORQUE, ESSIEU 2</span>
          <h1>Un pneu entaillé, trois minutes, <i>une décision.</i></h1>
          <p className="lede">À 07:12, un technicien doit choisir : réparer, remplacer ou immobiliser. Ce dossier part de ce moment pour poser une question produit sur MyXpert : <b>comment faire en sorte qu’un diagnostic commencé sur le terrain aille jusqu’à une décision utile au client, y compris pour les utilisateurs qui arrivent de MyTechXpert ?</b></p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <a className="btn primary" href="#recommandation">Lire la recommandation · 2 min</a>
            <a className="btn ghost" href="#terrain">Essayer le prototype</a>
          </div>
          <div className="meta"><span><b>Polina Agapova</b> · candidate au stage Chef(fe) de produit digital MyXpert</span><span>Novembre 2026</span><span>From user insights to product decisions</span></div>
        </div>
      </header>

      <main>
        <section className="chapter" aria-labelledby="recommandation" style={{ borderTop: 0 }}>
          <div className="wrap">
            <header className="chead">
              <div className="n" aria-hidden="true">00</div>
              <div>
                <h2 id="recommandation">En deux minutes</h2>
                <p>Trois recommandations, dans l’ordre où je les mènerais. Chacune est reliée à un signal, une métrique et une façon de la valider.</p>
              </div>
            </header>

            <div className="legend" style={{ marginBottom: 18, gap: 10 }} aria-label="Légende des étiquettes">
              <Tag p="fact" /><Tag p="hypo" /><Tag p="reco" /><Tag p="fict" />
              <span className="small muted">Chaque affirmation de ce dossier porte l’une de ces étiquettes.</span>
            </div>

            <div className="reco-list">
              <div className="reco-item">
                <span className="k">1</span>
                <div><h4>Rendre le diagnostic résistant au terrain</h4><p className="muted">Reprendre un diagnostic interrompu et rendre la photo facultative, ajoutée plus tard. Deux briques simples avant d’envisager un mode hors ligne complet, beaucoup plus coûteux.</p><p className="small" style={{ marginTop: 6 }}><span className="label">Mesure</span> taux de diagnostics terminés · garde-fou : part des résultats avec photo</p></div>
                <div className="when"><span className="pill">NOW</span><Tag p="reco" /></div>
              </div>
              <div className="reco-item">
                <span className="k">2</span>
                <div><h4>Ne rien décommissionner sans inventaire ni critères</h4><p className="muted">Les fiches publiques de MyXpert ne mentionnent ni l’inspection de flotte, ni le suivi des pneus des clients proposés par MyTechXpert. C’est peut-être déjà couvert ; il faut le vérifier en premier, car ce sont des données créées par les utilisateurs.</p><p className="small" style={{ marginTop: 6 }}><span className="label">Mesure</span> rétention D30 des utilisateurs migrés · usage résiduel de MyTechXpert</p></div>
                <div className="when"><span className="pill">NOW</span><Tag p="reco" /></div>
              </div>
              <div className="reco-item">
                <span className="k">3</span>
                <div><h4>Faire aboutir le diagnostic à un résultat partageable</h4><p className="muted">Le diagnostic aide à décider ; un résumé envoyé au client aide à justifier. À valider d’abord par des entretiens avec des distributeurs et le juridique.</p><p className="small" style={{ marginTop: 6 }}><span className="label">Mesure</span> part des diagnostics terminés qui sont partagés</p></div>
                <div className="when"><span className="pill next">NEXT</span><Tag p="hypo" /></div>
              </div>
            </div>

            <div className="grid2 block" style={{ marginTop: 28 }}>
              <div className="unknowns">
                <div className="label" style={{ marginBottom: 8 }}>Ce que je ne sais pas</div>
                <ul className="clean small">
                  <li>L’usage réel de MyXpert et de MyTechXpert, par fonction et par pays.</li>
                  <li>Ce qui a déjà été repris de MyTechXpert dans MyXpert.</li>
                  <li>Les vraies règles d’expertise derrière le diagnostic.</li>
                  <li>Les contraintes techniques, juridiques et de calendrier de l’équipe.</li>
                </ul>
              </div>
              <div className="unknowns" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <div className="label" style={{ marginBottom: 8 }}>Ce que je ferais la première semaine</div>
                <ul className="clean small">
                  <li>Reprendre ces hypothèses une par une avec le Product Owner.</li>
                  <li>Lire les données réelles d’abandon par étape et de rétention par origine.</li>
                  <li>Accompagner un technicien sur le terrain pendant une demi-journée.</li>
                  <li>Établir l’inventaire réel MyTechXpert → MyXpert.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <Terrain />
        <Donnees ds={ds} onBacklog={toBacklog} />
        <DecisionStudio ds={ds} focus={focus} />
        <Deploiement />

        <section className="chapter" aria-labelledby="pourquoi">
          <div className="wrap">
            <header className="chead"><div className="n" aria-hidden="true">05</div><div><h2 id="pourquoi">Pourquoi ce travail</h2></div></header>
            <div className="why">
              <div className="stack" style={{ gap: 18 }}>
                <p className="quote">« Je ne connais pas encore les défis internes de MyXpert. Mais voici comment je commencerais à les explorer, à poser les bonnes questions et à transformer les premiers enseignements en décisions produit. »</p>
                <p className="muted">J’ai candidaté au stage de Chef(fe) de produit digital sur MyXpert. Plutôt que de décrire ma motivation, j’ai essayé de faire, à petite échelle, une partie du travail : comprendre le produit à partir de ce qui est public, formuler des hypothèses, et montrer comment je les testerais.</p>
                <p className="small muted">Le code a été réalisé avec l’aide d’outils d’IA générative. Les analyses, les choix et les arbitrages sont les miens, et je peux les expliquer.</p>
              </div>
              <div className="bridges">
                <div><span className="label">Mersen</span><p>Gestion des données produits techniques (PIM, ETIM) : un produit B2B vaut ce que valent ses données. C’est la même question pour les spécifications dans MyXpert.</p></div>
                <div><span className="label">Atos · Euromaster</span><p>Construction et analyse de KPI de performance (Power BI, SAP, Slim4) dans un contexte international : définir un indicateur, puis comprendre ce qu’il ne dit pas.</p></div>
                <div><span className="label">IAE Clermont</span><p>Master Management de l’Innovation et Transformation numérique : analyse des besoins, conduite du changement. C’est le cœur d’un décommissionnement réussi.</p></div>
                <div><span className="label">Le produit</span><p>Ce qui m’attire dans le Product Management : relier un utilisateur réel, une donnée et une décision.</p></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <b style={{ color: '#f1ede3' }}>Independent exploratory case study — Non-official Michelin project.</b>
          <p>Ce site n’est ni affilié, ni approuvé par Michelin. Les noms MyXpert et MyTechXpert sont utilisés pour désigner les applications publiques étudiées. Aucune donnée interne n’a été utilisée ; toutes les données chiffrées sont fictives. Le prototype ne reproduit pas l’interface réelle de MyXpert.</p>
          <div className="srcs">
            <span className="label" style={{ color: '#9aa0b4' }}>Faits publics utilisés</span>
            {FACTS.map(f => <span key={f.text}>{f.text} <span style={{ color: '#9aa0b4' }}>[{f.src.join(', ')}]</span></span>)}
            <span className="label" style={{ color: '#9aa0b4', marginTop: 8 }}>Sources</span>
            {SOURCES.map(s => <span key={s.id}>[{s.id}] <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></span>)}
            <span style={{ color: '#9aa0b4', marginTop: 8 }}>Les fiches des stores et l’offre de stage n’ont pas pu être ouvertes directement depuis l’environnement de travail ; elles ont été consultées via des résultats de recherche.</span>
          </div>
          <p>Polina Agapova · agapovapolina2002@gmail.com · linkedin.com/in/polina-agapova</p>
        </div>
      </footer>
    </>
  );
}
