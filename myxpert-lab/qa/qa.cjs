// Contrôle qualité automatisé : erreurs console, débordement horizontal, interactions clés.
// Usage : node qa/qa.cjs [url] [dossier de captures]
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2] || 'http://localhost:4173/';
  const out = process.argv[3] || 'qa';
  const b = await chromium.launch();
  const results = [];
  const check = (name, ok, info = '') => { results.push({ name, ok, info }); };
  for (const [w, h, label] of [[1366, 900, 'desktop'], [390, 844, 'mobile']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${label} : pas de défilement horizontal`, overflow <= 0, `${overflow}px`);
    await p.screenshot({ path: `${out}/${label}-full.png`, fullPage: true });

    if (label === 'desktop') {
      // Prototype : reprise → zone → photo (réseau faible) → qualification → résultat → résumé
      const phone = p.locator('.phone');
      await phone.getByRole('button', { name: 'Reprendre' }).click();
      await phone.getByRole('button', { name: /Flanc/ }).click();
      await phone.getByRole('button', { name: /Prendre la photo/ }).click();
      check('prototype : photo mise en file d’attente en réseau faible', await phone.getByText(/photo enregistrée sur l’appareil/).isVisible());
      await phone.getByRole('button', { name: 'Continuer' }).click();
      const yes = phone.locator('.axle button', { hasText: 'Oui' });
      await yes.nth(0).click(); await yes.nth(1).click();
      await phone.getByRole('button', { name: 'Voir la recommandation' }).click();
      check('prototype : recommandation affichée', await phone.getByText('Remplacer le pneu').isVisible());
      await phone.getByRole('button', { name: 'Préparer le résumé client' }).click();
      await phone.getByRole('button', { name: 'Partager au client' }).click();
      check('prototype : partage factice signalé', await phone.getByText('Démo : aucun envoi n’est effectué.').isVisible());
      await p.locator('#terrain').scrollIntoViewIfNeeded();
      await p.locator('.proto').screenshot({ path: `${out}/prototype.png` });

      // Dashboard : filtres réellement actifs
      const dau = async () => (await p.locator('.kpi').first().locator('.v').textContent()).trim();
      const before = await dau();
      await p.locator('.filters').getByRole('button', { name: 'PL' }).click();
      const after = await dau();
      check('dashboard : le filtre pays modifie les KPI', before !== after, `${before} → ${after}`);
      const allCountries = p.locator('.filters fieldset').nth(1).getByRole('button', { name: 'Tous' });
      await allCountries.click(); // 4 pays → tous
      await allCountries.click(); // tous → aucun
      check('dashboard : état vide géré', await p.getByText('Aucun utilisateur ne correspond').isVisible());
      await allCountries.click(); // aucun → tous
      await p.locator('.filters').getByRole('button', { name: '30 j' }).click();
      check('dashboard : D30 vide sur 30 jours, sans valeur trompeuse', (await p.locator('.kpi', { hasText: 'Rétention D30' }).locator('.v').textContent()).trim() === '—');
      await p.locator('.filters').getByRole('button', { name: '90 j' }).click();
      await p.getByRole('button', { name: /S2 · Rétention/ }).click();
      check('data → decision : signal S2 affiché', await p.locator('.decision').getByText('Les utilisateurs venus de MyTechXpert décrochent').isVisible());
      await p.getByRole('button', { name: /S3 · Activité/ }).click();
      await p.locator('#data-to-decision').screenshot({ path: `${out}/data-to-decision.png` });
      await p.locator('#donnees').screenshot({ path: `${out}/dashboard.png` });

      // Décision : le lien depuis un signal sélectionne l’élément du backlog
      await p.getByRole('button', { name: 'Voir B8 dans le backlog →' }).click();
      await p.waitForTimeout(600);
      check('backlog : sélection depuis un signal', await p.locator('.panel .ph h4', { hasText: 'B8 ·' }).isVisible());
      const rm = async h => (await p.locator('.lane', { hasText: h }).first().locator('.rcard b').allTextContents()).map(t => t.split(' ·')[0]).sort().join(',');
      check('roadmap par défaut cohérente avec la recommandation', (await rm('Now')) === 'B1,B2,B5,B7', await rm('Now'));
      const laneOf = async id => (await p.locator('.bl tr', { hasText: `${id} ·` }).locator('.pill').textContent()).trim();
      const b5Before = await laneOf('B5');
      await p.getByLabel('Tenir compte de l’échéance de décommissionnement').uncheck();
      const b5After = await laneOf('B5');
      check('roadmap : l’échéance change le placement de B5', b5Before === 'NOW' && b5After !== 'NOW', `${b5Before} → ${b5After}`);
      await p.getByLabel('Tenir compte de l’échéance de décommissionnement').check();
      const scoreCell = p.locator('.bl tr', { hasText: 'B7 ·' }).locator('td.score');
      const s0 = (await scoreCell.textContent()).trim();
      await p.getByLabel('Effort B7').fill('2');
      const s1 = (await scoreCell.textContent()).trim();
      check('RICE : recalculé quand l’effort change', s0 !== s1, `${s0} → ${s1}`);
      await p.locator('#decision').screenshot({ path: `${out}/decision.png` });

      // Déploiement : décision de passage
      const gate = p.locator('.gate .big').first();
      const g0 = (await gate.textContent()).trim();
      const st = p.locator('.check .st');
      for (let i = 0; i < 5; i++) await st.nth(i).getByRole('button', { name: 'Vérifié' }).click();
      const g1 = (await gate.textContent()).trim();
      await st.nth(0).getByRole('button', { name: 'Bloquant' }).click();
      const g2 = (await gate.textContent()).trim();
      check('marché : la décision suit les statuts', g0 === 'Pas encore prêt' && g1 === 'Lancement possible' && g2 === 'Pas encore prêt', `${g0} / ${g1} / ${g2}`);
      const dgate = p.locator('.gate .big').nth(1);
      check('décommissionnement : bloqué par défaut', (await dgate.textContent()).trim() === 'Pas encore');
      await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('decision').scrollIntoView(); });
      await p.waitForTimeout(500);
      check('navigation : le chapitre courant est signalé', (await p.locator('.nav a[aria-current="true"]').textContent()).includes('Décision'));
      await p.locator('#deploiement').screenshot({ path: `${out}/deploiement.png` });
      await p.locator('header.hero').screenshot({ path: `${out}/hero.png` });
    } else {
      await p.locator('header.hero').screenshot({ path: `${out}/mobile-hero.png` });
      await p.locator('.phone').scrollIntoViewIfNeeded();
      await p.locator('.phone').screenshot({ path: `${out}/mobile-phone.png` });
    }
    check(`${label} : aucune erreur console`, errors.length === 0, errors.join(' | '));
    await p.close();
  }
  await b.close();
  for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}${r.info ? ' — ' + r.info : ''}`);
  process.exitCode = results.every(r => r.ok) ? 0 : 1;
})();
