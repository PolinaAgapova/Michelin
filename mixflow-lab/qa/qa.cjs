// Contrôle qualité navigateur : node qa/qa.cjs [url] [dossier de captures]
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2] || 'http://localhost:4175/';
  const out = process.argv[3] || 'qa';
  const routes = ['synthese', 'flux', 'stockage', 'application', 'tracabilite', 'deploiement', 'parcours', 'methode'];
  const b = await chromium.launch();
  const res = []; const check = (n, ok, info = '') => res.push({ n, ok, info });
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    for (const r of routes) {
      await p.goto(`${url}#${r}`, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(`${tag} · ${r} : pas de défilement horizontal`, ov <= 0, `${ov}px`);
      await p.screenshot({ path: `${out}/${tag}-${r}.png`, fullPage: true });
    }
    if (tag === 'desktop') {
      await p.goto(`${url}#flux`, { waitUntil: 'networkidle' });
      await p.locator('.step', { hasText: 'Destruction' }).click();
      check('Flux : clic sur une étape → détail', (await p.locator('.grid3 h3').first().textContent()).includes('Destruction'));

      await p.goto(`${url}#stockage`, { waitUntil: 'networkidle' });
      const gain = async () => (await p.locator('.kpi.ok .v').last().textContent()).trim();
      const g10 = await gain();
      await p.locator('input[type=range]').fill('25');
      const g25 = await gain();
      check('Stockage : plus de budget → plus de gain', g10 !== g25, `${g10} → ${g25}`);
      await p.getByRole('button', { name: 'Après réimplantation' }).click();
      check('Stockage : vue après réimplantation', await p.getByRole('button', { name: 'Après réimplantation' }).getAttribute('aria-pressed') === 'true');

      await p.goto(`${url}#tracabilite`, { waitUntil: 'networkidle' });
      await p.locator('input.search').fill('LOT-26-0002');
      check('Traçabilité : recherche', (await p.locator('.lotbtn').count()) === 1);
      await p.locator('.lotbtn').first().click();
      check('Traçabilité : historique affiché', (await p.locator('.timeline-v > div').count()) >= 3);

      await p.goto(`${url}#application`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(300);
      const ph = p.locator('.phone');
      await ph.getByRole('button', { name: 'Scanner un lot' }).click();
      await p.waitForTimeout(200);
      await ph.locator('.screen .pbtn.alt').nth(2).click(); // LOT-26-0005 : 5 kg restants
      await p.waitForTimeout(200);
      const before = await ph.locator('.lot-card').first().textContent();
      await ph.getByRole('button', { name: 'Prélever' }).click();
      await ph.locator('#qty').fill('9999');
      await ph.getByRole('button', { name: 'Valider' }).click();
      check('Application : quantité excessive refusée', (await ph.locator('.toast').textContent()).includes('invalide'));
      await ph.locator('#qty').fill('0,5');
      await ph.getByRole('button', { name: 'Valider' }).click();
      await p.waitForTimeout(200);
      const after = await ph.locator('.lot-card').first().textContent();
      check('Application : prélèvement enregistré et historique mis à jour', before !== after && (await ph.locator('.tl li', { hasText: 'Prélèvement' }).first().textContent()).includes('0.5'), '');
      await ph.getByRole('button', { name: 'Déplacer' }).click();
      const opts = await ph.locator('#dest option').allTextContents();
      check('Application : seuls des emplacements compatibles sont proposés', opts.length > 0 && opts.length < 80, `${opts.length} options`);
    }
    check(`${tag} : aucune erreur console`, errors.length === 0, errors.join(' | '));
    await p.close();
  }
  await b.close();
  for (const r of res) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.n}${r.info ? ' — ' + r.info : ''}`);
  process.exitCode = res.every(r => r.ok) ? 0 : 1;
})();
