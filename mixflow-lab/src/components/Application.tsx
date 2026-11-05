import { useMemo, useState } from 'react';
import { DATA, expiresSoon, inStock, isExpired, type Lot, type Mouvement } from '../data/lab';
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
  const [qty, setQty] = useState('');
  const [dest, setDest] = useState('');
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const mel = useMemo(() => new Map(DATA.melanges.map(m => [m.code, m])), []);
  const lot = lots.find(l => l.num === cur);
  const flash = (t: string, ok = true) => { setToast({ t, ok }); window.setTimeout(() => setToast(x => (x?.t === t ? null : x)), 2400); };
  const log = (m: Omit<Mouvement, 'id' | 'date' | 'user'>) => setMvts(xs => [...xs, { ...m, id: `MV-APP-${xs.length + 1}`, date: DATA.ref, user: 'Moi (démo)' }]);
  const update = (num: string, patch: Partial<Lot>) => setLots(xs => xs.map(l => (l.num === num ? { ...l, ...patch } : l)));
  const expiredCount = lots.filter(l => isExpired(l, DATA.ref)).length;
  const list = lots.filter(l => inStock(l) && (!q || `${l.num} ${l.melange} ${l.emplacement}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 30);
  const scanDemo = lots.filter(l => inStock(l)).slice(0, 4);
  const open = (num: string) => { setCur(num); setScreen('fiche'); };
  const color = (l: Lot) => (isExpired(l, DATA.ref) ? '#b42318' : expiresSoon(l, DATA.ref) ? '#c27803' : '#1f7a4d');

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
      <div className="ph">
        <div>
          <div className="kicker">Mission 03 · Digitaliser la gestion des stocks</div>
          <h1>Deux gestes pour tracer un prélèvement : scanner, saisir</h1>
          <p>Prototype cliquable du parcours mobile. Une version utilisable sur téléphone, qui scanne réellement les étiquettes QR des lots, est disponible : <a href="https://claude.ai/artifact/XPXGo2yF9hJHMgcWXJAL8P" target="_blank" rel="noopener noreferrer">ouvrir l’application de démonstration</a>.</p>
        </div>
        <span className="hypo">Démonstration : les modifications ne sont pas enregistrées</span>
      </div>
      <AppShowcase />
      <h2 className="label" style={{ margin: '28px 0 12px' }}>À vous d’essayer : le prototype cliquable</h2>
      <div className="proto">
        <div className="phone" aria-label="Prototype de l’application mobile">
          <div className="screen">
            <div className="bar">{screen !== 'home' && <button type="button" onClick={back} aria-label="Retour">‹</button>}<span>{screen === 'home' ? 'MIXFLOW Lab' : NOTES[screen][0]}</span><small>DÉMO</small></div>
            <div className="body">
              {screen === 'home' && <>
                <div className="alert" role="status">{expiredCount} lot(s) périmé(s) encore en stock</div>
                <button type="button" className="pbtn" onClick={() => setScreen('scan')}>Scanner un lot</button>
                <input type="search" placeholder="Lot, mélange, emplacement" value={q} onChange={e => setQ(e.target.value)} aria-label="Rechercher" />
                {list.map(l => <button key={l.num} type="button" className="row" onClick={() => open(l.num)}><span style={{ width: 8, height: 30, borderRadius: 3, background: color(l) }} /><span><b>{l.num}</b> · {l.melange}<br /><span className="muted2">{l.emplacement} · {l.qteReste} kg · {l.peremption}</span></span></button>)}
              </>}
              {screen === 'scan' && <>
                <div className="card" style={{ height: 150, display: 'grid', placeItems: 'center', background: '#14181f', color: '#fff' }}>Caméra (simulée)</div>
                <p className="muted2">Choisissez l’étiquette à « scanner » :</p>
                {scanDemo.map(l => <button key={l.num} type="button" className="pbtn alt" onClick={() => open(l.num)}>▣ {l.num}</button>)}
              </>}
              {screen === 'fiche' && lot && <>
                <div className="card"><b style={{ fontSize: 17 }}>{lot.num}</b><br /><span className="muted2">{mel.get(lot.melange)!.libelle}</span>
                  <div style={{ marginTop: 8, display: 'grid', gap: 2, fontSize: 13 }}>
                    <span>Emplacement : <b>{lot.emplacement ?? '—'}</b></span><span>Reste : <b>{lot.qteReste} kg</b> / {lot.qteInit} kg</span>
                    <span style={{ color: color(lot) }}>Péremption : <b>{lot.peremption}</b>{isExpired(lot, DATA.ref) ? ' · PÉRIMÉ' : ''}</span>
                    <span>Conservation : {mel.get(lot.melange)!.conservation}</span>
                  </div>
                </div>
                {inStock(lot) && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button type="button" className="pbtn" onClick={() => setScreen('prelever')} disabled={isExpired(lot, DATA.ref)} style={isExpired(lot, DATA.ref) ? { opacity: .4, cursor: 'not-allowed' } : undefined}>Prélever</button>
                  <button type="button" className="pbtn alt" onClick={() => { setDest(compat[0]?.code ?? ''); setScreen('deplacer'); }}>Déplacer</button>
                  <button type="button" className="pbtn danger" style={{ gridColumn: '1 / -1' }} onClick={() => setScreen('fin')}>Fin de vie</button>
                </div>}
                {isExpired(lot, DATA.ref) && <p className="muted2">Lot périmé : prélèvement bloqué, fin de vie à déclarer.</p>}
                <b style={{ fontSize: 13 }}>Historique</b>
                {mvts.filter(m => m.lot === lot.num).reverse().map(m => <div key={m.id} className="card" style={{ padding: '6px 10px', fontSize: 12.5 }}><b>{m.type}</b> · {m.qte} kg {m.vers ? `→ ${m.vers}` : ''}<br /><span className="muted2">{m.date} · {m.user}</span></div>)}
              </>}
              {screen === 'prelever' && lot && <>
                <p>Lot <b>{lot.num}</b> · reste {lot.qteReste} kg</p>
                <label className="muted2" htmlFor="qty">Quantité prélevée (kg)</label>
                <input id="qty" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} placeholder="ex. 0,5" />
                <button type="button" className="pbtn" onClick={prelever}>Valider</button>
              </>}
              {screen === 'deplacer' && lot && <>
                <p>Lot <b>{lot.num}</b> · {mel.get(lot.melange)!.conservation}</p>
                <label className="muted2" htmlFor="dest">Nouvel emplacement (compatibles uniquement)</label>
                <select id="dest" value={dest} onChange={e => setDest(e.target.value)}>{compat.map(e => <option key={e.code} value={e.code}>{e.code} · zone {e.ergo}</option>)}</select>
                <p className="muted2">Zone Or = niveaux 2 et 3, à hauteur de taille : à réserver aux lots les plus utilisés.</p>
                <button type="button" className="pbtn" onClick={deplacer}>Valider</button>
              </>}
              {screen === 'fin' && lot && <>
                <p>Confirmer la fin de vie du lot <b>{lot.num}</b> ({lot.qteReste} kg) ?</p>
                <p className="muted2">Motif enregistré : {isExpired(lot, DATA.ref) ? 'péremption' : 'fin d’usage'}.</p>
                <button type="button" className="pbtn danger" onClick={finDeVie}>Confirmer</button>
                <button type="button" className="pbtn alt" onClick={() => setScreen('fiche')}>Annuler</button>
              </>}
            </div>
            {toast && <div className="toast" role="status" style={{ background: toast.ok ? '#1f7a4d' : '#b42318' }}>{toast.t}</div>}
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
