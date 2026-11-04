/** Contenus éditoriaux : sources, signaux, marchés, transition. */

export type Prov = 'fact' | 'hypo' | 'reco' | 'fict';

export const SOURCES = [
  { id: 'S-app', label: 'Fiche App Store « MICHELIN MyXpert » (id6741895803), consultée via résultats de recherche', url: 'https://apps.apple.com/us/app/michelin-myxpert/id6741895803' },
  { id: 'S-play', label: 'Fiche Google Play « MICHELIN MyXpert » (com.michelin.b2bmasterapp), consultée via résultats de recherche', url: 'https://play.google.com/store/apps/details?id=com.michelin.b2bmasterapp' },
  { id: 'S-tech', label: 'Fiche App Store « MICHELIN MyTechXpert » (id1570217230)', url: 'https://apps.apple.com/app/id1570217230' },
  { id: 'S-ctb', label: 'Commercial Tyre Business — lancement de MyTechXpert', url: 'https://www.commercialtyrebusiness.com/?p=16088' },
  { id: 'S-fm', label: 'Fleet Maintenance — Michelin launches new tire data app (Amérique du Nord)', url: 'https://www.fleetmaintenance.com/equipment/brakes-tire-and-wheel/press-release/53077646/michelin-north-america-michelin-launches-new-tire-data-app' },
  { id: 'S-mtd', label: 'Modern Tire Dealer — Michelin Launches App for Truck Tire Data', url: 'https://www.moderntiredealer.com/commercial-business/article/33014680/michelin-launches-app-for-truck-tire-data' },
  { id: 'S-au', label: 'Michelin Australie — page MyTechXpert', url: 'https://business.michelin.com.au/why-choose-michelin/mytechxpert-app' },
];

export const FACTS = [
  { text: 'MyXpert s’adresse aux distributeurs de pneus commerciaux : transport, agriculture, construction, manutention.', src: ['S-app', 'S-play'] },
  { text: 'Elle propose un sélecteur de produits, des spécifications techniques, des recommandations de pression et de montage, et un diagnostic de dommage pas à pas.', src: ['S-app', 'S-play'] },
  { text: 'MyTechXpert, lancée en 2022 en Europe, est la version numérique du carnet technique poids lourd Michelin.', src: ['S-ctb', 'S-au'] },
  { text: 'MyTechXpert propose aussi une inspection rapide de flotte, le suivi des pneus des clients et des rapports d’inspection (selon les pays).', src: ['S-tech', 'S-fm', 'S-mtd'] },
];

export interface Signal {
  id: 'S1' | 'S2' | 'S3';
  title: string;
  where: string;
  interpretations: string[];
  dataNeeded: string[];
  hypothesis: string;
  experiment: string;
  success: string;
  guardrails: string[];
  backlog: string[];
}

export const SIGNALS: Signal[] = [
  {
    id: 'S1', title: 'Les diagnostics s’arrêtent à l’étape photo', where: 'Abandons par étape',
    interpretations: [
      'Le réseau est trop faible pour envoyer la photo (plus fréquent chez les techniciens itinérants).',
      'La zone endommagée est difficile à photographier (intérieur, talon, nuit).',
      'L’utilisateur a déjà son avis et ne voit pas l’intérêt de la photo.',
      'Problème technique : appareil photo, autorisations, version d’OS.',
    ],
    dataNeeded: ['Qualité réseau au moment de l’abandon', 'Temps passé sur l’étape', 'Version d’app et d’OS', 'Refus d’autorisation caméra', '5 à 8 entretiens terrain'],
    hypothesis: 'Si la photo devient facultative et peut être ajoutée plus tard, alors la complétion des diagnostics en réseau faible augmentera, sans baisse notable de la qualité des résultats.',
    experiment: 'Test A/B sur l’étape photo : A = photo obligatoire, B = « Passer, ajouter plus tard ». Attribution par utilisateur, 50/50.',
    success: 'Taux de complétion des diagnostics (critère principal)',
    guardrails: ['Part des diagnostics terminés avec photo', 'CSAT après diagnostic', 'Taux de contact du support'],
    backlog: ['B2', 'B1', 'B3'],
  },
  {
    id: 'S2', title: 'Les utilisateurs venus de MyTechXpert décrochent', where: 'Rétention par segment',
    interpretations: [
      'Ils ne retrouvent pas l’inspection de flotte ou le suivi de leurs clients (à vérifier dans MyXpert).',
      'L’organisation de l’application est différente et leurs habitudes sont cassées.',
      'Ils continuent d’utiliser MyTechXpert tant qu’elle fonctionne.',
    ],
    dataNeeded: ['Usage de MyTechXpert par fonction, après installation de MyXpert', 'Inventaire réel des fonctions reprises', 'Tickets de support mentionnant la migration', 'Entretiens avec des utilisateurs historiques'],
    hypothesis: 'Si les utilisateurs migrés reçoivent une correspondance claire des fonctions et un moyen de récupérer leurs données, alors leur rétention D30 se rapprochera de celle des autres utilisateurs.',
    experiment: 'Déploiement progressif du parcours de migration par pays, en comparant la rétention D30 avant et après, ou en différant l’accès pour un groupe témoin si c’est acceptable.',
    success: 'Rétention D30 des utilisateurs migrés',
    guardrails: ['Usage résiduel de MyTechXpert', 'Tickets de support liés à la migration', 'Note des stores'],
    backlog: ['B5'],
  },
  {
    id: 'S3', title: 'L’activité baisse en Pologne', where: 'Activité par pays',
    interpretations: [
      'Une mise à jour a introduit des libellés mal traduits (signal fictif : version mal localisée).',
      'Saisonnalité locale (fin de saison agricole, par exemple).',
      'Changement dans le réseau de distribution local.',
      'Biais de mesure : changement de tracking.',
    ],
    dataNeeded: ['Date des versions par pays', 'Évolution comparée des autres pays', 'Avis des stores en polonais', 'Échange avec l’équipe locale'],
    hypothesis: 'Si la terminologie technique polonaise est relue et corrigée par un expert local, alors le DAU polonais retrouvera son niveau d’avant la mise à jour en 4 semaines.',
    experiment: 'Pas de test A/B ici : correction rapide puis suivi avant / après, avec les autres pays comme référence.',
    success: 'DAU Pologne, comparé à la tendance des autres pays',
    guardrails: ['Note des stores en Pologne', 'Délai de correction des contenus'],
    backlog: ['B8', 'B7'],
  },
];

import type { Status } from '../data/gates';
export interface Market {
  id: string; name: string; why: string;
  checks: { label: string; weight: number; status: Status; note: string }[];
  onboarding: string; feedback: string;
}

export const MARKETS: Market[] = [
  {
    id: 'uk', name: 'Royaume-Uni', why: 'Marché anglophone : teste la maturité des contenus en anglais et les unités.',
    checks: [
      { label: 'Contenus techniques disponibles en anglais', weight: 3, status: 'todo', note: 'À vérifier' },
      { label: 'Unités de pression affichées (bar et psi)', weight: 2, status: 'todo', note: 'Usage local à confirmer avec l’équipe' },
      { label: 'Gamme commerciale locale dans le sélecteur', weight: 3, status: 'todo', note: 'À vérifier' },
      { label: 'Cadre de protection des données post-Brexit', weight: 2, status: 'todo', note: 'Avis juridique nécessaire' },
      { label: 'Relais distributeurs pour le pilote', weight: 2, status: 'todo', note: 'À identifier' },
    ],
    onboarding: 'Pilote avec 2 ou 3 distributeurs, session de 20 minutes en atelier, puis relais par les commerciaux.',
    feedback: 'Une question après diagnostic, 5 entretiens au bout de 3 semaines, revue des avis des stores.',
  },
  {
    id: 'se', name: 'Suède', why: 'Conditions hivernales : teste les contenus saisonniers et l’usage avec des gants.',
    checks: [
      { label: 'Traduction suédoise des parcours', weight: 3, status: 'todo', note: 'À vérifier' },
      { label: 'Contenus et règles locales sur les pneus hiver', weight: 3, status: 'todo', note: 'Règles à vérifier, ne rien supposer' },
      { label: 'Utilisation avec des gants (taille des zones tactiles)', weight: 2, status: 'todo', note: 'À tester sur le terrain' },
      { label: 'Gamme commerciale locale dans le sélecteur', weight: 2, status: 'todo', note: 'À vérifier' },
      { label: 'Relais distributeurs pour le pilote', weight: 2, status: 'todo', note: 'À identifier' },
    ],
    onboarding: 'Lancement avant la saison hiver, démonstration en agence, fiche « 3 gestes » imprimable.',
    feedback: 'Question après diagnostic, observation terrain de 2 journées, point mensuel avec l’équipe locale.',
  },
  {
    id: 'ro', name: 'Roumanie', why: 'Nouvelle langue et réseau de distribution différent : teste la chaîne de localisation.',
    checks: [
      { label: 'Traduction roumaine relue par un expert technique', weight: 3, status: 'todo', note: 'À organiser' },
      { label: 'Parc d’appareils (versions Android, mémoire)', weight: 2, status: 'todo', note: 'À mesurer' },
      { label: 'Qualité réseau sur les sites clients', weight: 2, status: 'todo', note: 'À mesurer pendant le pilote' },
      { label: 'Gamme commerciale locale dans le sélecteur', weight: 2, status: 'todo', note: 'À vérifier' },
      { label: 'Relais distributeurs pour le pilote', weight: 3, status: 'todo', note: 'À identifier' },
    ],
    onboarding: 'Pilote accompagné par un ambassadeur local, vidéo courte en roumain, ligne de support identifiée.',
    feedback: 'Question après diagnostic, groupe d’utilisateurs pilotes, revue hebdomadaire pendant 6 semaines.',
  },
];

export type Coverage = 'listed' | 'partial' | 'unknown';
export interface InventoryItem { feature: string; source: string; inMyXpert: Coverage; risk: 'élevé' | 'moyen' | 'faible'; userData: boolean; action: string }

/** Inventaire construit à partir des seules informations publiques. Tout est à confirmer avec l’équipe. */
export const INVENTORY: InventoryItem[] = [
  { feature: 'Spécifications techniques', source: 'S-tech', inMyXpert: 'listed', risk: 'faible', userData: false, action: 'Vérifier la couverture des références (plus de 200 pneus poids lourd)' },
  { feature: 'Recommandations de pression', source: 'S-tech', inMyXpert: 'listed', risk: 'moyen', userData: false, action: 'Comparer les résultats sur un jeu de cas de référence' },
  { feature: 'Aide au diagnostic (images)', source: 'S-mtd', inMyXpert: 'listed', risk: 'moyen', userData: false, action: 'Vérifier que les cas couverts sont au moins équivalents' },
  { feature: 'Sélecteur de pneus', source: 'S-ctb', inMyXpert: 'listed', risk: 'faible', userData: false, action: 'Vérifier les filtres poids lourd' },
  { feature: 'Service Manual : montage et sécurité', source: 'S-mtd', inMyXpert: 'partial', risk: 'moyen', userData: false, action: 'Le montage est mentionné ; vérifier les consignes de sécurité' },
  { feature: 'Rechapage et recreusage', source: 'S-tech', inMyXpert: 'unknown', risk: 'moyen', userData: false, action: 'Non mentionné publiquement : vérifier' },
  { feature: 'Vidéos de formation', source: 'S-mtd', inMyXpert: 'unknown', risk: 'faible', userData: false, action: 'Non mentionné publiquement : vérifier, ou rediriger vers un autre canal' },
  { feature: 'Inspection rapide de flotte', source: 'S-tech', inMyXpert: 'unknown', risk: 'élevé', userData: true, action: 'Non mentionné publiquement : point bloquant à lever en premier' },
  { feature: 'Suivi des pneus des clients et rapports d’inspection', source: 'S-tech', inMyXpert: 'unknown', risk: 'élevé', userData: true, action: 'Données créées par les utilisateurs : prévoir récupération, export ou conservation' },
];

export const TIMELINE = [
  { t: 'T − 120 j', title: 'Inventaire et mesure', body: 'Inventaire validé avec l’équipe, mesure de l’usage par fonction dans MyTechXpert, liste des utilisateurs actifs.' },
  { t: 'T − 90 j', title: 'Combler les écarts', body: 'Décider pour chaque fonction non reprise : reprendre, remplacer, ou arrêter en l’expliquant.' },
  { t: 'T − 60 j', title: 'Annoncer', body: 'Message in-app dans MyTechXpert, relais par les commerciaux et les distributeurs, page d’aide « avant / après ».' },
  { t: 'T − 30 j', title: 'Accompagner', body: 'Export ou migration des données, rappel ciblé aux utilisateurs encore actifs, support renforcé.' },
  { t: 'T 0', title: 'Passage en lecture seule', body: 'Plus de création de données ; consultation et export toujours possibles.' },
  { t: 'T + 30 j', title: 'Retrait', body: 'Retrait des stores une fois les critères atteints ; bilan et suivi de la rétention des migrés.' },
];
