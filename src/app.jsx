// app.jsx — FoodCheck core UI. React 18 (UMD globals) + Tailwind utilities. No browser storage.
// Part 2 scope: first paint, narrow-it-down inputs, result language, incident screen.
// Part 3 adds: URL routing, All active, Outbreaks, About the data, review queue, not-found.

// Import paths are relative to index.html, not to this file: Babel standalone transforms this
// file and runs it as an inline module on the page, so the page's URL is the base.
import { loadAll, loadArchive, freshnessLines, resolveIncident, SOURCE_LABEL } from './src/data/live.js';
import { agentLabel } from './src/i18n.js';
import { orderIncidents, evaluate, normalizeStateInput, normalizeUpcInput, normalizeLotInput, upcInputState, scopeLabel, stateName, SEVERITY_RANK, isCurrent } from './src/data/match.js';
import { STATES, DISPOSAL_COPY, ALLERGEN_LABEL } from './src/data/parse.js';
import { t as makeT, LANGS, langTag, incidentTitleFor } from './src/i18n.js';

const { useState, useEffect, useMemo, useRef } = React;

// ---------- routing ----------
// Hash routes (#/incident/abc, #/?state=ohio&q=spinach) rather than history-API paths.
// The plan called for path routing with a hash fallback; hash-first is the deviation that makes
// every static host work with zero configuration (GitHub Pages, Netlify, a plain folder) — there is
// no server rewrite to get wrong, and links people text each other survive any hosting move.
// States travel as full lowercase names, never two-letter codes, so a URL can't reintroduce the
// state-code parsing trap.
function parseRoute() {
  const hash = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#/, '') || '/';
  const [path, query] = hash.split('?');
  const params = new URLSearchParams(query || '');
  const stateName = (params.get('state') || '').trim().toLowerCase();
  const inputs = {
    state: normalizeStateInput(stateName) || null,
    query: params.get('q') || '',
    upc: params.get('upc') || '',
    lot: params.get('lot') || '',
  };
  const langParam = (params.get('lang') || '').toLowerCase();
  const lang = LANGS.some((l) => l.code === langParam) ? langParam
    : (() => { const raw = (typeof navigator !== 'undefined' && navigator.language || 'en').toLowerCase(); const nav = raw.startsWith('fil') ? 'tl' : raw.slice(0, 2); return LANGS.some((l) => l.code === nav) ? nav : 'en'; })();
  const seg = path.replace(/\/+$/, '').split('/').filter(Boolean);
  if (seg[0] === 'incident' && seg[1]) return { view: { name: 'incident', id: decodeURIComponent(seg.slice(1).join('/')) }, inputs, lang };
  if (seg[0] === 'active') return { view: { name: 'active' }, inputs, lang };
  if (seg[0] === 'outbreaks') return { view: { name: 'outbreaks' }, inputs, lang };
  if (seg[0] === 'about') return { view: { name: 'about' }, inputs, lang };
  if (seg[0] === 'review') return { view: { name: 'review' }, inputs, lang };
  return { view: { name: 'home' }, inputs, lang };
}

function routeFor(view, inputs, lang) {
  const params = new URLSearchParams();
  if (lang && lang !== 'en') params.set('lang', lang);
  if (inputs.state) params.set('state', stateName(inputs.state).toLowerCase());
  if (inputs.query.trim()) params.set('q', inputs.query.trim());
  if (normalizeUpcInput(inputs.upc)) params.set('upc', normalizeUpcInput(inputs.upc));
  if (normalizeLotInput(inputs.lot)) params.set('lot', normalizeLotInput(inputs.lot));
  const q = params.toString() ? `?${params.toString()}` : '';
  const path = view.name === 'incident' ? `/incident/${encodeURIComponent(view.id)}`
    : view.name === 'home' ? '/' : `/${view.name}`;
  return `#${path}${q}`;
}

// ---------- severity ----------
// Shape/edge/color are fixed; label, meaning, and the one-line explanation come from i18n.
const SEVERITY = {
  class_1: { edge: 'edge-1', glyph: '■', text: 'text-stamp' },
  alert: { edge: 'edge-a', glyph: '◆', text: 'text-stamp' },
  unclassified: { edge: 'edge-u', glyph: '□', text: 'text-slate' },
  class_2: { edge: 'edge-2', glyph: '▲', text: 'text-ochre' },
  class_3: { edge: 'edge-3', glyph: '●', text: 'text-slate' },
};
function sevText(T, severity) {
  const arr = T[`sev_${SEVERITY[severity] ? severity : 'unclassified'}`];
  return { label: arr[0], meaning: arr[1], one: arr[2] };
}

function SeverityBadge({ severity, T, size = 'sm' }) {
  const s = SEVERITY[severity] || SEVERITY.unclassified;
  const x = sevText(T, severity);
  return (
    <span className={`inline-flex items-baseline gap-1.5 font-display uppercase tracking-wide ${s.text} ${size === 'lg' ? 'text-base' : 'text-xs'}`}>
      <span aria-hidden="true">{s.glyph}</span>
      <span className="font-extrabold">{x.label}</span>
      <span className="font-body normal-case tracking-normal font-medium">· {x.meaning}</span>
    </span>
  );
}

// Result language via i18n; falls back to the English strings match.js produced.
function matchText(T, match) {
  const entry = T[`res_${match.matchBasis}`];
  if (!Array.isArray(entry)) return { headline: match.headline, line: match.line };
  const r = (v) => (typeof v === 'function' ? v(match.evidence || {}) : v);
  return { headline: r(entry[0]), line: r(entry[1]) };
}

function scopeLabelT(T, inc) {
  switch (inc.scope) {
    case 'nationwide': return T.scopeNationwide;
    case 'single_state': return T.scopeSingle(stateName(inc.statesUnion[0]));
    case 'multi_state': return T.scopeMulti(inc.statesUnion.length);
    case 'international': return T.scopeIntl;
    default: return T.scopeUnknown;
  }
}

function dispCopy(T, d) { return T[`disp_${d}`] !== `disp_${d}` ? T[`disp_${d}`] : DISPOSAL_COPY[d]; }

function LangSwitch({ lang, setLang, T }) {
  // Language names in their own script, not flags: flags name countries, and Spanish, Korean, and
  // Chinese each belong to readers from many of them. An endonym is self-identifying to someone
  // who reads nothing else on the page.
  const [open, setOpen] = useState(false);
  const cur = LANGS.find((l) => l.code === lang) || LANGS[0];
  return (
    <span className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label={T.langMenu}
        className="min-h-[44px] px-2 flex items-center gap-1 text-sm text-inspection underline underline-offset-2">
        <span aria-hidden="true">🌐</span> <span lang={cur.tag}>{cur.label}</span> <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <span role="menu" className="absolute right-0 top-full z-40 mt-1 min-w-[9rem] rounded-md border border-stockdeep bg-paper shadow-lg py-1 flex flex-col">
          {LANGS.map((l) => (
            <button key={l.code} type="button" role="menuitemradio" aria-checked={lang === l.code} lang={l.tag}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`min-h-[44px] px-3 text-left text-sm ${lang === l.code ? 'bg-ink text-paper' : 'hover:bg-stock'}`}>{l.label}</button>
          ))}
        </span>
      )}
    </span>
  );
}

function DonateLink({ T }) {
  // The URL lives in index.html: <body data-donate-url="https://buymeacoffee.com/yourname">.
  // No URL configured → nothing renders.
  const url = typeof document !== 'undefined' ? document.body?.dataset?.donateUrl : null;
  if (!url || !/^https:\/\//.test(url)) return null;
  return <a className="min-h-[44px] inline-flex items-center rounded-md border border-stockdeep px-3 text-sm font-medium" href={url} target="_blank" rel="noopener">{T.donate}</a>;
}

function FeedbackLink({ T, lang }) {
  // The address lives in index.html: <body data-feedback-email="you@example.com">.
  // No address configured → the link simply doesn't render.
  const email = typeof document !== 'undefined' ? document.body?.dataset?.feedbackEmail : null;
  if (!email) return null;
  const href = `mailto:${email}?subject=${encodeURIComponent(T.feedbackSubject)}&body=${encodeURIComponent(`(${typeof window !== 'undefined' ? window.location.href : ''})\n\n`)}`;
  return <a className="text-inspection underline underline-offset-2 min-h-[44px] inline-flex items-center" href={href}>✉ {T.feedback}</a>;
}

function BackToTop({ T }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  const go = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };
  return (
    <button type="button" onClick={go}
      className="fixed bottom-4 right-4 z-40 min-h-[48px] rounded-full bg-ink text-paper px-4 text-sm font-medium shadow-lg focus:outline-2 focus:outline-inspection">
      {T.backToTop}
    </button>
  );
}

// ---------- header: stamp + blind-spot bar ----------
function fmtTime(iso) { return iso ? new Date(iso).toLocaleTimeString(CURRENT_TAG, { hour: 'numeric', minute: '2-digit' }) : '—'; }
function fmtDay(iso) { return iso ? new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).toLocaleDateString(CURRENT_TAG, { month: 'short', day: 'numeric' }) : null; }

function Stamp({ state, onAbout, T }) {
  const [open, setOpen] = useState(false);
  const lines = state ? freshnessLines(state, T, new Date(), CURRENT_TAG) : [];
  const failing = lines.filter((l) => !l.ok);
  const checked = state?.live?.fetchedAt || state?.sources?.snapshot?.fetchedAt || null;
  return (
    <div className="text-sm leading-snug">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-h-[44px] flex items-center gap-2 text-left">
          <span className="font-mono text-xs uppercase tracking-wider text-slate">{T.checked} {checked ? fmtTime(checked) : '…'}</span>
          <span className={`text-xs ${failing.length ? 'text-stamp font-medium' : 'text-slate'}`}>
            {!state ? '' : failing.length ? `· ${T.sourcesFailing(failing.length)}` : `· ${T.allSourcesOk}`} {open ? '▴' : '▾'}
          </span>
        </button>
        <button type="button" onClick={onAbout} className="text-inspection underline underline-offset-2 text-sm min-h-[44px] px-1">{T.aboutData}</button>
      </div>
      {open && (
        <dl className="mt-1 space-y-0.5">
          {lines.map((l) => (
            <div key={l.id} className="flex flex-wrap gap-x-2">
              <dt className="font-medium">{l.label}</dt>
              <dd className={l.ok ? 'text-slate' : 'text-stamp font-medium'}>{l.detail}</dd>
            </div>
          ))}
          {!lines.length && <div className="text-slate">{T.loading}</div>}
        </dl>
      )}
    </div>
  );
}

/** The blind-spot bar: last 42 days; the last 21 are hatched because recalls started then may not be classified yet. */
function BlindSpotBar({ state, T }) {
  const through = state?.snapshot?.dataThroughDate || null;
  const failed = state ? Object.values(state.sources || {}).some((s) => s?.lastError || s?.liveError) : false;
  const today = new Date();
  const daysAgo = (iso) => Math.max(0, Math.min(42, Math.round((today - new Date(iso + 'T12:00:00Z')) / 86400000)));
  const tick = through ? (1 - daysAgo(through) / 42) * 100 : null;
  return (
    <figure className="mt-3" aria-label="How current this data is">
      <div className="relative h-3 w-full rounded-sm overflow-hidden border border-stockdeep">
        <div className="absolute inset-y-0 left-0 bg-stockdeep" style={{ width: '50%' }} />
        <div className={`absolute inset-y-0 right-0 ${failed ? 'hatch-fail' : 'hatch'}`} style={{ width: '50%' }} />
        {tick !== null && <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${tick}%` }} aria-hidden="true" />}
      </div>
      <figcaption className="mt-1 flex justify-between text-xs text-slate">
        <span>{through ? T.blindSpotLeft(fmtDay(through)) : ''}</span>
        <span className="text-right">{T.blindSpotRight}</span>
      </figcaption>
    </figure>
  );
}

// ---------- narrow it down ----------
// Tile-grid US map: each state a labeled 44px square in roughly geographic position. A traced
// outline map would put fifty sub-44px targets on a phone; tiles keep the touch floor and stay
// screen-reader friendly (each is a real button named with the full state name).
const TILE_MAP = [
  ['AK', 0, 0], ['ME', 10, 0],
  ['WA', 0, 1], ['MT', 1, 1], ['ND', 2, 1], ['MN', 3, 1], ['WI', 4, 1], ['MI', 6, 1], ['NY', 8, 1], ['VT', 9, 1], ['NH', 10, 1],
  ['OR', 0, 2], ['ID', 1, 2], ['SD', 2, 2], ['IA', 3, 2], ['IL', 4, 2], ['IN', 5, 2], ['OH', 6, 2], ['PA', 7, 2], ['NJ', 8, 2], ['CT', 9, 2], ['MA', 10, 2],
  ['CA', 0, 3], ['NV', 1, 3], ['WY', 2, 3], ['NE', 3, 3], ['MO', 4, 3], ['KY', 5, 3], ['WV', 6, 3], ['VA', 7, 3], ['MD', 8, 3], ['DE', 9, 3], ['RI', 10, 3],
  ['AZ', 1, 4], ['UT', 2, 4], ['CO', 3, 4], ['KS', 4, 4], ['AR', 5, 4], ['TN', 6, 4], ['NC', 7, 4], ['SC', 8, 4], ['DC', 9, 4],
  ['NM', 2, 5], ['OK', 3, 5], ['LA', 4, 5], ['MS', 5, 5], ['AL', 6, 5], ['GA', 7, 5],
  ['HI', 0, 6], ['TX', 3, 6], ['FL', 8, 6], ['PR', 10, 6],
];

function StateTileMap({ selected, onPick, T }) {
  const cols = 11, rows = 7;
  return (
    <div className="overflow-x-auto" role="group" aria-label={T.mapLabel}>
      <div className="relative" style={{ width: cols * 48, height: rows * 48 }}>
        {TILE_MAP.map(([code, c, r]) => {
          const sel = selected === code;
          return (
            <button key={code} type="button" onClick={() => onPick(sel ? null : code)} aria-pressed={sel}
              aria-label={stateName(code)} title={stateName(code)}
              className={`absolute w-11 h-11 rounded font-mono text-xs font-bold flex items-center justify-center border focus:outline-2 focus:outline-inspection ${sel ? 'bg-ink text-paper border-ink' : 'bg-paper border-stockdeep text-ink hover:border-ink'}`}
              style={{ left: c * 48, top: r * 48 }} translate="no">{code}</button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-slate">{T.mapHint}</p>
    </div>
  );
}

function NarrowStrip({ inputs, setInputs, id, T, collapsible = false, forceOpen = false }) {
  const typedAny = !!(inputs.state || inputs.query.trim() || inputs.upc.trim() || (inputs.lot || '').trim());
  const [open, setOpen] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [scanning, setScanning] = useState(false);
  const isOpen = !collapsible || open || forceOpen || typedAny;
  const digits = normalizeUpcInput(inputs.upc);
  const upcState = upcInputState(digits);
  const upcHint = upcState === 'too_short' ? T.keepTyping
    : upcState === 'prefix' ? T.partialUpc
    : upcState === 'too_long' ? T.tooLongUpc
    : '';
  const field = 'w-full min-h-[44px] rounded-md border border-stockdeep bg-paper px-3 py-2 text-base placeholder:text-slate';
  if (!isOpen) {
    return (
      <section id={id} className="rounded-lg bg-stock">
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false} className="min-h-[48px] w-full flex items-center justify-between px-4 text-left">
          <span><span className="font-display font-extrabold">{T.narrowDown}</span><span className="text-sm text-slate"> — {T.narrowOneLine}</span></span>
          <span aria-hidden="true">▾</span>
        </button>
      </section>
    );
  }
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="rounded-lg bg-stock p-4">
      <span className="flex items-baseline justify-between">
        <h2 id={`${id}-h`} className="font-display text-lg font-extrabold">{T.narrowDown}</h2>
        {collapsible && !typedAny && <button type="button" onClick={() => setOpen(false)} aria-expanded={true} className="min-h-[44px] px-2 text-slate">▴</button>}
      </span>
      <p className="mt-1 text-sm text-slate">{T.narrowSub}</p>
      {scanning && <Scanner T={T} onClose={() => setScanning(false)} onRead={(d) => { setInputs({ ...inputs, upc: d }); setScanning(false); }} />}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium mb-1">{T.whereAreYou}</span>
          <select className={field} value={inputs.state || ''} onChange={(e) => setInputs({ ...inputs, state: e.target.value || null })}>
            <option value="">{T.skipState}</option>
            {Object.entries(STATES).sort((a, b) => a[0].localeCompare(b[0])).map(([name, code]) => (
              <option key={code} value={code}>{name.replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate">{T.stateHint}</span>
          <button type="button" onClick={() => setShowMap(!showMap)} aria-expanded={showMap} className="mt-1 min-h-[44px] text-sm text-inspection underline underline-offset-2">{T.mapToggle}</button>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">{T.whatsInKitchen}</span>
          <input className={field} type="search" placeholder={T.kitchenPlaceholder} value={inputs.query} onChange={(e) => setInputs({ ...inputs, query: e.target.value })} />
          <span className="mt-1 block text-xs text-slate">{T.kitchenHint}</span>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">{T.barcodeLabel}</span>
          <span className="flex gap-2">
            <input className={`${field} font-mono`} translate="no" inputMode="numeric" pattern="[0-9 -]*" placeholder={T.barcodePlaceholder} value={inputs.upc} onChange={(e) => setInputs({ ...inputs, upc: e.target.value })} aria-describedby={`${id}-upc-hint`} />
            <button type="button" onClick={() => setScanning(true)} className="min-h-[44px] shrink-0 px-3 rounded-md border border-stockdeep font-medium">📷 {T.scan}</button>
          </span>
          <span id={`${id}-upc-hint`} className="mt-1 block text-xs text-slate min-h-[1rem]">{upcHint || T.barcodeHint}</span>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">{T.lotLabel}</span>
          <input className={`${field} font-mono`} translate="no" placeholder={T.lotPlaceholder} value={inputs.lot || ''} onChange={(e) => setInputs({ ...inputs, lot: e.target.value })} />
          <span className="mt-1 block text-xs text-slate">{T.lotHint}</span>
        </label>
      </div>
      {showMap && <div className="mt-3"><StateTileMap selected={inputs.state} onPick={(code) => setInputs({ ...inputs, state: code })} T={T} /></div>}
    </section>
  );
}

// ---------- cards ----------
function IncidentCard({ row, onOpen, T, lang, archived = false }) {
  const { incident: inc, match } = row;
  const s = SEVERITY[inc.severity] || SEVERITY.unclassified;
  const mt = matchText(T, match);
  const closed = archived && inc.status !== 'active';
  const olderOpen = archived && inc.status === 'active';
  // 'nationwide' with a state selected would just repeat the scope line, so it gets no headline.
  const hasMatch = match.matchBasis !== 'none' && match.matchBasis !== 'nationwide';
  const sample = row.sample;
  return (
    <li className={`fade-in rounded-lg bg-stock ${s.edge}`}>
      <button type="button" onClick={() => onOpen(inc.id)} className="block w-full text-left p-4 pl-5 min-h-[44px] rounded-lg hover:bg-stockdeep/60">
        <span className="flex justify-between items-baseline gap-2">
          <SeverityBadge severity={inc.severity} T={T} />
          <span className="flex gap-2">
            {closed && <span className="text-xs font-mono uppercase tracking-wider text-slate border border-slate rounded px-1">{T.closedTag}</span>}
            {olderOpen && <span className="text-xs font-mono uppercase tracking-wider text-slate border border-slate rounded px-1">{T.openTag(fmtDay(inc.lastNoticeDate || inc.firstInitiated))}</span>}
            {sample && <span className="text-xs font-mono uppercase tracking-wider text-ochre border border-ochre rounded px-1">{T.sampleTag}</span>}
          </span>
        </span>
        {hasMatch && (
          <p className={`mt-1 font-display text-lg font-extrabold leading-tight ${match.matchBasis === 'upc' ? 'text-stamp' : match.matchBasis === 'other_state' ? 'text-slate' : ''}`}>{mt.headline}</p>
        )}
        <p lang={!inc.titleParts && lang !== 'en' ? 'en' : undefined} className={`${hasMatch ? 'mt-0.5 text-base' : 'mt-1 font-display text-lg font-extrabold leading-tight'}`}>{incidentTitleFor(lang, inc.titleParts, inc.title)}</p>
        {hasMatch && mt.line && <p className="mt-1 text-sm text-slate">{mt.line}</p>}
        <p className="mt-2 text-sm text-slate flex flex-wrap gap-x-3 gap-y-0.5">
          <span>{scopeLabelT(T, inc)}{inc.distributionIncomplete && inc.scope !== 'nationwide' ? ` · ${T.listIncomplete}` : ''}</span>
          <span>{T.notices(inc.recallIds.length)} · {inc.agencies.map((a) => a === 'FSIS' ? 'USDA' : a).join(' + ')}</span>
          {inc.illnessSummary?.cases ? <span className="text-ink font-medium">{T.illnesses(inc.illnessSummary.cases)}</span> : null}
          {inc.lastUpdated && <span>{fmtDay(inc.lastUpdated)}</span>}
        </p>
        <span className="mt-2 inline-block text-inspection font-medium">{T.whatToDo}</span>
      </button>
    </li>
  );
}

// ---------- home ----------
function Home({ state, inputs, setInputs, onOpen, onAbout, onOutbreaks, onActive, announce, onArchive, T, lang, setLang }) {
  const rows = useMemo(() => {
    if (!state) return [];
    const days = state.currentDays || 180;
    const r = orderIncidents(state.incidents.filter((i) => isCurrent(i, new Date(), days)), state.recalls, inputs);
    for (const row of r) row.sample = row.incident.recallIds.every((id) => state.recalls.get(id)?.fromFixture);
    return r;
  }, [state, inputs]);
  const [showMinor, setShowMinor] = useState(false);
  const typed = inputs.state || inputs.query.trim() || normalizeUpcInput(inputs.upc).length >= 6 || normalizeLotInput(inputs.lot).length >= 4;
  const matched = rows.filter((r) => r.match.matchBasis !== 'none' && r.match.matchBasis !== 'other_state');
  const loading = state && state.phase !== 'done';

  // Closed recalls become relevant only when someone names a product or barcode — then the archive
  // loads (once) and product/barcode matches from it show in their own section.
  const wantsArchive = inputs.query.trim().length >= 3 || normalizeUpcInput(inputs.upc).length >= 6 || normalizeLotInput(inputs.lot).length >= 4;
  useEffect(() => {
    if (!state || !wantsArchive || state.archive?.loadedAt || state.archive?.loading || !state.archive?.available) return;
    loadArchive(state).then(() => onArchive());
  }, [wantsArchive, state?.phase]);
  const PRODUCT_BASES = new Set(['upc', 'upc_unverified', 'lot', 'state_and_product', 'nationwide_and_product', 'product_guess', 'upc_prefix']);

  // Dynamic relevance: matches stay open; everything else collapses into one counted fold.
  // Collapsed, never removed — the fold's count is the trace that keeps a parser miss findable.
  // Cards with unknown/unreadable distribution never fold on a state-only search: "we couldn't
  // read where this was sold" is exactly the card hiding would wrongly drop.
  const hasProductInput = inputs.query.trim().length > 0 || normalizeUpcInput(inputs.upc).length >= 6 || normalizeLotInput(inputs.lot).length >= 4;
  const isRelevant = (r) => {
    if (hasProductInput) return PRODUCT_BASES.has(r.match.matchBasis);
    if (inputs.state) return r.match.matchBasis !== 'other_state';
    return true;
  };
  const anyRelevant = rows.some(isRelevant);
  const foldActive = typed && anyRelevant && rows.some((r) => !isRelevant(r));
  const [foldOpen, setFoldOpen] = useState(false);
  useEffect(() => { setFoldOpen(false); }, [inputs.state, inputs.query, inputs.upc, inputs.lot]);
  const relevantRows = foldActive ? rows.filter(isRelevant) : rows;
  const foldedRows = foldActive ? rows.filter((r) => !isRelevant(r)) : [];

  // With a fold active, matched Class III cards stay in the main list (severity folding would
  // hide a direct hit); with no inputs, Class III folds as before.
  const major = relevantRows.filter((r) => r.incident.severity !== 'class_3' || foldActive);
  const minor = foldActive ? [] : relevantRows.filter((r) => r.incident.severity === 'class_3');

  const closedRows = useMemo(() => {
    if (!state?.archive?.loadedAt || !wantsArchive) return [];
    return orderIncidents(state.archive.incidents, state.recalls, inputs).filter((r) => PRODUCT_BASES.has(r.match.matchBasis)).slice(0, 12);
  }, [state?.archive?.loadedAt, inputs, wantsArchive]);

  useEffect(() => {
    if (!state || state.phase !== 'done') return;
    if (foldActive) announce(`${relevantRows.length} ${relevantRows.length === 1 ? 'recall matches' : 'recalls match'}; ${foldedRows.length} collapsed below.`);
    else if (typed) announce('Nothing matched; showing everything active.');
  }, [inputs.state, inputs.query, inputs.upc, inputs.lot]);

  useEffect(() => {
    if (!state) return;
    if (state.phase === 'snapshot_done') announce(`${rows.length} active recalls loaded from the saved data.`);
    if (state.phase === 'live_done' && state.live.added) announce(`${state.live.added} more from FDA.`);
    if (state.phase === 'done' && state.fsisLive.added) announce(`${state.fsisLive.added} more from USDA.`);
  }, [state?.phase]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24">
      <header className="pt-4 pb-3 border-b border-stockdeep">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="font-display text-2xl font-black tracking-tight">FoodCheck</h1>
          <span className="flex gap-3 items-center flex-wrap">
            <LangSwitch lang={lang} setLang={setLang} T={T} />
            <button type="button" onClick={onOutbreaks} className="min-h-[44px] rounded-md bg-inspection text-paper px-3 text-sm font-medium">{T.checkOutbreaks(state?.outbreaks?.length ? state.outbreaks.filter((o) => o.status === 'active').length : 0)}</button>
          </span>
        </div>
        <Stamp state={state} onAbout={onAbout} T={T} />
        <BlindSpotBar state={state} T={T} />
      </header>

      <div className="mt-3"><NarrowStrip id="narrow" inputs={inputs} setInputs={setInputs} T={T} collapsible /></div>

      <section aria-labelledby="active-h" className="mt-4">
        <h2 id="active-h" className="font-display text-lg font-extrabold flex items-baseline gap-2">
          {typed ? T.sortedForYou : T.activeNow}
          {loading && <span className="text-xs font-body font-normal text-slate">{T.stillChecking}</span>}
        </h2>
        {typed && (
          <p className="mt-1 text-sm text-slate">
            {matched.length ? T.matchedCount(matched.length) : T.nothingMatched}
          </p>
        )}
        {!typed && state?.archive?.available?.olderOpen > 0 && (
          <p className="mt-1 text-sm text-slate">{T.olderOpenNote(state.archive.available.olderOpen, Math.round((state.currentDays || 180) / 30))}</p>
        )}
        {!state && <p className="mt-3 text-slate">Loading…</p>}
        {state && !rows.length && state.phase === 'done' && (
          <div className="mt-3 rounded-lg bg-stock p-4">
            <p className="font-medium">{T.noActive}</p>
            <p className="mt-1 text-sm text-slate">{T.noActiveSub}</p>
          </div>
        )}
        <ul className="mt-3 space-y-3">
          {major.map((r) => <IncidentCard key={r.incident.id} row={r} onOpen={onOpen} T={T} lang={lang} />)}
        </ul>
        {foldActive && (
          <div className="mt-3">
            <button type="button" onClick={() => setFoldOpen(!foldOpen)} aria-expanded={foldOpen} className="min-h-[44px] w-full text-left rounded-lg border border-stockdeep px-4 py-2 text-sm flex justify-between items-center">
              <span><span className="font-medium">{T.notMatchingFold(foldedRows.length)}</span><span className="text-slate">{T.notMatchingWhy}</span></span>
              <span aria-hidden="true">{foldOpen ? '▴' : '▾'}</span>
            </button>
            {foldOpen && <ul className="mt-3 space-y-3">{foldedRows.map((r) => <IncidentCard key={r.incident.id} row={r} onOpen={onOpen} T={T} lang={lang} />)}</ul>}
          </div>
        )}
        <p className="mt-3 text-sm"><button type="button" onClick={onActive} className="text-inspection underline underline-offset-2 min-h-[44px]">{T.seeEverything}</button></p>
        {minor.length > 0 && (
          <div className="mt-3">
            <button type="button" onClick={() => setShowMinor(!showMinor)} aria-expanded={showMinor} className="min-h-[44px] w-full text-left rounded-lg bg-stock px-4 py-2 font-medium flex justify-between items-center">
              <span>{T.minorFold(minor.length)}</span><span aria-hidden="true">{showMinor ? '▴' : '▾'}</span>
            </button>
            {showMinor && <ul className="mt-3 space-y-3">{minor.map((r) => <IncidentCard key={r.incident.id} row={r} onOpen={onOpen} T={T} lang={lang} />)}</ul>}
          </div>
        )}
      </section>

      {wantsArchive && state?.archive?.available && (
        <section className="mt-6" aria-labelledby="closed-h">
          <h2 id="closed-h" className="font-display text-lg font-extrabold">{T.closedMatchHead}</h2>
          {state.archive.loading && <p className="mt-1 text-sm text-slate">{T.checkingOlder}</p>}
          {state.archive.lastError && <p className="mt-1 text-sm text-stamp">Couldn’t load older recalls: {state.archive.lastError.message}. Reload to try again.</p>}
          {state.archive.loadedAt && !closedRows.length && <p className="mt-1 text-sm text-slate">{T.noneOlder}</p>}
          {closedRows.length > 0 && <p className="mt-1 text-sm text-slate">{T.closedMatchSub(Math.round((state.currentDays || 180) / 30))}</p>}
          <ul className="mt-3 space-y-3">{closedRows.map((r) => <IncidentCard key={r.incident.id} row={r} onOpen={onOpen} T={T} lang={lang} archived />)}</ul>
        </section>
      )}

      <p className="mt-6 text-sm text-slate">{T.bottomNote}</p>
      <p className="mt-2 text-xs text-slate">{T.disclaimer}</p>
      <p className="mt-3 flex gap-3 items-center flex-wrap"><FeedbackLink T={T} lang={lang} /><DonateLink T={T} /></p>
      <BackToTop T={T} />
    </main>
  );
}

// ---------- incident screen ----------
const AGENCY_NAME = { FDA: 'FDA', FSIS: 'USDA' };

/**
 * Camera barcode scanner. Frames are read on-device via getUserMedia; nothing is uploaded.
 * Native BarcodeDetector where available, vendored ZXing everywhere else (Windows/Mac desktop,
 * iPhone Safari). Lot codes are printed text, not barcodes; OCR is deliberately out (scanLotNote).
 * Requires a secure context (https or localhost) for camera access.
 */
let zxingPromise = null;
function loadZxing() {
  // Vendored, not CDN: ./vendor/zxing-browser.min.js ships with the site, loads only when someone
  // taps Scan in a browser without the native BarcodeDetector, and defines window.ZXingBrowser.
  if (window.ZXingBrowser) return Promise.resolve();
  if (!zxingPromise) {
    zxingPromise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = './vendor/zxing-browser.min.js';
      el.onload = () => resolve();
      el.onerror = () => { zxingPromise = null; reject(new Error('scanner script failed to load')); };
      document.head.appendChild(el);
    });
  }
  return zxingPromise;
}

function Scanner({ T, onClose, onRead }) {
  const videoRef = useRef(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let stream = null;
    let timer = null;
    let zxControls = null;
    let stopped = false;
    const ok = (raw) => { if (!stopped && /^\d{8,14}$/.test(raw)) { stopped = true; onRead(raw); } };

    (async () => {
      // Path 1: the browser's built-in detector (Chrome/Edge on Android and ChromeOS, some desktops).
      if ('BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['upc_a', 'upc_e', 'ean_13', 'ean_8'] });
          // Probe: some desktops expose the class but the detection service is unavailable.
          await detector.detect(document.createElement('canvas')).catch((e) => { if (e?.name === 'NotSupportedError') throw e; });
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          if (stopped) return;
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setLoading(false);
          const tick = async () => {
            if (stopped) return;
            try { const codes = await detector.detect(videoRef.current); const hit = codes.find((c) => /^\d{8,14}$/.test(c.rawValue)); if (hit) { ok(hit.rawValue); return; } } catch { /* frame errors are normal */ }
            timer = setTimeout(tick, 250);
          };
          tick();
          return;
        } catch (e) {
          if (e?.name === 'NotAllowedError') { setErr('denied'); setLoading(false); return; }
          if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; }
          // fall through to ZXing
        }
      }
      // Path 2: vendored ZXing decoder — works in Windows/Mac desktop browsers and iPhone Safari.
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera API');
        await loadZxing();
        if (stopped) return;
        const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
        zxControls = await window.ZXingBrowser.BrowserMultiFormatReader.prototype.decodeFromConstraints.call(
          reader, { video: { facingMode: 'environment' }, audio: false }, videoRef.current,
          (result) => { if (result) ok(result.getText()); });
        setLoading(false);
      } catch (e) {
        setErr(e?.name === 'NotAllowedError' ? 'denied' : 'unsupported');
        setLoading(false);
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      if (zxControls) try { zxControls.stop(); } catch { /* already stopped */ }
      if (stream) for (const t of stream.getTracks()) t.stop();
      const v = videoRef.current;
      const vs = v?.srcObject; if (vs) { for (const t of vs.getTracks()) t.stop(); v.srcObject = null; }
    };
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label={T.scanTitle} className="fixed inset-0 z-50 bg-ink/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-paper p-4">
        <p className="font-display font-extrabold text-lg">{T.scanTitle}</p>
        {!err && <>
          <video ref={videoRef} playsInline muted className="mt-3 w-full rounded-md bg-ink aspect-video object-cover" />
          <p className="mt-2 text-sm text-slate">{loading ? T.scanLoading : T.scanHint}</p>
        </>}
        {err === 'unsupported' && <p className="mt-3 text-sm">{T.scanUnsupported}</p>}
        {err === 'denied' && <p className="mt-3 text-sm">{T.scanDenied}</p>}
        <p className="mt-2 text-xs text-slate">{T.scanLotNote}</p>
        <button type="button" onClick={onClose} className="mt-3 min-h-[44px] w-full rounded-md bg-ink text-paper font-medium">{T.scanClose}</button>
      </div>
    </div>
  );
}

function ShareButton({ title, T }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: `Recall: ${title}`, url }); return; }
      await navigator.clipboard.writeText(url);
      setDone(true); setTimeout(() => setDone(false), 2000);
    } catch { /* user cancelled */ }
  };
  return <button type="button" onClick={share} className="min-h-[44px] px-3 rounded-md border border-stockdeep text-sm font-medium">{done ? T.linkCopied : T.share}</button>;
}

function CodeList({ label, items, mono = true }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2">
      <span className="text-sm font-medium">{label}</span>
      <ul className="mt-1 flex flex-wrap gap-2">
        {items.map((x) => <li key={x} translate="no" className={`${mono ? 'font-mono' : ''} rounded bg-paper border border-stockdeep px-2 py-1 text-sm`}>{x}</li>)}
      </ul>
    </div>
  );
}

function AtRisk({ agent, allergens, guidance, T, lang }) {
  if (!agent || !guidance) return null;
  let entry = guidance[agent];
  let allergen = null;
  if (!entry && agent.startsWith('undeclared_')) {
    entry = guidance['undeclared_*'];
    const list = (allergens?.length ? allergens : [agent.slice('undeclared_'.length)]).map((a) => ALLERGEN_LABEL[a] || a);
    allergen = list.length > 1 ? `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]}` : list[0];
  }
  if (!entry) return null;
  // New shape: { citation, langs: { en: {who, lines, checks}, es: ..., ko: ..., zh: ... } }.
  // Old shape (a bare {who, lines, citation}) still renders, as English.
  const langs = entry.langs || { en: { who: entry.who, lines: entry.lines, checks: entry.citation?.checks || [] } };
  const block = langs[lang] || langs.en;
  const usedFallback = !langs[lang] && lang !== 'en';
  const c = entry.citation || {};
  const sub = (t) => t.replace('{allergen}', allergen || '');

  const checks = (block.checks || []).filter((x) => x?.at);
  const people = new Set(checks.map((x) => (x.by || '').trim().toLowerCase()).filter(Boolean));
  const last = checks.map((x) => x.at).sort().slice(-1)[0];
  const checkedLine = !checks.length ? T.unverifiedSource
    : people.size >= 2 ? T.checkedMany(people.size, fmtDay(last))
    : T.checkedOnce(fmtDay(last));
  const dead = c.url && c.lastReachableAt === null && c.lastCheckStatus && c.lastCheckStatus !== 403 && c.lastCheckStatus !== 429;

  return (
    <div className="mt-4 rounded-lg border-2 border-ink p-3" lang={usedFallback ? 'en' : undefined}>
      <p className="font-display font-extrabold">{sub(block.who)}</p>
      <ul className="mt-1 space-y-1 text-base">
        {block.lines.map((l, i) => <li key={i}>{sub(l)}</li>)}
      </ul>
      {lang !== 'en' && !usedFallback && !checks.length && T.translationUnverified && <p className="mt-2 text-xs text-ochre font-medium">{T.translationUnverified}</p>}
      <p className="mt-2 text-xs text-slate">
        {c.url ? <a className="text-inspection underline underline-offset-2" href={c.url} target="_blank" rel="noopener" lang="en">{c.title}</a> : <span lang="en">{c.title}</span>}
        {' · '}<span className={checks.length ? '' : 'text-ochre font-medium'}>{checkedLine}</span>
        {dead ? <span className="text-stamp font-medium"> · {T.linkMoved}</span> : null}
      </p>
    </div>
  );
}

function Incident({ state, id, onBack, onOpen, onArchive, onOutbreaks, T, lang }) {
  const inc = resolveIncident(state, id);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [id]);
  // Unknown id: it may be a closed incident. Load the archive once before saying not found.
  useEffect(() => {
    if (inc || !state.archive?.available || state.archive?.loadedAt || state.archive?.loading) return;
    loadArchive(state).then(() => onArchive());
  }, [id, inc]);
  if (!inc && state.archive?.available && !state.archive?.loadedAt && !state.archive?.lastError) {
    return <main className="mx-auto w-full max-w-2xl px-4 py-6"><p className="text-slate">Checking closed recalls…</p></main>;
  }
  if (!inc) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <button type="button" onClick={onBack} className="text-inspection underline underline-offset-2 min-h-[44px]">← Back</button>
        <h1 className="mt-4 font-display text-2xl font-black">{T.notFoundHead}</h1>
        <p className="mt-2">{T.notFoundBody}</p>
        <button type="button" onClick={onBack} className="mt-4 min-h-[44px] rounded-md bg-inspection text-paper px-4 font-medium">{T.seeAllActive}</button>
      </main>
    );
  }
  const children = inc.recallIds.map((rid) => state.recalls.get(rid)).filter(Boolean);
  const lead = children.slice().sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0))[0] || children[0];
  const closed = inc.status !== 'active';
  const s = SEVERITY[inc.severity] || SEVERITY.unclassified;
  const instr = children.find((c) => c.consumerInstruction?.extracted)?.consumerInstruction || lead.consumerInstruction;
  const disposal = lead.disposalAction;
  const upcs = [...new Set(children.flatMap((c) => c.product.upcs.map((u) => u.digits + (u.checkDigitValid ? '' : ' (as printed in notice; may contain a typo)'))))];
  const lots = [...new Set(children.flatMap((c) => c.product.lotCodes))];
  const dates = [...new Set(children.flatMap((c) => c.product.bestByDates.map((d) => d.raw)))];
  const related = (inc.relatedIncidentIds || []).map((rid) => resolveIncident(state, rid)).filter(Boolean);
  const outbreaks = (inc.outbreakIds || []).map((oid) => state.outbreaks.find((o) => o.id === oid)).filter(Boolean);
  const confidenceLine = { certain: null, likely: T.groupLikely, possible: T.groupPossible }[inc.groupingConfidence];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24">
      <div className="pt-3 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-inspection underline underline-offset-2 min-h-[44px]">{T.backToList}</button>
        <ShareButton title={inc.title} T={T} />
      </div>

      {children.every((c) => c.fromFixture) && <p className="mt-2 text-sm text-ochre font-medium">{T.incSample}</p>}
      {closed && <p className="mt-2 rounded bg-stock border border-slate px-3 py-2 text-sm"><span className="font-medium">{T.bannerClosed(inc.agencies.map((a) => AGENCY_NAME[a]).join(T.and), inc.closedDate ? fmtDay(inc.closedDate) : null)}</span>{T.bannerClosedTail}</p>}
      {!closed && !isCurrent(inc, new Date(), state.currentDays || 180) && <p className="mt-2 rounded bg-stock border border-slate px-3 py-2 text-sm"><span className="font-medium">{T.bannerOlder(fmtDay(inc.lastNoticeDate || inc.firstInitiated), inc.agencies.map((a) => AGENCY_NAME[a]).join(T.and), Math.round((state.currentDays || 180) / 30))}</span>{T.bannerOlderTail}</p>}
      <article className={`mt-2 rounded-lg bg-stock ${s.edge} p-4 pl-5`}>
        <SeverityBadge severity={inc.severity} T={T} size="lg" />
        <p className="mt-1 text-sm">{sevText(T, inc.severity).one}</p>
        <h1 lang={!inc.titleParts && lang !== 'en' ? 'en' : undefined} className="mt-3 font-display text-2xl font-black leading-tight">{incidentTitleFor(lang, inc.titleParts, inc.title)}</h1>
        {children.length > 1 && <p className="mt-1 text-sm text-slate">{children.length} notices from {inc.agencies.map((a) => AGENCY_NAME[a]).join(' and ')}</p>}
      </article>

      <section className="mt-4" aria-labelledby="food-h">
        <h2 id="food-h" className="font-display text-lg font-extrabold">{T.theFood}</h2>
        <ul className="mt-1 space-y-2">
          {children.map((c) => (
            <li key={c.id} className="text-base" lang={lang !== 'en' ? 'en' : undefined}>
              <span className="font-medium">{c.product.rawDescription || c.title}</span>
              {c.firm.raw && <span className="text-slate"> — {c.firm.raw}</span>}
            </li>
          ))}
        </ul>
        {inc.codeStatus === 'none' && <p className="mt-2 text-sm text-slate">{T.noBarcode}</p>}
        {inc.codeStatus === 'has_lot_only' && <p className="mt-2 text-sm text-slate">{T.lotOnly}</p>}
        <CodeList label={T.barcodes} items={upcs} />
        <CodeList label={T.lotCodes} items={lots} />
        <CodeList label={T.pkgDates} items={dates} />
      </section>

      <section className="mt-4" aria-labelledby="where-h">
        <h2 id="where-h" className="font-display text-lg font-extrabold">{T.whereSold}</h2>
        <p className="mt-1">{scopeLabelT(T, inc)}</p>
        {inc.statesUnion.length > 0 && inc.scope !== 'nationwide' && <p className="mt-1 text-sm text-slate">{inc.statesUnion.map(stateName).join(', ')}</p>}
        {inc.distributionIncomplete && <p className="mt-1 text-sm text-ochre font-medium">{T.distIncomplete}</p>}
        {children.some((c) => c.distribution.rawPattern) && <details className="mt-1 text-sm"><summary className="text-inspection cursor-pointer min-h-[44px] flex items-center">{T.whatNoticeSays}</summary><p className="text-slate mt-1" lang={lang !== 'en' ? 'en' : undefined}>{children.map((c) => c.distribution.rawPattern).filter(Boolean).join(' / ')}</p></details>}
      </section>

      <section className="mt-4 rounded-lg bg-stock p-4" aria-labelledby="do-h">
        <h2 id="do-h" className="font-display text-lg font-extrabold">{T.whatToDoHead}</h2>
        {(() => {
          // Spanish readers get USDA's own Spanish notice text when it exists — official beats any translation.
          const esChild = lang === 'es' ? children.find((c) => c.es?.instruction) : null;
          if (esChild) return (
            <blockquote className="mt-2 border-l-4 border-ink pl-3" lang="es">
              <p className="text-base">{esChild.es.instruction}</p>
              <footer className="mt-1 text-xs text-slate">{T.fromNoticeEs}</footer>
            </blockquote>
          );
          if (instr?.extracted) return (
            <blockquote className="mt-2 border-l-4 border-ink pl-3">
              <p className="text-base" lang={lang !== 'en' ? 'en' : undefined}>{instr.text}</p>
              <footer className="mt-1 text-xs text-slate">{T.fromNotice(instr.source)}</footer>
            </blockquote>
          );
          return (
            <div className="mt-2">
              <p className="text-base font-medium">{T.dontEat}</p>
              <p className="mt-1 text-base">
                {disposal !== 'see_notice' ? dispCopy(T, disposal)
                  : lead.source === 'fda_enforcement' ? T.fdaDbNoInstr
                  : T.disp_see_notice}
              </p>
              <p className="mt-1 text-xs text-slate">{lead.source === 'fda_enforcement' ? T.summaryDb : T.summaryNoQuote}</p>
            </div>
          );
        })()}
        {(instr?.extracted || (lang === 'es' && children.some((c) => c.es?.instruction))) && disposal !== 'see_notice' && <p className="mt-3 font-medium">{dispCopy(T, disposal)}</p>}
        {lang !== 'en' && T.noticeInEnglish && !(lang === 'es' && children.some((c) => c.es?.instruction)) && <p className="mt-2 text-xs text-slate">{T.noticeInEnglish}</p>}
        <AtRisk agent={inc.agent} allergens={lead.hazard.allergens} guidance={state.hazardGuidance} T={T} lang={lang} />
      </section>

      {outbreaks.length > 0 && (
        <section className="mt-4" aria-labelledby="ill-h">
          <h2 id="ill-h" className="font-display text-lg font-extrabold">{T.illnessHead}</h2>
          {outbreaks.map((o) => (
            <p key={o.id} className="mt-1 text-base">
              {o.cases != null ? T.obSick(o.cases) : T.obSeeAdv}{o.hospitalizations ? `, ${T.obHosp(o.hospitalizations)}` : ''}{o.deaths ? `, ${T.obDied(o.deaths)}` : ''} — <span lang={lang !== 'en' ? 'en' : undefined}>{o.foodGuess || ''}</span>.
              {o.url && <> <a className="text-inspection underline underline-offset-2" href={o.url} target="_blank" rel="noopener">{SOURCE_LABEL[o.source] || 'Investigation page'}</a></>}
            </p>
          ))}
          <p className="mt-1 text-xs text-slate">{T.illnessLinkNote} <button type="button" onClick={onOutbreaks} className="text-inspection underline underline-offset-2">{T.allInvestigations}</button></p>
        </section>
      )}

      {(children.length > 1 || related.length > 0) && (
        <section className="mt-4" aria-labelledby="rel-h">
          <h2 id="rel-h" className="font-display text-lg font-extrabold">{children.length > 1 ? T.noticesInRecall(children.length) : T.possiblyRelated}</h2>
          {confidenceLine && <p className="mt-1 text-sm text-slate">{confidenceLine}</p>}
          <ul className="mt-2 space-y-2">
            {children.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-mono text-xs text-slate" translate="no">{c.nativeId}</span> · {AGENCY_NAME[c.agency]} · <SeverityBadge severity={c.severity} T={T} />
                {c.publishedDate && <span className="text-slate"> · {fmtDay(c.publishedDate)}</span>}
                {c.status !== 'ongoing' && <span className="text-slate"> · {c.status === 'terminated' ? `closed${c.terminationDate ? ` ${fmtDay(c.terminationDate)}` : ''}` : c.status}</span>}
                {c.sourceUrl
                  ? <> · <a className="text-inspection underline underline-offset-2" href={lang === 'es' && c.es?.sourceUrl ? c.es.sourceUrl : c.sourceUrl} target="_blank" rel="noopener">{lang === 'es' && c.es?.sourceUrl ? 'Ver el aviso (español)' : T.seeNotice}</a></>
                  : c.enforcementReportUrl
                    ? <> · <a className="text-inspection underline underline-offset-2" href={c.enforcementReportUrl} target="_blank" rel="noopener">FDA enforcement report</a> <span className="text-slate">(search for {c.nativeId})</span></>
                    : null}
              </li>
            ))}
            {related.map((r) => (
              <li key={r.id}><button type="button" onClick={() => onOpen(r.id)} className="text-inspection underline underline-offset-2 text-left min-h-[44px]">{incidentTitleFor(lang, r.titleParts, r.title)}</button> <span className="text-xs text-slate">{T.sameCompany}</span></li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

// ---------- all active ----------
function AllActive({ state, inputs, onOpen, onBack, T, lang }) {
  const [sort, setSort] = useState('severity');
  const rows = useMemo(() => {
    if (!state) return [];
    const days = state.currentDays || 180;
    const r = orderIncidents(state.incidents.filter((i) => isCurrent(i, new Date(), days)), state.recalls, inputs);
    for (const row of r) row.sample = row.incident.recallIds.every((id) => state.recalls.get(id)?.fromFixture);
    if (sort === 'newest') r.sort((a, b) => String(b.incident.lastNoticeDate).localeCompare(String(a.incident.lastNoticeDate)));
    return r;
  }, [state, inputs, sort]);
  const btn = (v, label) => (
    <button type="button" onClick={() => setSort(v)} aria-pressed={sort === v} className={`min-h-[44px] px-3 rounded-md border ${sort === v ? 'bg-ink text-paper border-ink' : 'border-stockdeep text-ink'}`}>{label}</button>
  );
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24">
      <div className="pt-3"><button type="button" onClick={onBack} className="text-inspection underline underline-offset-2 min-h-[44px]">{T.back}</button></div>
      <h1 className="mt-2 font-display text-2xl font-black">{T.aaHead}</h1>
      <p className="mt-1 text-sm text-slate">{T.aaSub(rows.length, Math.round((state?.currentDays || 180) / 30))}{inputs.state || inputs.query ? ` ${T.aaFilters}` : ''}</p>
      <div className="mt-3 flex gap-2 text-sm" role="group" aria-label={T.aaSort}>{btn('severity', T.aaSortSerious)}{btn('newest', T.aaSortNewest)}</div>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => <IncidentCard key={r.incident.id} row={r} onOpen={onOpen} T={T} lang={lang} />)}
      </ul>
      {state?.archive?.available?.olderOpen > 0 && <p className="mt-4 text-sm text-slate">{T.olderOpenNote(state.archive.available.olderOpen, Math.round((state.currentDays || 180) / 30))}</p>}
    </main>
  );
}

// ---------- review queue (unlinked from nav; for the maintainer) ----------
function Review({ state, onBack }) {
  const q = state?.reviewQueue || [];
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24">
      <div className="pt-3"><button type="button" onClick={onBack} className="text-inspection underline underline-offset-2 min-h-[44px]">← Back</button></div>
      <h1 className="mt-2 font-display text-2xl font-black">Grouping review queue</h1>
      <p className="mt-1 text-sm text-slate">Clusters of unmerged incidents that share a germ and a candidate ingredient word inside 30 days — the token list saying where it might be incomplete. Add good tokens to build/ingredient-tokens.json and rebuild.</p>
      {state?.parseHealth && (
        <section className="mt-4 rounded-lg border border-stockdeep p-3">
          <h2 className="font-display text-base font-extrabold">Parse health (this snapshot)</h2>
          <p className="mt-1 text-xs text-slate">Extraction rates per source. The build fails rather than publish if these fall below floors or drop sharply — see build/health.js.</p>
          <dl className="mt-2 space-y-1 text-sm font-mono">
            {Object.entries(state.parseHealth).map(([src, m]) => <div key={src}><dt className="inline font-bold">{src}</dt> <dd className="inline text-slate">{Object.entries(m).map(([k, v]) => `${k}=${v ?? '—'}`).join(' ')}</dd></div>)}
          </dl>
        </section>
      )}
      {!q.length && <p className="mt-4 rounded-lg bg-stock p-4">Queue is empty — no unexplained clusters in the current data.</p>}
      <ul className="mt-3 space-y-3">
        {q.map((e, i) => (
          <li key={i} className="rounded-lg bg-stock p-4">
            <p className="font-medium">{e.agent} · {fmtDay(e.windowStart)} → {fmtDay(e.windowEnd)} · {e.incidentIds.length} incidents</p>
            <p className="mt-1 text-sm">Candidate tokens: {e.candidateTokens.map((c) => <code key={c.token} className="font-mono bg-paper border border-stockdeep rounded px-1 mr-1">{c.token} ({c.inIncidents})</code>)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

// ---------- outbreaks ----------
const HIDE_COLS = /^(ref|reference|id|pathogen|product|food|total case|case count|status|investigation status)/;

function Outbreaks({ state, onBack, onOpen, T, lang }) {
  const core = state?.sources?.fda_core;
  // Most recent first within each section; case count breaks ties.
  const list = (state?.outbreaks || []).filter((o) => o.source === 'fda_core')
    .sort((a, b) => String(b.lastUpdated || '').localeCompare(String(a.lastUpdated || '')) || (b.cases || 0) - (a.cases || 0));
  const active = list.filter((o) => o.status === 'active');
  const other = list.filter((o) => o.status !== 'active');
  const stale = core?.dataThroughDate && (Date.now() - new Date(core.dataThroughDate + 'T12:00:00Z')) / 86400000 > 14;
  // FDA's stage-column headers and common cell values, localized when recognized; anything we
  // don't recognize renders as published, marked lang="en".
  const COLS = [
    [/date\s*posted|posted/i, 'col_date'], [/total\s*case|case\s*count/i, 'col_cases'],
    [/investigation\s*status/i, 'col_invstatus'], [/advisor/i, 'col_advisory'], [/event\s*status|outbreak\s*\/?\s*event/i, 'col_eventstatus'],
    [/recall/i, 'col_recall'], [/traceback/i, 'col_traceback'], [/inspection/i, 'col_inspection'], [/sampl/i, 'col_sampling'],
  ];
  const colLabel = (h) => { const hit = COLS.find(([re]) => re.test(h)); return hit ? [T[hit[1]], true] : [h, false]; };
  const valLabel = (v) => {
    const s0 = String(v).trim();
    if (/^active$/i.test(s0)) return [T.val_active, true];
    if (/^ended/i.test(s0)) return [T.val_ended + (/see/i.test(s0) ? ` · ${T.val_seeadv}` : ''), true];
    if (/^ongoing/i.test(s0)) return [T.val_ongoing + (/see/i.test(s0) ? ` · ${T.val_seeadv}` : ''), true];
    if (/^see\s+adv/i.test(s0)) return [T.val_seeadv, true];
    if (/^not\s+yet/i.test(s0)) return [T.val_notyet, true];
    if (/^initiated$/i.test(s0)) return [T.val_initiated, true];
    if (/^completed$/i.test(s0)) return [T.val_completed, true];
    if (/^yes$/i.test(s0)) return [T.val_yes, true];
    if (/^no$/i.test(s0)) return [T.val_no, true];
    if (/^[✓✔]$/.test(s0) || /^\d[\d\/,-]*$/.test(s0)) return [s0, true];
    return [s0, false];
  };
  const HIDE = /^(ref|reference|id|pathogen|product|food)/i;
  const Row = ({ o }) => {
    const linked = (o.linkedIncidentIds || []).map((id) => resolveIncident(state, id)).filter(Boolean);
    const stages = Object.entries(o.fields || {}).filter(([h]) => !HIDE.test(h));
    const germ = agentLabel(lang, o.agent) || o.pathogenLabel || o.agent;
    return (
      <li className="rounded-lg bg-stock p-4">
        <p className="font-display text-lg font-extrabold leading-tight" lang={o.foodGuess && !/not\s+yet\s+identified/i.test(o.foodGuess) && lang !== 'en' ? 'en' : undefined}>{o.foodGuess && !/not\s+yet\s+identified/i.test(o.foodGuess) ? o.foodGuess : T.obNotYet}</p>
        <p className="mt-0.5 text-sm"><span className="font-medium">{germ}</span>{o.cases != null ? <> · {T.obSick(o.cases)}</> : <> · {T.obSeeAdv}</>}{o.hospitalizations ? <> · {T.obHosp(o.hospitalizations)}</> : null}{o.deaths ? <> · {T.obDied(o.deaths)}</> : null}</p>
        {stages.length > 0 && (
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate">
            {stages.map(([h, v]) => { const [hl, hOk] = colLabel(h); const [vl, vOk] = valLabel(v); return <div key={h} className="contents"><dt className={hOk ? '' : 'capitalize'} lang={hOk ? undefined : 'en'}>{hl}</dt><dd className="text-ink" lang={vOk ? undefined : 'en'}>{vl}</dd></div>; })}
          </dl>
        )}
        {linked.length > 0 && (
          <p className="mt-2 text-sm">{T.obConnected} {linked.map((i, k) => <span key={i.id}>{k > 0 && ', '}<button type="button" onClick={() => onOpen(i.id)} className="text-inspection underline underline-offset-2 text-left min-h-[44px]">{incidentTitleFor(lang, i.titleParts, i.title)}</button></span>)}</p>
        )}
        <p className="mt-2 text-sm">
          {o.url && !/investigations-foodborne-illness-outbreaks$/.test(o.url)
            ? <a className="text-inspection underline underline-offset-2" href={o.url} target="_blank" rel="noopener">{T.obAdvisory}</a>
            : <span className="text-slate">{T.obNoAdvisory}</span>}
        </p>
      </li>
    );
  };
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24">
      <div className="pt-3"><button type="button" onClick={onBack} className="text-inspection underline underline-offset-2 min-h-[44px]">{T.back}</button></div>
      <h1 className="mt-2 font-display text-2xl font-black">{T.obHead}</h1>
      <p className="mt-1 text-sm text-slate">
        {T.obIntro}
        {core?.dataThroughDate ? <> <span className={stale ? 'text-stamp font-medium' : 'text-ink font-medium'}>{T.obDated(fmtDay(core.dataThroughDate))}</span>{stale ? T.fr_stale : ''}, {T.fr_fetched(fmtTime(core.fetchedAt))}.</> : core?.lastError ? <span className="text-stamp"> {T.obFetchFailed(core.lastError.message)}</span> : null}
        {' '}<a className="text-inspection underline underline-offset-2" href="https://www.fda.gov/food/foodborne-pathogens/investigations-foodborne-illness-outbreaks" target="_blank" rel="noopener">{T.obLive}</a>
      </p>
      {state?.cdcCounts && (
        <section className="mt-3 rounded-lg border border-stockdeep p-3" aria-labelledby="cmp-h">
          <h2 id="cmp-h" className="font-display text-base font-extrabold">{T.cmpHead}</h2>
          <p className="mt-1 text-xs text-slate">{T.cmpIntro}</p>
          <dl className="mt-2 space-y-1 text-sm">
            {Object.entries(state.cdcCounts.byAgent).map(([a, n]) => {
              const fdaN = active.filter((o) => o.agent === a).length;
              return <div key={a} className="flex flex-wrap gap-x-2"><dt className="font-medium">{agentLabel(lang, a) || a}</dt><dd className="text-slate">{T.cmpRow(n, fdaN)}</dd></div>;
            })}
          </dl>
          <p className="mt-2 text-xs text-slate">{T.cmpAsOf(fmtDay(state.cdcCounts.lastUpdated))} <a className="text-inspection underline underline-offset-2" href="https://www.cdc.gov/foodborne-outbreaks/" target="_blank" rel="noopener">{T.cmpLink}</a></p>
        </section>
      )}
      {!list.length && <p className="mt-4 rounded-lg bg-stock p-4">{T.obNone}</p>}
      {active.length > 0 && <><h2 className="mt-4 font-display text-lg font-extrabold">{T.obActive(active.length)}</h2><ul className="mt-2 space-y-3">{active.map((o) => <Row key={o.id} o={o} />)}</ul></>}
      {other.length > 0 && <><h2 className="mt-4 font-display text-lg font-extrabold">{T.obClosed(other.length)}</h2><ul className="mt-2 space-y-3">{other.map((o) => <Row key={o.id} o={o} />)}</ul></>}
      <p className="mt-4 text-xs text-slate">{T.obOurs}</p>
    </main>
  );
}

// ---------- about (minimal for Part 2; expanded in Part 3) ----------
function About({ state, onBack, T, lang }) {
  const s = state?.sources || {};
  const SRC_KEY = { fda_enforcement: 'src_fda', fsis_recall: 'src_usda', fda_rss: 'src_rss', fda_core: 'src_core', cdc_outbreaks: 'src_cdc', fsis_mpi: 'src_mpi', fda_live: 'src_live', snapshot: 'src_snap' };
  const w = (sev) => sevText(T, sev);
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24">
      <div className="pt-3"><button type="button" onClick={onBack} className="text-inspection underline underline-offset-2 min-h-[44px]">{T.back}</button></div>
      <h1 className="mt-2 font-display text-2xl font-black">{T.aboutData}</h1>
      <section className="mt-3 rounded-lg bg-stock p-4">
        <h2 className="font-display text-lg font-extrabold">{T.whyHead}</h2>
        <p className="mt-2 text-sm">{T.whyBody}</p>
        <p className="mt-2 text-xs text-slate">{T.whySource} <a className="text-inspection underline underline-offset-2" href="https://www.foodnavigator.com/Article/2026/02/16/fda-and-usda-staff-cuts-under-trump-raise-food-safety-risks/" target="_blank" rel="noopener" lang="en">“Trump purge at FDA and USDA triggers food safety ‘brain drain’” — FoodNavigator, Feb 16, 2026</a> · <span lang="en">based on US OPM workforce data</span></p>
        <p className="mt-3 flex gap-3 items-center flex-wrap"><FeedbackLink T={T} lang={lang} /><DonateLink T={T} /></p>
      </section>
      <p className="mt-4">{T.abIntro}</p>
      <h2 className="mt-4 font-display text-lg font-extrabold">{T.abBlindHead}</h2>
      <p className="mt-2 text-sm">{T.abBlindBody}</p>
      <h2 className="mt-4 font-display text-lg font-extrabold">{T.abWordsHead}</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {['class_1', 'class_2', 'class_3', 'alert'].map((sev) => <li key={sev}><span className="font-medium">{w(sev).label}</span> — {w(sev).one}</li>)}
        <li><span className="font-medium">{T.abW_closedT}</span> — {T.abW_closed}</li>
      </ul>
      <h2 className="mt-4 font-display text-lg font-extrabold">{T.abSourcesHead}</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {Object.entries(s).map(([id, src]) => (
          <li key={id} className="rounded bg-stock p-2">
            <span className="font-medium">{SRC_KEY[id] ? T[SRC_KEY[id]] : id}</span>
            <span className="text-slate"> · {src?.lastError ? T.ab_failed(src.lastError.message) : src?.liveError ? T.ab_liveFailedSnap(src.liveError.message) : src?.fetchedAt ? T.fr_fetched(fmtTime(src.fetchedAt)) : src?.skipped ? (/FSIS_MPI_URL/.test(src.skipped) ? T.ab_optional : src.skipped) : T.ab_noData}</span>
            {src?.dataThroughDate && <span className="text-slate"> · {T.fr_dataThrough(fmtDay(src.dataThroughDate))}</span>}
          </li>
        ))}
      </ul>
      {state?.archive?.available && <p className="mt-3 text-sm text-slate">{T.ab_archiveNote(state.archive.available.incidents)}</p>}
      {state?.cdcCounts && <p className="mt-3 text-sm">{T.obCdc(Object.entries(state.cdcCounts.byAgent).map(([a, n]) => `${agentLabel(lang, a) || a} ${n}`).join(', '), fmtDay(state.cdcCounts.lastUpdated))}</p>}
      <p className="mt-3 text-xs text-slate">{T.ab_review}</p>
      <p className="mt-3 text-xs text-slate">{T.disclaimer}</p>
      {state?.snapshot?.fixture && <p className="mt-3 rounded bg-ochre/10 border border-ochre p-2 text-sm">{T.ab_sample}</p>}
    </main>
  );
}

// ---------- app ----------
// Locale used by fmtDay/fmtTime; set once per render from App. Module-level is fine because the
// app renders from a single root and re-renders on language change.
let CURRENT_TAG = 'en-US';

function App() {
  const initial = parseRoute();
  const [state, setState] = useState(null);
  const [view, setViewRaw] = useState(initial.view);
  const [inputs, setInputsRaw] = useState(initial.inputs);
  const [lang, setLangRaw] = useState(initial.lang);
  CURRENT_TAG = langTag(lang);
  useEffect(() => { document.documentElement.lang = langTag(lang); }, [lang]);
  const [msg, setMsg] = useState('');
  const announce = (t) => { setMsg(''); setTimeout(() => setMsg(t), 50); };
  const viewRef = useRef(view); viewRef.current = view;
  const inputsRef = useRef(inputs); inputsRef.current = inputs;

  useEffect(() => {
    loadAll((s) => setState({ ...s })).catch((e) => setState((prev) => ({ ...(prev || {}), phase: 'done', fatal: String(e.message || e) })));
    const onHash = () => { const r = parseRoute(); setViewRaw(r.view); setInputsRaw(r.inputs); setLangRaw(r.lang); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Navigation pushes a history entry (back button works); typing only rewrites the current one.
  const langRef = useRef(lang); langRef.current = lang;
  const setView = (v) => { setViewRaw(v); const h = routeFor(v, inputsRef.current, langRef.current); if (window.location.hash !== h) window.location.hash = h; };
  const setInputs = (i) => { setInputsRaw(i); history.replaceState(null, '', routeFor(viewRef.current, i, langRef.current)); };
  const setLang = (l) => { setLangRaw(l); history.replaceState(null, '', routeFor(viewRef.current, inputsRef.current, l)); };
  const T = makeT(lang);

  const open = (id) => setView({ name: 'incident', id });
  const onArchive = () => setState((s) => (s ? { ...s } : s));
  const home = () => setView({ name: 'home' });

  return (
    <>
      <div aria-live="polite" className="sr-only">{msg}</div>
      {state?.snapshot?.fixture && view.name !== 'about' && (
        <p className="bg-ochre text-paper text-center text-xs py-1 px-2">
          {(state.live?.fetchedAt || state.fsisLive?.fetchedAt)
            ? T.bannerMixed
            : 'Sample data — fictional recalls for testing. Not real.'}
        </p>
      )}
      {state?.fatal && <p className="bg-stamp text-paper text-sm px-4 py-2">The page couldn’t start its data check: {state.fatal}. Reload to try again.</p>}
      {view.name === 'home' && <Home state={state} inputs={inputs} setInputs={setInputs} onOpen={open} onAbout={() => setView({ name: 'about' })} onOutbreaks={() => setView({ name: 'outbreaks' })} onActive={() => setView({ name: 'active' })} announce={announce} onArchive={onArchive} T={T} lang={lang} setLang={setLang} />}
      {view.name === 'active' && state && <AllActive state={state} inputs={inputs} onOpen={open} onBack={home} T={T} lang={lang} />}
      {view.name === 'review' && <Review state={state} onBack={home} />}
      {view.name === 'outbreaks' && <Outbreaks state={state} onBack={home} onOpen={open} T={T} lang={lang} />}
      {view.name === 'incident' && state && <Incident state={state} id={view.id} onBack={home} onOpen={open} onArchive={onArchive} onOutbreaks={() => setView({ name: 'outbreaks' })} T={T} lang={lang} />}
      {view.name === 'about' && <About state={state} onBack={home} T={T} lang={lang} />}
    </>
  );
}

export { App, Home, Incident, About, Outbreaks, AllActive, Review, parseRoute, routeFor };
const rootEl = document.getElementById('root');
rootEl.dataset.started = '1';
ReactDOM.createRoot(rootEl).render(<App />);
