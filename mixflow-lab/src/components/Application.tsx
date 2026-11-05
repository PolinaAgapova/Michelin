import { useMemo, useState } from 'react';
import { Stats } from './Hero';
import { DATA, days, expiresSoon, inStock, isExpired, type Lot, type Mouvement } from '../data/lab';
import { fmt } from './charts';
import { AppShowcase } from './AppShowcase';

type Screen = 'home' | 'scan' | 'fiche' | 'prelever' | 'deplacer' | 'fin';
const NOTES: Record<Screen, [string, string]> = {
  home: ['Accueil', 'L’alerte de péremption est la première information affichée : c’est ce qui fait perdre le plus de matière.'],
  scan: ['Scan du QR code', 'Le QR code contient seulement le numéro de lot : l’étiquette reste valable même si le lot change d’emplacement.'],
  fiche: ['Fiche du lot', 'État actuel (où, combien, jusqu’à quand) et historique complet : c’est la traçabilité.'],
  prelever: ['Prélèvement', 'Règle de gestion : impossible de prélever plus que le stock restant. Chaque prélèvement crée un mouvement daté et signé.'],
  deplacer: ['Déplacement', 'Seuls les emplacements compatibles avec la conservation du mélange sont proposés ; la zone ergonomique est affichée.'],
  fin: ['Fin de vie', 'Confirmation sur un écran dédié, motif enregistré automatiquement (péremption ou fin d’usage).'],
};

export function Application() {
  const [lots, setLots] = useState<Lot[]>(() => DATA.lots.map(l => ({ ...l })));
  const [mvts, setMvts] = useState<Mouvement[]>(() => [...DATA.mouvements]);
  const [screen, setScreen] = useState<Screen>('home');
  const [cur, setCur] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [onlyExp, setOnlyExp] = useState(false);
  const [qty, setQty] = useState('');
  const [dest, setDest] = useState('');
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const mel = useMemo(() => new Map(DATA.melanges.map(m => [m.code, m])), []);
  const lot = lots.find(l => l.num === cur);
  const flash = (t: string, ok = true) => { setToast({ t, ok }); window.setTimeout(() => setToast(x => (x?.t === t ? null : x)), 2400); };
  const log = (m: Omit<Mouvement, 'id' | 'date' | 'user'>) => setMvts(xs => [...xs, { ...m, id: `MV-APP-${xs.length + 1}`, date: DATA.ref, user: 'Moi (démo)' }]);
  const update = (num: string, patch: Partial<Lot>) => setLots(xs => xs.map(l => (l.num === num ? { ...l, ...patch } : l)));
  const expiredCount = lots.filter(l => isExpired(l, DATA.ref)).length;
  const list = lots.filter(l => inStock(l) && (!onlyExp || isExpired(l, DATA.ref)) && (!q || `${l.num} ${l.melange} ${l.emplacement}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 30);
  const scanDemo = lots.filter(l => inStock(l)).slice(0, 4);
  const open = (num: string) => { setCur(num); setScreen('fiche'); };
  const color = (l: Lot) => (!inStock(l) ? '#6b7480' : isExpired(l, DATA.ref) ? '#d92d20' : expiresSoon(l, DATA.ref) ? '#c27803' : '#0f8a6c');

  const prelever = () => {
    const v = Number(qty.replace(',', '.'));
    if (!lot || !(v > 0) || v > lot.qteReste) { flash(`Quantité invalide : entre 0 et ${lot?.qteReste} kg`, false); return; }
    const reste = Math.round((lot.qteReste - v) * 10) / 10;
    update(lot.num, { qteReste: reste, statut: reste <= 0 ? 'Épuisé' : lot.statut });
    log({ lot: lot.num, type: 'Prélèvement', qte: v, de: lot.emplacement, vers: null, commentaire: 'Saisi dans la démo' });
    setQty(''); flash('Prélèvement enregistré'); setScreen('fiche');
  };
  const deplacer = () => {
    if (!lot || !dest) return;
    log({ lot: lot.num, type: 'Déplacement', qte: lot.qteReste, de: lot.emplacement, vers: dest, commentaire: null });
    update(lot.num, { emplacement: dest }); flash('Lot déplacé'); setScreen('fiche');
  };
  const finDeVie = () => {
    if (!lot) return;
    log({ lot: lot.num, type: 'Fin de vie', qte: lot.qteReste, de: lot.emplacement, vers: 'Benne déchets', commentaire: isExpired(lot, DATA.ref) ? 'Péremption' : 'Fin d’usage' });
    update(lot.num, { statut: 'Détruit', qteReste: 0, emplacement: null }); flash('Fin de vie enregistrée'); setScreen('home');
  };
  const back = () => setScreen(screen === 'fiche' || screen === 'scan' ? 'home' : 'fiche');
  const compat = lot ? DATA.emplacements.filter(e => e.conservation === mel.get(lot.melange)!.conservation && e.code !== lot.emplacement) : [];

  return (
    <>
      <div className="ph" data-n="03">
        <div>
          <div className="kicker">Mission 03 · Digitaliser la gestion des stocks</div>
          <h1>Deux gestes pour tracer un prélèvement : scanner, saisir</h1>
          <p>Prototype cliquable du parcours mobile. Une version utilisable sur téléphone, qui scanne réellement les étiquettes QR des lots, est disponible : <a href="https://claude.ai/artifact/XPXGo2yF9hJHMgcWXJAL8P" target="_blank" rel="noopener noreferrer">ouvrir l’application de démonstration</a>.</p>
        </div>
        <span className="hypo">Démonstration : les modifications ne sont pas enregistrées</span>
      </div>
      <Stats items={[
        { value: 2, format: v => `${Math.round(v)}`, label: 'gestes pour déclarer un prélèvement : scanner, saisir' },
        { value: 63, format: v => `${Math.round(v)}`, label: 'étiquettes QR générées pour les lots en stock', tone: 'ok' },
        { value: expiredCount, format: v => `${Math.round(v)}`, label: 'alertes de péremption visibles dès l’écran d’accueil', tone: 'bad' },
      ]} />
      <AppShowcase />
      <h2 className="label" style={{ margin: '28px 0 12px' }}>À vous d’essayer : le prototype cliquable</h2>
      <div className="proto">
        <div className="phone" aria-label="Prototype de l’application mobile">
          <div className="ph-island" aria-hidden="true" />
          <div className="screen">
            <div className="sbar" aria-hidden="true"><span>9:41</span><span className="sbar-r"><i /><i /><i /><b /></span></div>
            {toast && <div className={`toast ${toast.ok ? 'ok' : 'ko'}`} role="status"><span className="t-ic">{toast.ok ? '✓' : '!'}</span>{toast.t}</div>}
            <div className="nav">
              {screen !== 'home' ? <button type="button" onClick={back} aria-label="Retour" className="nav-back">‹</button> : <span className="nav-av" aria-hidden="true">PA</span>}
              <div><small>{screen === 'home' ? 'Magasin mélanges · démo' : 'MIXFLOW Lab'}</small><b>{screen === 'home' ? 'Mon stock' : NOTES[screen][0]}</b></div>
            </div>
            <div className="body" key={screen}>
              {screen === 'home' && <>
                <div className="hero-card">
                  <div><small>Lots en stock</small><b>{lots.filter(inStock).length}</b><span>{fmt(lots.filter(inStock).reduce((x, l) => x + l.qteReste, 0))} kg disponibles</span></div>
                  <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" /><circle cx="22" cy="22" r="18" className="hc-v" style={{ strokeDasharray: 113, strokeDashoffset: 113 * (expiredCount / Math.max(1, lots.filter(inStock).length)) }} /></svg>
                </div>
                <button type="button" className={`alert ${onlyExp ? 'on' : ''}`} aria-pressed={onlyExp} onClick={() => setOnlyExp(!onlyExp)}>
                  <span className="a-ic" aria-hidden="true">!</span><span><b>{expiredCount} lot(s) périmé(s) encore en stock</b><br /><small>{onlyExp ? 'Afficher tous les lots' : 'Toucher pour les afficher'}</small></span>
                </button>
                <label className="srch"><span aria-hidden="true">⌕</span><input type="search" placeholder="Lot, mélange, emplacement" value={q} onChange={e => setQ(e.target.value)} aria-label="Rechercher" /></label>
                {list.map(l => { const d = days(DATA.ref, l.peremption); return (
                  <button key={l.num} type="button" className="row" onClick={() => open(l.num)}>
                    <span className={`zone z-${l.emplacement?.[0]}`}>{l.emplacement?.[0]}</span>
                    <span className="r-main"><b>{l.num}</b><span className="muted2">{l.melange} · {l.emplacement} · {l.qteReste} kg</span></span>
                    <span className="pill" style={{ color: color(l), background: `${color(l)}1a` }}>{d < 0 ? 'Périmé' : `J-${d}`}</span>
                  </button>); })}
              </>}
              {screen === 'scan' && <>
                <div className="cam" aria-hidden="true"><i /><i /><i /><i /><span className="cam-beam" /><span className="cam-t">Visez l’étiquette QR</span></div>
                <p className="muted2">Démonstration : choisissez l’étiquette à « scanner »</p>
                <div className="chips">{scanDemo.map(l => <button key={l.num} type="button" className="pbtn alt" onClick={() => open(l.num)}><span aria-hidden="true">▦</span> {l.num}</button>)}</div>
              </>}
              {screen === 'fiche' && lot && <>
                <div className="lot-card" style={{ ['--lc' as string]: color(lot) }}>
                  <div className="lc-top"><b>{lot.num}</b><span className="pill" style={{ color: color(lot), background: `${color(lot)}1f` }}>{!inStock(lot) ? lot.statut : isExpired(lot, DATA.ref) ? 'Périmé' : `J-${days(DATA.ref, lot.peremption)}`}</span></div>
                  <span className="muted2">{mel.get(lot.melange)!.libelle}</span>
                  <div className="qbar"><span style={{ width: `${(lot.qteReste / lot.qteInit) * 100}%` }} /></div>
                  <span className="qlbl"><b>{lot.qteReste} kg</b> restants sur {lot.qteInit} kg</span>
                </div>
                <div className="tiles">
                  <div><small>Emplacement</small><b>{lot.emplacement ?? '—'}</b></div>
                  <div><small>Conservation</small><b>{mel.get(lot.melange)!.conservation}</b></div>
                  <div><small>Péremption</small><b style={{ color: color(lot) }}>{lot.peremption}</b></div>
                  <div><small>Labo</small><b>{lot.labo}</b></div>
                </div>
                {inStock(lot) && <div className="acts">
                  <button type="button" className="pbtn" onClick={() => setScreen('prelever')} disabled={isExpired(lot, DATA.ref)}>Prélever</button>
                  <button type="button" className="pbtn alt" onClick={() => { setDest(compat[0]?.code ?? ''); setScreen('deplacer'); }}>Déplacer</button>
                  <button type="button" className="pbtn danger" onClick={() => setScreen('fin')}>Fin de vie</button>
                </div>}
                {isExpired(lot, DATA.ref) && <p className="muted2">Lot périmé : prélèvement bloqué, fin de vie à déclarer.</p>}
                <b className="h-t">Historique</b>
                <ol className="tl">{mvts.filter(m => m.lot === lot.num).reverse().map(m => <li key={m.id}><b>{m.type}</b> · {m.qte} kg {m.vers ? `→ ${m.vers}` : ''}<span className="muted2">{m.date} · {m.user}</span></li>)}</ol>
              </>}
              {screen === 'prelever' && lot && <>
                <p className="muted2">Lot <b>{lot.num}</b> · reste {lot.qteReste} kg</p>
                <label className="muted2" htmlFor="qty">Quantité prélevée (kg)</label>
                <div className="bigin"><input id="qty" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} placeholder="0,0" /><span>kg</span></div>
                <div className="chips">{['0,1', '0,5', '1'].map(v => <button key={v} type="button" className="chip" onClick={() => setQty(v)}>{v} kg</button>)}</div>
                <button type="button" className="pbtn" onClick={prelever}>Valider</button>
              </>}
              {screen === 'deplacer' && lot && <>
                <p className="muted2">Lot <b>{lot.num}</b> · {mel.get(lot.melange)!.conservation}</p>
                <label className="muted2" htmlFor="dest">Nouvel emplacement (compatibles uniquement)</label>
                <select id="dest" value={dest} onChange={e => setDest(e.target.value)}>{compat.map(e => <option key={e.code} value={e.code}>{e.code} · zone {e.ergo}</option>)}</select>
                <p className="muted2">Zone Or = niveaux 2 et 3, à hauteur de taille : à réserver aux lots les plus utilisés.</p>
                <button type="button" className="pbtn" onClick={deplacer}>Valider</button>
              </>}
              {screen === 'fin' && lot && <>
                <div className="confirm"><span className="a-ic big" aria-hidden="true">!</span><p>Confirmer la fin de vie du lot <b>{lot.num}</b> ({lot.qteReste} kg) ?</p><p className="muted2">Motif enregistré : {isExpired(lot, DATA.ref) ? 'péremption' : 'fin d’usage'}.</p></div>
                <button type="button" className="pbtn danger" onClick={finDeVie}>Confirmer</button>
                <button type="button" className="pbtn alt" onClick={() => setScreen('fiche')}>Annuler</button>
              </>}
            </div>
            {screen === 'home' && <div className="tabbar"><span className="tb on" aria-hidden="true">⌂<small>Stock</small></span><button type="button" className="fab" onClick={() => setScreen('scan')} aria-label="Scanner un lot"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" /></svg></button><span className="tb" aria-hidden="true">◷<small>Historique</small></span></div>}
          </div>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          <section className="panel" aria-live="polite"><span className="label">Écran affiché</span><h3 style={{ margin: '4px 0 6px' }}>{NOTES[screen][0]}</h3><p className="small muted">{NOTES[screen][1]}</p></section>
          <section className="panel">
            <header><h3>Passage à Power Apps : préparé</h3></header>
            <p className="small muted">L’offre cite Power Apps. Le passage est préparé : modèle de données en quatre tables, formules Power Fx des écrans, alerte quotidienne par Power Automate. Je le construirais avec l’équipe et l’informatique, sur la source de données qu’elles utilisent.</p>
            <div className="tbl" style={{ marginTop: 10 }}><table style={{ minWidth: 0 }}>
              <thead><tr><th>Table</th><th>Rôle</th></tr></thead>
              <tbody>
                <tr><td className="mono">Melanges</td><td className="small">référentiel : durée de vie, conservation</td></tr>
                <tr><td className="mono">Emplacements</td><td className="small">zone, niveau, zone ergonomique, conservation</td></tr>
                <tr><td className="mono">Lots</td><td className="small">état actuel de chaque lot</td></tr>
                <tr><td className="mono">Mouvements</td><td className="small">journal de tous les événements : la traçabilité</td></tr>
              </tbody>
            </table></div>
            <pre className="mono" style={{ fontSize: 11.5, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 6, padding: 10, overflowX: 'auto', marginTop: 10, color: 'var(--ink-2)' }}>{`// Prélèvement (Power Fx, interface française)
If(Value(txtQte.Text) > varLot.QteRestanteKg;
  Notify("Quantité supérieure au stock"; NotificationType.Error);
  Patch(Lots; LookUp(Lots; NumLot = varLot.NumLot);
    { QteRestanteKg: varLot.QteRestanteKg - Value(txtQte.Text) });;
  Patch(Mouvements; Defaults(Mouvements);
    { NumLot: varLot.NumLot; TypeMouvement: "Prélèvement";
      QuantiteKg: Value(txtQte.Text); Utilisateur: User().FullName }))`}</pre>
          </section>
          <section className="panel small muted"><b style={{ color: 'var(--ink)' }}>Pourquoi Excel Online pour le prototype ?</b> C’est la source la plus simple à mettre en place. Pour un usage réel à plusieurs, une liste SharePoint ou Dataverse serait plus adaptée (accès simultanés, droits, volume) : un choix à faire avec l’équipe et l’informatique.</section>
        </div>
      </div>
    </>
  );
}
