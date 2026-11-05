// Contrôle qualité navigateur : node qa/qa.cjs [url] [dossier de captures]
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2] || 'http://localhost:4174/';
  const out = process.argv[3] || 'qa';
  const routes = ['vue', 'flux', 'previsions', 'simulation', 'recommandations', 'parcours', 'methode'];
  const b = await chromium.launch();
  const res = [];
  const check = (n, ok, info = '') => res.push({ n, ok, info });
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    for (const r of routes) {
      await p.goto(`${url}#${r}`, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(150);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(`${tag} · ${r} : pas de défilement horizontal`, ov <= 0, `${ov}px`);
      await p.screenshot({ path: `${out}/${tag}-${r}.png`, fullPage: true });
    }
    if (tag === 'desktop') {
      await p.goto(`${url}#vue`, { waitUntil: 'networkidle' });
      const v = async () => (await p.locator('.kpi').first().locator('.v').textContent()).trim();
      const v0 = await v();
      await p.locator('.filters select').nth(2).selectOption('C');
      check('A : le filtre famille / criticité modifie les KPI', v0 !== await v(), `${v0} → ${await v()}`);
      await p.locator('.kpi .info').first().click();
      check('A : définition du KPI affichée', await p.locator('.def').first().isVisible());

      await p.goto(`${url}#flux`, { waitUntil: 'networkidle' });
      await p.locator('.flow .node', { hasText: 'Stock intermédiaire' }).click();
      check('B : clic sur une étape → détail', (await p.locator('aside h3').textContent()).includes('Stock intermédiaire'));

      await p.goto(`${url}#simulation`, { waitUntil: 'networkidle' });
      const verdict = async () => (await p.locator('.verdict b').textContent()).trim();
      const v1 = await verdict();
      await p.locator('.preset', { hasText: 'Besoins +20 %' }).click();
      const v2 = await verdict();
      check('D : le cas +20 % change le verdict', v1 !== v2 && v2 === 'Le plan ne tient pas', `${v1} → ${v2}`);
      const fill = async () => (await p.locator('.cmp > div').nth(6).textContent()).trim();
      await p.locator('.preset', { hasText: 'Priorité par criticité' }).click();
      check('D : priorité par criticité dégrade le service dans ce cas', (await fill()) !== '100,0 %', await fill());
      await p.getByRole('button', { name: 'Revenir à la référence' }).first().click();

      await p.goto(`${url}#recommandations`, { waitUntil: 'networkidle' });
      check('E : recommandations retenues et écartées', (await p.locator('.reco').count()) >= 4 && (await p.locator('.reco.out').count()) >= 1, `${await p.locator('.reco').count()} cartes`);
      await p.locator('.reco', { hasText: 'R1-FL-A' }).getByRole('button', { name: 'Appliquer dans le simulateur' }).click();
      await p.waitForTimeout(300);
      check('E → D : action appliquée visible dans le simulateur', await p.locator('.applied button', { hasText: 'R1-FL-A' }).isVisible());
      const rows = await p.locator('.cmp > div').allTextContents();
      check('E → D : l’action améliore le service', rows[6] !== rows[5], `${rows[5]} → ${rows[6]}`);
    }
    check(`${tag} : aucune erreur console`, errors.length === 0, errors.join(' | '));
    await p.close();
  }
  await b.close();
  for (const r of res) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.n}${r.info ? ' — ' + r.info : ''}`);
  process.exitCode = res.every(r => r.ok) ? 0 : 1;
})();
