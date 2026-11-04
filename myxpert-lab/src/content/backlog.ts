import type { Dataset } from '../data/model';
import type { Item } from '../data/rice';

/** Fenêtre utilisée pour estimer le Reach (90 derniers jours de la période fictive ≈ un trimestre). */
export const REACH_FROM = 30, REACH_TO = 119;

export interface BacklogItem extends Omit<Item, 'reach'> {
  problem: string;
  metric: string;
  story: string;
  acceptance: string[];
  risks: string;
  reachRule: string;
  computeReach: (ds: Dataset) => number;
}

const usersWhere = (ds: Dataset, pred: (d: Dataset['diagnoses'][number]) => boolean) =>
  new Set(ds.diagnoses.filter(d => d.day >= REACH_FROM && d.day <= REACH_TO && pred(d)).map(d => d.user)).size;
const activeUsers = (ds: Dataset, pred: (u: Dataset['users'][number]) => boolean = () => true) =>
  ds.users.filter(u => pred(u) && u.activity.slice(REACH_FROM, REACH_TO + 1).some(Boolean)).length;

export const BACKLOG: BacklogItem[] = [
  {
    id: 'B1', title: 'Reprendre un diagnostic interrompu',
    impact: 2, confidence: .8, effort: 1.5,
    problem: 'Un diagnostic interrompu (appel, client, réseau) est perdu et doit être recommencé.',
    metric: 'Taux de complétion des diagnostics',
    story: 'En tant que technicien, je veux retrouver mon diagnostic là où je l’ai laissé, afin de ne pas tout ressaisir après une interruption.',
    acceptance: ['L’étape en cours et les réponses sont conservées sur l’appareil pendant 24 h', 'L’accueil propose « Reprendre » avec le véhicule et l’heure', 'Je peux abandonner explicitement un diagnostic en cours'],
    risks: 'Stockage local à valider avec la sécurité ; diagnostic obsolète si le pneu a changé.',
    reachRule: 'Utilisateurs ayant abandonné au moins un diagnostic sur le trimestre',
    computeReach: ds => usersWhere(ds, d => !d.completed),
  },
  {
    id: 'B2', title: 'Photo facultative, ajoutée plus tard',
    impact: 1, confidence: .8, effort: 1,
    problem: 'L’étape photo bloque le parcours quand le réseau est faible ou la zone difficile à photographier.',
    metric: 'Taux d’abandon à l’étape photo',
    story: 'En tant que technicien, je veux pouvoir passer la photo et l’ajouter plus tard, afin d’obtenir la recommandation sans attendre.',
    acceptance: ['Bouton « Passer, ajouter plus tard » visible', 'La photo se met en file d’attente si le réseau est faible', 'Le résultat indique clairement « sans photo »'],
    risks: 'Moins de photos dans les rapports : à suivre comme garde-fou.',
    reachRule: 'Utilisateurs ayant atteint l’étape photo sur le trimestre',
    computeReach: ds => usersWhere(ds, d => d.reached >= 3),
  },
  {
    id: 'B3', title: 'Diagnostic entièrement hors connexion',
    impact: 3, confidence: .5, effort: 5,
    problem: 'En zone blanche, le parcours est inutilisable.',
    metric: 'Complétion des diagnostics en réseau faible',
    story: 'En tant que technicien itinérant, je veux réaliser un diagnostic complet sans réseau, afin de décider sur place.',
    acceptance: ['Contenus du diagnostic disponibles hors ligne', 'Synchronisation automatique au retour du réseau', 'Version des contenus affichée'],
    risks: 'Taille des contenus, mises à jour de sécurité qui doivent atteindre tous les appareils, coût de maintenance élevé.',
    reachRule: 'Utilisateurs ayant fait au moins un diagnostic en réseau faible',
    computeReach: ds => usersWhere(ds, d => d.weakNetwork),
  },
  {
    id: 'B4', title: 'Résultat de diagnostic partageable',
    impact: 2, confidence: .5, effort: 3, dependsOn: ['B1'],
    problem: 'Le diagnostic aide à décider, mais pas à expliquer la décision au client flotte.',
    metric: 'Part des diagnostics terminés qui sont partagés',
    story: 'En tant que technicien, je veux envoyer un résumé clair du diagnostic à mon client, afin de justifier le remplacement ou la réparation.',
    acceptance: ['Résumé : pneu, position, dommage, recommandation, photo éventuelle', 'Envoi par lien ou PDF depuis le téléphone', 'Aucune donnée personnelle inutile'],
    risks: 'Responsabilité si la recommandation est mal interprétée : formulation à valider avec le juridique et les experts.',
    reachRule: 'Utilisateurs ayant terminé au moins un diagnostic sur le trimestre',
    computeReach: ds => usersWhere(ds, d => d.completed),
  },
  {
    id: 'B5', title: 'Parcours de migration depuis MyTechXpert',
    impact: 2, confidence: .5, effort: 2.5, deadline: true,
    problem: 'Les utilisateurs de MyTechXpert, surtout ceux qui suivaient les pneus de leurs clients, risquent de décrocher au décommissionnement.',
    metric: 'Rétention D30 des utilisateurs migrés',
    story: 'En tant qu’utilisateur de MyTechXpert, je veux savoir ce que je retrouve dans MyXpert et comment récupérer mes données, afin de ne rien perdre.',
    acceptance: ['Message in-app dans MyTechXpert avec lien direct', 'Correspondance des fonctions « avant / après »', 'Récupération ou export des données d’inspection, si techniquement possible'],
    risks: 'Faisabilité de la migration des données à vérifier ; calendrier imposé par le décommissionnement.',
    reachRule: 'Utilisateurs venus de MyTechXpert',
    computeReach: ds => ds.users.filter(u => u.migrated).length,
  },
  {
    id: 'B6', title: 'Accueil adapté au métier',
    impact: 1, confidence: .5, effort: 2,
    problem: 'Un conseiller commercial et un technicien n’ouvrent pas l’application pour la même chose.',
    metric: 'Stickiness (DAU / MAU)',
    story: 'En tant qu’utilisateur, je veux voir en premier les fonctions que j’utilise le plus, afin d’aller plus vite.',
    acceptance: ['Choix du métier à l’onboarding, modifiable', 'Trois raccourcis adaptés', 'Aucune fonction cachée pour les autres métiers'],
    risks: 'Segmentation réelle inconnue ; risque de complexifier la navigation.',
    reachRule: 'Utilisateurs actifs sur le trimestre',
    computeReach: ds => activeUsers(ds),
  },
  {
    id: 'B7', title: 'Une question après chaque diagnostic',
    impact: .5, confidence: .8, effort: .5,
    problem: 'Le feedback des utilisateurs terrain est rare et peu contextualisé.',
    metric: 'Taux de réponse et CSAT par étape',
    story: 'En tant qu’équipe produit, je veux une note et un commentaire facultatif juste après un diagnostic, afin de comprendre ce qui bloque.',
    acceptance: ['Une seule question, ignorable en un geste', 'Pas plus d’une sollicitation par semaine et par utilisateur', 'Réponses reliées à la version et au pays'],
    risks: 'Lassitude des utilisateurs : plafonner la fréquence.',
    reachRule: 'Utilisateurs ayant terminé au moins un diagnostic sur le trimestre',
    computeReach: ds => usersWhere(ds, d => d.completed),
  },
  {
    id: 'B8', title: 'Revue terrain de la localisation polonaise',
    impact: 1, confidence: .8, effort: 1,
    problem: 'L’activité baisse en Pologne après une mise à jour (signal fictif S3).',
    metric: 'DAU Pologne',
    story: 'En tant qu’utilisateur polonais, je veux des libellés techniques exacts dans ma langue, afin de faire confiance aux recommandations.',
    acceptance: ['Relecture par un expert technique local', 'Glossaire partagé des termes techniques', 'Contrôle avant chaque version'],
    risks: 'Dépend des ressources locales disponibles.',
    reachRule: 'Utilisateurs actifs en Pologne sur le trimestre',
    computeReach: ds => activeUsers(ds, u => u.country === 'PL'),
  },
];
