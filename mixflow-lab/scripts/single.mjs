// Construit une version « un seul fichier » du site (CSS et JS intégrés), utile pour un partage par lien.
// Usage : npm run build && node scripts/single.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const css = [...html.matchAll(/<link rel="stylesheet" crossorigin href="([^"]+)">/g)].map(m => readFileSync(join(dist, m[1]), 'utf8')).join('\n');
const js = [...html.matchAll(/<script type="module" crossorigin src="([^"]+)"><\/script>/g)].map(m => readFileSync(join(dist, m[1]), 'utf8')).join('\n');
if (!css || !js) throw new Error('CSS ou JS introuvable dans dist/index.html');
const safeJs = js.replace(/<\/script/gi, '<\\/script');
const page = `<title>MIXFLOW Lab</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Prototype personnel de candidature : flux, stockage et traçabilité des mélanges de laboratoire. Données 100 % fictives, projet non affilié à Michelin.">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${css}</style>
<div id="root"></div>
<script type="module">${safeJs}</script>
`;
mkdirSync('dist-single', { recursive: true });
writeFileSync('dist-single/mixflow-lab.html', page);
console.log('dist-single/mixflow-lab.html', (page.length / 1024).toFixed(0), 'Ko');
