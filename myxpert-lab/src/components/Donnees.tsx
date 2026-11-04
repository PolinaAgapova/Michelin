import { useMemo, useState } from 'react';
import { COUNTRIES, COUNTRY_LABEL, F, FEATURE_LABEL, PERSONAS, PERSONA_LABEL, STEPS, dayLabel, type Country, type Dataset, type FeatureKey, type Persona, type User } from '../data/model';
import * as K from '../data/kpi';
import { SIGNALS, type Signal } from '../content/content';
import { Columns, Funnel, HBars, LineChart } from './charts';
import { ChapterHead, Seg, Tag, fmt, pct } from './ui';

type Period = '30' | '60' | '90' | 'all';
const PERIOD: Record<Period, [number, number, string]> = { '30': [90, 119, '30 j'], '60': [60, 119, '60 j'], '90': [30, 119, '90 j'], all: [0, 119, '120 j'] };

function Chips<T extends string>({ all, value, onChange, label, legend }: { all: readonly T[]; value: T[]; onChange: (v: T[]) => void; label: (v: T) => string; legend: string }) {
  const toggle = (v: T) => {
    const next = value.includes(v) ? value.filter(x => x !== v) : [...value, v];
    onChange(next);
  };
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="chips">
        <button type="button" className="chip" aria-pressed={value.length === all.length} onClick={() => onChange(value.length === all.length ? [] : [...all])}>Tous</button>
        {all.map(v => <button key={v} type="button" className="chip" aria-pressed={value.includes(v)} onClick={() => toggle(v)}>{label(v)}</button>)}
      </div>
    </fieldset>
  );
}

function Kpi({ label, value, detail, title }: { label: string; value: string; detail?: string; title: string }) {
  return (
    <div className="kpi">
      <span className="label"><abbr title={title}>{label}</abbr></span>
      <span className="v">{value}</span>
      {detail && <span className="d">{detail}</span>}
    </div>
  );
}

/** Types de session : combinaisons de fonctions utilisées le même jour. */
function sessionTypes(users: User[], a: number, b: number) {
  const c = { consult: 0, diag: 0, diagShare: 0, mixed: 0, openOnly: 0 }; let n = 0;
  for (const u of users) for (let d = a; d <= b; d++) {
    const m = u.activity[d]; if (!m) continue; n++;
    const consult = m & (F.selector | F.specs | F.pressure), diag = m & F.diag;
    if (diag && m & F.share) c.diagShare++; else if (diag && consult) c.mixed++; else if (diag) c.diag++; else if (consult) c.consult++; else c.openOnly++;
  }
  return { n, rows: [
    { label: 'Consultation seule', v: c.consult }, { label: 'Diagnostic seul', v: c.diag }, { label: 'Consultation + diagnostic', v: c.mixed },
    { label: 'Diagnostic + partage', v: c.diagShare }, { label: 'Ouverture sans action', v: c.openOnly },
  ] };
}

function Decision({ s, observed, onBacklog }: { s: Signal; observed: string; onBacklog: (id: string) => void }) {
  return (
    <div className="decision" aria-live="polite">
      <div><div className="k">1</div><div className="label">Signal observé</div><p style={{ marginTop: 6 }}><b>{s.title}.</b> {observed}</p></div>
      <div><div className="k">2</div><div className="label">Interprétations possibles</div><ul className="clean small" style={{ marginTop: 6 }}>{s.interpretations.map(x => <li key={x}>{x}</li>)}</ul></div>
      <div><div className="k">3</div><div className="label">Données à obtenir</div><ul className="clean small" style={{ marginTop: 6 }}>{s.dataNeeded.map(x => <li key={x}>{x}</li>)}</ul></div>
      <div><div className="k">4</div><div className="label">Hypothèse testable</div><p className="small" style={{ marginTop: 6 }}>{s.hypothesis}</p></div>
      <div><div className="k">5</div><div className="label">Expérience</div><p className="small" style={{ marginTop: 6 }}>{s.experiment}</p></div>
      <div><div className="k">6</div><div className="label">Succès et garde-fous</div><p className="small" style={{ marginTop: 6 }}><b>{s.success}</b></p><ul className="clean small muted">{s.guardrails.map(x => <li key={x}>{x}</li>)}</ul>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>{s.backlog.map(id => <button key={id} type="button" className="btn small ink" onClick={() => onBacklog(id)}>Voir {id} dans le backlog →</button>)}</div>
      </div>
    </div>
  );
}

export function Donnees({ ds, onBacklog }: { ds: Dataset; onBacklog: (id: string) => void }) {
  const [period, setPeriod] = useState<Period>('90');
  const [countries, setCountries] = useState<Country[]>([...COUNTRIES]);
  const [personas, setPersonas] = useState<Persona[]>([...PERSONAS]);
  const [compare, setCompare] = useState(false);
  const [cmpA, setCmpA] = useState<Persona>('atelier');
  const [cmpB, setCmpB] = useState<Persona>('itinerant');
  const [netSplit, setNetSplit] = useState(false);
  const [signal, setSignal] = useState<Signal['id']>('S1');
  const [from, to] = PERIOD[period];

  const users = useMemo(() => K.filterUsers(ds.users, { countries, personas }), [ds, countries, personas]);
  const ids = useMemo(() => new Set(users.map(u => u.id)), [users]);
  const m = useMemo(() => {
    const series = K.activeSeries(users, from, to);
    const diags = K.diagnosesIn(ds.diagnoses, ids, from, to);
    return {
      series, diags,
      stick: K.stickiness(series.dau, series.mau),
      act: K.activation(users, ds.diagnoses, from, to),
      r1: K.retention(users, 1, from, to), r7: K.retention(users, 7, from, to), r30: K.retention(users, 30, from, to),
      funnel: K.activationFunnel(users, ds.diagnoses, from, to),
      adoption: K.featureAdoption(users, from, to),
      csat: K.csat(ds.ratings, ids, from, to),
      sessions: sessionTypes(users, from, to),
    };
  }, [users, ids, ds, from, to]);

  // Comparaison de segments (sur les pays filtrés)
  const seg = useMemo(() => {
    if (!compare) return null;
    const pick = (p: Persona) => K.filterUsers(ds.users, { countries, personas: [p] });
    const A = pick(cmpA), B = pick(cmpB);
    const sA = K.activeSeries(A, from, to), sB = K.activeSeries(B, from, to);
    const idA = new Set(A.map(u => u.id)), idB = new Set(B.map(u => u.id));
    return { A, B, adA: K.featureAdoption(A, from, to), adB: K.featureAdoption(B, from, to), stA: K.stickiness(sA.dau, sA.mau), stB: K.stickiness(sB.dau, sB.mau),
      cA: K.completionRate(K.diagnosesIn(ds.diagnoses, idA, from, to)), cB: K.completionRate(K.diagnosesIn(ds.diagnoses, idB, from, to)) };
  }, [compare, cmpA, cmpB, ds, countries, from, to]);

  const steps = K.stepAbandon(m.diags);
  const stepsWeak = K.stepAbandon(m.diags.filter(d => d.weakNetwork));
  const stepsOk = K.stepAbandon(m.diags.filter(d => !d.weakNetwork));

  const byCountry = COUNTRIES.filter(c => countries.includes(c)).map(c => {
    const u = users.filter(x => x.country === c); const id = new Set(u.map(x => x.id));
    return { c, mau: K.distinctActive(u, Math.max(0, to - 29), to), compl: K.completionRate(K.diagnosesIn(ds.diagnoses, id, from, to)) };
  });

  // Signal S2 : rétention D30 par origine
  const retSeg = useMemo(() => {
    const groups: [string, User[]][] = [
      ['Nouveaux utilisateurs', users.filter(u => !u.migrated)],
      ['Migrés MyTechXpert', users.filter(u => u.migrated && !u.inspectionUser)],
      ['Migrés utilisant l’inspection', users.filter(u => u.inspectionUser)],
    ];
    return groups.map(([label, g]) => ({ label, ...K.retention(g, 30, 0, to) }));
  }, [users, to]);

  // Signal S3 : DAU Pologne vs autres pays, en indice (moyenne jours 50–74 = 100)
  const plIndex = useMemo(() => {
    const pl = K.filterUsers(ds.users, { countries: ['PL'], personas }), rest = K.filterUsers(ds.users, { countries: COUNTRIES.filter(c => c !== 'PL'), personas });
    const a = K.activeSeries(pl, 50, 119).dau, b = K.activeSeries(rest, 50, 119).dau;
    const smooth = (xs: number[]) => xs.map((_, i) => K.mean(xs.slice(Math.max(0, i - 6), i + 1)));
    const base = (xs: number[]) => K.mean(xs.slice(0, 25)) || 1;
    const sa = smooth(a), sb = smooth(b), ba = base(a), bb = base(b);
    return { pl: sa.map(v => (v / ba) * 100), rest: sb.map(v => (v / bb) * 100), before: K.mean(a.slice(10, 25)), after: K.mean(a.slice(27, 45)) };
  }, [ds, personas]);

  const labels = Array.from({ length: to - from + 1 }, (_, i) => dayLabel(from + i));
  const empty = users.length === 0;
  const sig = SIGNALS.find(s => s.id === signal)!;
  const observed = signal === 'S1'
    ? `Sur la période, ${pct(steps[2].rate, 1)} des diagnostics qui atteignent l’étape photo s’y arrêtent (${pct(stepsWeak[2].rate, 0)} en réseau faible contre ${pct(stepsOk[2].rate, 0)} sinon).`
    : signal === 'S2'
      ? `Rétention D30 : ${pct(retSeg[2].rate, 1)} pour les migrés qui utilisaient l’inspection de flotte, contre ${pct(retSeg[1].rate, 1)} pour les autres migrés (bases : ${fmt(retSeg[2].base)} et ${fmt(retSeg[1].base)}).`
      : `DAU moyen en Pologne : ${fmt(plIndex.before, 0)} avant la version fictive du jour 75, ${fmt(plIndex.after, 0)} après, alors que les autres pays restent stables.`;

  const featureKeys: FeatureKey[] = ['selector', 'specs', 'diag', 'pressure', 'share'];

  return (
    <section className="chapter" aria-labelledby="donnees">
      <div className="wrap">
        <ChapterHead n="02" id="donnees" title="Dans les données">Un dashboard d’analytics produit construit sur un modèle d’événements synthétique. Les filtres recalculent tout ; trois signaux mènent à une décision.</ChapterHead>

        <div className="fict-banner"><Tag p="fict" /><span>Données 100 % fictives, générées par un modèle documenté (6 000 utilisateurs, 120 jours, 5 pays illustratifs). Elles ne représentent aucune performance réelle de MyXpert.</span></div>

        <div className="filters" role="region" aria-label="Filtres du dashboard">
          <fieldset><legend className="label">Période</legend><Seg label="Période" value={period} onChange={setPeriod} options={(['30', '60', '90', 'all'] as Period[]).map(p => ({ v: p, l: PERIOD[p][2] }))} /></fieldset>
          <Chips legend="Pays" all={COUNTRIES} value={countries} onChange={setCountries} label={c => c} />
          <Chips legend="Persona" all={PERSONAS} value={personas} onChange={setPersonas} label={p => PERSONA_LABEL[p].replace('Technicien', 'Tech.').replace('Conseiller commercial', 'Conseiller').replace('Responsable de centre', 'Responsable')} />
        </div>

        {empty ? <div className="empty" style={{ marginTop: 16 }}>Aucun utilisateur ne correspond à ces filtres. Sélectionnez au moins un pays et un persona.</div> : <>
          <div className="kpis">
            <Kpi label="DAU moyen" title="Utilisateurs actifs par jour, moyenne sur la période" value={fmt(K.mean(m.series.dau))} detail={`WAU fin : ${fmt(m.series.wau.at(-1) ?? 0)}`} />
            <Kpi label="MAU" title="Utilisateurs actifs sur les 30 derniers jours de la période" value={fmt(m.series.mau.at(-1) ?? 0)} detail={`au ${labels.at(-1)}`} />
            <Kpi label="Stickiness" title="Moyenne de DAU / MAU sur la période" value={pct(m.stick, 1)} detail="DAU / MAU" />
            <Kpi label="Activation" title="Part des nouveaux utilisateurs ayant terminé un diagnostic dans leurs 7 premiers jours" value={m.act.base ? pct(m.act.rate, 0) : '—'} detail={m.act.base ? `cohorte : ${fmt(m.act.base)}` : 'pas assez de recul'} />
            <Kpi label="Rétention D1 · D7" title="Part d’une cohorte active exactement 1 et 7 jours après l’installation" value={m.r7.base ? `${pct(m.r1.rate, 0)} · ${pct(m.r7.rate, 0)}` : '—'} detail="rétention classique" />
            <Kpi label="Rétention D30" title="Part d’une cohorte active exactement 30 jours après l’installation" value={m.r30.base ? pct(m.r30.rate, 1) : '—'} detail={m.r30.base ? `cohorte : ${fmt(m.r30.base)}` : 'choisissez 60 j ou plus'} />
            <Kpi label="Diagnostics terminés" title="Diagnostics terminés / diagnostics démarrés" value={m.diags.length ? pct(K.completionRate(m.diags), 0) : '—'} detail={`${fmt(m.diags.length)} démarrés`} />
            <Kpi label="CSAT simulé" title="Part des notes 4 et 5 après un diagnostic terminé" value={m.csat.n ? pct(m.csat.satisfied, 0) : '—'} detail={m.csat.n ? `moyenne ${fmt(m.csat.mean, 2)} / 5 · n = ${fmt(m.csat.n)}` : ''} />
          </div>

          <div className="block grid2" style={{ marginTop: 20 }}>
            <div className="panel" style={{ gridColumn: '1 / -1' }}>
              <div className="ph"><h4>Utilisateurs actifs</h4><div className="legend"><span><i style={{ background: 'var(--blue)' }} />DAU</span><span><i style={{ background: 'var(--mark)' }} />WAU</span><span><i style={{ background: 'var(--ink-3)' }} />MAU</span></div></div>
              <LineChart labels={labels} series={[{ name: 'MAU', color: 'var(--ink-3)', values: m.series.mau, dashed: true }, { name: 'WAU', color: '#d4ab12', values: m.series.wau }, { name: 'DAU', color: 'var(--blue)', values: m.series.dau }]} />
              <p className="def">WAU et MAU sont glissants (7 et 30 jours). Les creux hebdomadaires du DAU correspondent aux week-ends, attendus pour un usage professionnel.</p>
            </div>

            <div className="panel">
              <div className="ph"><h4>Funnel d’activation</h4><span className="label">cohorte de la période</span></div>
              <Funnel steps={m.funnel} />
              <p className="def">Chaque étape exige la précédente, dans les 7 jours suivant l’installation. Le pourcentage indique le passage depuis l’étape précédente.</p>
            </div>

            <div className="panel">
              <div className="ph"><h4>Abandons par étape du diagnostic</h4><label className="switch small"><input type="checkbox" checked={netSplit} onChange={e => setNetSplit(e.target.checked)} />Selon le réseau</label></div>
              <HBars format={v => pct(v, 1)} compare={netSplit ? ['Réseau faible', 'Réseau correct'] : undefined}
                rows={STEPS.slice(0, 4).map((s, i) => ({ label: `${i + 1}. ${s}`, a: netSplit ? stepsWeak[i].rate : steps[i].rate, b: netSplit ? stepsOk[i].rate : undefined, active: signal === 'S1' && i === 2, onClick: i === 2 ? () => setSignal('S1') : undefined }))} />
              <p className="def">Taux d’abandon = diagnostics arrêtés à l’étape / diagnostics ayant atteint l’étape. Cliquez sur l’étape photo.</p>
            </div>

            <div className="panel">
              <div className="ph"><h4>Adoption des fonctionnalités</h4>
                <label className="switch small"><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} />Comparer deux personas</label>
              </div>
              {compare && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <select aria-label="Persona A" value={cmpA} onChange={e => setCmpA(e.target.value as Persona)} className="chip">{PERSONAS.map(p => <option key={p} value={p}>{PERSONA_LABEL[p]}</option>)}</select>
                <span className="muted small" style={{ alignSelf: 'center' }}>vs</span>
                <select aria-label="Persona B" value={cmpB} onChange={e => setCmpB(e.target.value as Persona)} className="chip">{PERSONAS.map(p => <option key={p} value={p}>{PERSONA_LABEL[p]}</option>)}</select>
              </div>}
              {seg
                ? <HBars format={v => pct(v, 0)} compare={[PERSONA_LABEL[cmpA], PERSONA_LABEL[cmpB]]} rows={featureKeys.map(k => ({ label: FEATURE_LABEL[k], a: seg.adA[k], b: seg.adB[k] }))} />
                : <HBars format={v => pct(v, 0)} rows={featureKeys.map(k => ({ label: FEATURE_LABEL[k], a: m.adoption[k] }))} />}
              {seg && <p className="small" style={{ marginTop: 10 }}>Stickiness : <b>{pct(seg.stA, 1)}</b> vs <b>{pct(seg.stB, 1)}</b> · Diagnostics terminés : <b>{pct(seg.cA, 0)}</b> vs <b>{pct(seg.cB, 0)}</b></p>}
              <p className="def">Part des utilisateurs actifs sur la période ayant utilisé la fonction au moins une fois.</p>
            </div>

            <div className="panel">
              <div className="ph"><h4>Types de session</h4><span className="label">{fmt(m.sessions.n)} jours actifs</span></div>
              <HBars format={v => pct(v, 0)} rows={m.sessions.rows.map(r => ({ label: r.label, a: m.sessions.n ? r.v / m.sessions.n : 0 }))} />
              <p className="def">Combinaison des fonctions utilisées le même jour par un utilisateur : une lecture simple des parcours.</p>
            </div>

            <div className="panel">
              <div className="ph"><h4>Répartition géographique</h4><span className="label">MAU · complétion</span></div>
              <HBars format={v => fmt(v)} rows={byCountry.map(r => ({ label: COUNTRY_LABEL[r.c], a: r.mau, active: signal === 'S3' && r.c === 'PL', onClick: r.c === 'PL' ? () => setSignal('S3') : undefined }))} />
              <p className="small muted" style={{ marginTop: 10 }}>{byCountry.map(r => `${r.c} ${pct(r.compl, 0)}`).join(' · ')} de diagnostics terminés</p>
              <p className="def">MAU calculé sur les 30 derniers jours de la période. Cliquez sur la Pologne.</p>
            </div>

            <div className="panel">
              <div className="ph"><h4>Rétention D30 selon l’origine</h4><span className="label">toutes cohortes observables</span></div>
              <HBars format={v => pct(v, 1)} rows={retSeg.map((r, i) => ({ label: `${r.label} (n = ${fmt(r.base)})`, a: r.rate, active: signal === 'S2' && i === 2, onClick: i === 2 ? () => setSignal('S2') : undefined }))} />
              <p className="def">Base : utilisateurs installés au moins 30 jours avant la fin de la période. Cliquez sur la dernière ligne.</p>
            </div>

            <div className="panel" style={{ gridColumn: '1 / -1' }}>
              <div className="ph"><h4>Satisfaction après diagnostic</h4><span className="label">note de 1 à 5 · CSAT = part des 4 et 5</span></div>
              <div className="grid2" style={{ alignItems: 'center' }}>
                <div style={{ maxWidth: 460 }}><Columns values={m.csat.dist} labels={['1', '2', '3', '4', '5']} highlight={[3, 4]} /></div>
                <div className="stack">
                  <HBars format={v => pct(v, 0)} rows={[{ label: 'Réseau correct', a: m.csat.ok.satisfied }, { label: 'Réseau faible', a: m.csat.weak.satisfied }]} />
                  <p className="small muted">Bases : {fmt(m.csat.ok.n)} et {fmt(m.csat.weak.n)} réponses. L’écart rejoint le signal S1 : le réseau dégrade à la fois la complétion et la satisfaction.</p>
                </div>
              </div>
              <p className="def">Question simulée après un diagnostic terminé, posée à environ 30 % des utilisateurs.</p>
            </div>
          </div>
        </>}

        <div className="block" id="data-to-decision">
          <h3 className="sub">From Data to Decision <Tag p="reco" /></h3>
          <p className="muted small" style={{ marginBottom: 14 }}>Choisissez un signal, ou cliquez directement sur les barres signalées dans les graphiques ci-dessus.</p>
          <div className="grid3" style={{ marginBottom: 16 }}>
            {SIGNALS.map(s => (
              <button key={s.id} type="button" className="signal-btn" aria-pressed={signal === s.id} onClick={() => setSignal(s.id)}>
                <span className="dot" aria-hidden="true" />
                <span><span className="label">{s.id} · {s.where}</span><br /><b>{s.title}</b></span>
              </button>
            ))}
          </div>
          {signal === 'S3' && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="ph"><h4>DAU en indice, moyenne mobile 7 jours</h4><span className="label">base 100 = jours 50 à 74</span></div>
              <LineChart labels={Array.from({ length: 70 }, (_, i) => dayLabel(50 + i))} format={v => fmt(v)} markers={[{ index: 25, label: 'version fictive' }]}
                series={[{ name: 'Autres pays', color: 'var(--ink-3)', values: plIndex.rest, dashed: true }, { name: 'Pologne', color: 'var(--bad)', values: plIndex.pl }]} height={200} />
            </div>
          )}
          <Decision s={sig} observed={empty ? 'Aucune donnée pour ces filtres.' : observed} onBacklog={onBacklog} />
        </div>
      </div>
    </section>
  );
}

