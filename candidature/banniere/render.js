// Exporte une bannière en PNG : node render.js <fichier.html> <sortie.png> [échelle]
// L'échelle 1 donne exactement 1584 × 396 px ; 2 donne 3168 × 792 px.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [src, out, scale = '1'] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1584, height: 396 }, deviceScaleFactor: Number(scale) });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto('file://' + path.resolve(src));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  const fonts = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family));
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1584, height: 396 } });
  console.log(path.basename(out), 'fonts:', [...new Set(fonts)].join(', ') || 'AUCUNE', errors.length ? 'ERREURS: ' + errors : '');
  await b.close();
})();
