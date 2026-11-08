// app.jsx — FoodCheck core UI. React 18 (UMD globals) + Tailwind utilities. The only browser
// storage is two localStorage keys (state, language) so a returning reader isn't asked twice.
// Part 2 scope: first paint, narrow-it-down inputs, result language, incident screen.
// Part 3 adds: URL routing, All active, Outbreaks, About the data, review queue, not-found.

// Import paths are relative to index.html, not to this file: Babel standalone transforms this
// file and runs it as an inline module on the page, so the page's URL is the base.
import { loadAll, loadArchive, loadHistory, freshnessLines, resolveIncident, SOURCE_LABEL } from './src/data/live.js';
import { agentLabel } from './src/i18n.js';
import { splitOutbreaks, filterByAgent, foodText, searchQueryFor, advisoryAgency, isNew, investigationStillOpen, summarizeGroup } from './src/data/outbreaks.js';
import { orderIncidents, evaluate, normalizeStateInput, normalizeUpcInput, normalizeLotInput, upcInputState, scopeLabel, stateName, SEVERITY_RANK, isCurrent } from './src/data/match.js';
import { STATES, DISPOSAL_COPY, ALLERGEN_LABEL } from './src/data/parse.js';
import { t as makeT, LANGS, langTag, incidentTitleFor, plainSentenceFor, foodLabelFor, hazardLabelFor } from './src/i18n.js';

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

// ---------- icons ----------
// Inline SVG, stroke-only, inherits currentColor. The Nov 2026 pass removed emoji: they render
// differently on every phone and read as decoration next to a serious notice.
const ICON_PATHS = {
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 21 21',
  barcode: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10.5 8v8M14 8v8M17 8v8',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM14.5 9.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  x: 'M6 6l12 12M18 6L6 18',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  right: 'M9 6l6 6-6 6',
  left: 'M15 18l-6-6 6-6',
  out: 'M7 17L17 7M8 7h9v9',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M7 8l5-5 5 5',
  speaker: 'M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  pause: 'M8 5v14M16 5v14',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  check: 'M5 12l5 5L20 7',
  warn: 'M12 3 2 21h20L12 3zM12 10v5M12 18h.01',
};
function Icon({ name, size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
const Chev = ({ open, size = 18 }) => <Icon name={open ? 'up' : 'down'} size={size} />;

// ---------- severity ----------
// Shape/edge/color are fixed; label, meaning, and the one-line explanation come from i18n.
const SEVERITY = {
  class_1: { edge: 'edge-1', glyph: '■', text: 'text-stamp', chip: 'bg-stamptint text-stamp', dot: 'dot-serious' },
  alert: { edge: 'edge-a', glyph: '◆', text: 'text-stamp', chip: 'bg-stamptint text-stamp', dot: 'dot-alert' },
  unclassified: { edge: 'edge-u', glyph: '□', text: 'text-slate', chip: 'bg-stock text-slate', dot: 'dot-unrated' },
  class_2: { edge: 'edge-2', glyph: '▲', text: 'text-ochre', chip: 'bg-ochretint text-ochre', dot: 'dot-moderate' },
  class_3: { edge: 'edge-3', glyph: '●', text: 'text-slate', chip: 'bg-stock text-slate', dot: 'dot-minor' },
};
function sevText(T, severity) {
  const arr = T[`sev_${SEVERITY[severity] ? severity : 'unclassified'}`];
  return { label: arr[0], meaning: arr[1], one: arr[2] };
}

/** Tinted pill, one word, shaped dot. The old all-caps CLASS I badge made every card shout alike. */
function SevChip({ severity, T, size = 'sm', long = false }) {
  const key = SEVERITY[severity] ? severity : 'unclassified';
  const s = SEVERITY[key];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${s.chip} ${size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-sm'}`}>
      <i className={`dot ${s.dot}`} aria-hidden="true" />{long ? sevText(T, key).meaning : T[`sevShort_${key}`]}
    </span>
  );
}
/** Long form for Details and the notice list: chip + the agency's class + its plain meaning. */
function SeverityBadge({ severity, T, size = 'sm' }) {
  const x = sevText(T, severity);
  return <span className="inline-flex items-center gap-2 flex-wrap text-sm"><SevChip severity={severity} T={T} size={size} /><span className="text-slate">{x.label} · {x.meaning}</span></span>;
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
        className="min-h-[44px] px-3.5 inline-flex items-center gap-1.5 rounded-full border border-stockdeep bg-surface text-sm font-medium">
        <Icon name="globe" size={16} /><span lang={cur.tag}>{cur.label}</span><Chev open={open} size={14} />
      </button>
      {open && (
        <>
          {/* invisible backdrop: any tap outside the menu closes it */}
          <span aria-hidden="true" onClick={() => setOpen(false)} className="fixed inset-0 z-30 cursor-default" />
          {/* The pill sits at the right edge of the header on every width, so the menu anchors right. */}
          <span role="menu" className="absolute right-0 top-full z-40 mt-1 min-w-[10rem] max-w-[calc(100vw-2rem)] rounded-xl border border-stockdeep bg-surface shadow-card py-1 flex flex-col">
            {LANGS.map((l) => (
              <button key={l.code} type="button" role="menuitemradio" aria-checked={lang === l.code} lang={l.tag}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`min-h-[44px] px-3 text-left text-sm whitespace-nowrap ${lang === l.code ? 'bg-inspectiontint text-inspectiondark font-semibold' : 'hover:bg-stock'}`}>{l.label}</button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

function DonateLink({ T }) {
  // The URL lives in index.html: <body data-donate-url="https://buymeacoffee.com/yourname">.
  // No URL configured → nothing renders.
  const url = typeof document !== 'undefined' ? document.body?.dataset?.donateUrl : null;
  if (!url || !/^https:\/\//.test(url)) return null;
  return <a className="min-h-[44px] inline-flex items-center gap-1.5 text-sm font-medium text-inspection" href={url} target="_blank" rel="noopener"><Icon name="heart" size={16} />{T.donate}</a>;
}

function FeedbackLink({ T, lang }) {
  // The address lives in index.html: <body data-feedback-email="you@example.com">.
  // No address configured → the link simply doesn't render.
  const email = typeof document !== 'undefined' ? document.body?.dataset?.feedbackEmail : null;
  if (!email) return null;
  const href = `mailto:${email}?subject=${encodeURIComponent(T.feedbackSubject)}&body=${encodeURIComponent(`(${typeof window !== 'undefined' ? window.location.href : ''})\n\n`)}`;
  return <a className="min-h-[44px] inline-flex items-center gap-1.5 text-sm font-medium text-inspection" href={href}><Icon name="mail" size={16} />{T.feedback}</a>;
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
      className="fixed bottom-4 right-4 z-40 min-h-[48px] rounded-full bg-ink text-surface px-4 text-sm font-medium shadow-card">
      {T.backToTop}
    </button>
  );
}

// ---------- header: logo, Recalls | Outbreaks switch, language ----------
// Recalls and Outbreaks are equally important sections, so they sit side by side as a segmented
// control (the old "Check outbreaks" button made Outbreaks look like an afterthought). On phones
// the switch drops to its own centered row.
function Header({ section, onHome, onOutbreaks, activeOutbreaks, lang, setLang, T }) {
  const tab = (id, label, n, on) => (
    <button type="button" onClick={on} aria-current={section === id ? 'page' : undefined}
      className={`min-h-[40px] px-5 rounded-full inline-flex items-center gap-1.5 text-sm ${section === id ? 'bg-surface text-ink font-semibold shadow-card' : 'text-slate font-medium'}`}>
      {label}{n > 0 && <span className="text-xs font-semibold text-faint">{n}</span>}
    </button>
  );
  return (
    <header className="pt-4 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
      <button type="button" onClick={onHome} className="justify-self-start min-h-[48px] text-xl font-semibold tracking-tight">FoodCheck</button>
      <nav aria-label={T.navRecalls + ' / ' + T.navOutbreaks} className="order-last sm:order-none col-span-2 sm:col-span-1 justify-self-center">
        <div className="inline-flex gap-1 p-1 rounded-full bg-track">
          {tab('home', T.navRecalls, 0, onHome)}
          {tab('outbreaks', T.navOutbreaks, activeOutbreaks, onOutbreaks)}
        </div>
      </nav>
      <span className="justify-self-end"><LangSwitch lang={lang} setLang={setLang} T={T} /></span>
    </header>
  );
}

// ---------- stamp + blind-spot bar ----------
function fmtTime(iso) { return iso ? new Date(iso).toLocaleTimeString(CURRENT_TAG, { hour: 'numeric', minute: '2-digit' }) : '—'; }
function fmtDay(iso) { return iso ? new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).toLocaleDateString(CURRENT_TAG, { month: 'short', day: 'numeric' }) : null; }

function Stamp({ state, onAbout, T }) {
  const [open, setOpen] = useState(false);
  const lines = state ? freshnessLines(state, T, new Date(), CURRENT_TAG) : [];
  const failing = lines.filter((l) => !l.ok);
  const checked = state?.live?.fetchedAt || state?.sources?.snapshot?.fetchedAt || null;
  return (
    <div className="text-sm leading-snug">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-h-[44px] inline-flex items-center gap-1.5 text-left text-sm">
          <span className="text-faint">{T.checked} {checked ? fmtTime(checked) : '…'}</span>
          <span className={failing.length ? 'text-stamp font-medium' : 'text-faint'}>
            {!state ? '' : failing.length ? `· ${T.sourcesFailing(failing.length)}` : `· ${T.allSourcesOk}`}
          </span><Chev open={open} size={14} />
        </button>
        <button type="button" onClick={onAbout} className="text-inspection text-sm font-medium min-h-[44px] px-1">{T.aboutData}</button>
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

// ---------- search ----------
// One question, one box. The October 2026 UX pass replaced a four-field "narrow it down" panel
// (state + product + barcode + lot, all at once) with the thing people actually do: type a product
// or scan it. Barcode and lot-code typed entry still exist behind "More ways to search"; the
// state is its own one-line row above the list. Nothing was removed from the URL contract.
const EMPTY_INPUTS = { state: null, query: '', upc: '', lot: '' };
const FIELD = 'w-full min-h-[52px] rounded-2xl border border-field bg-surface px-4 py-2 text-lg placeholder:text-faint shadow-[0_1px_2px_rgba(0,0,0,.04)]';
const BTN_PRIMARY = 'min-h-[56px] rounded-2xl bg-inspection hover:bg-inspectiondark text-surface px-7 text-lg font-semibold inline-flex items-center justify-center';
const BTN_QUIET = 'min-h-[56px] rounded-2xl px-5 text-inspection text-base font-medium inline-flex items-center justify-center gap-2';
const BTN_GHOST = 'min-h-[52px] w-full rounded-2xl border border-field text-base font-medium hover:bg-surface';
const BTN_FOLD = 'min-h-[52px] w-full rounded-2xl bg-stock text-slate px-4 text-base font-medium flex items-center justify-between gap-3 text-left';
const PILL = 'min-h-[44px] px-4 rounded-full border border-stockdeep bg-surface text-sm font-medium inline-flex items-center gap-1.5 hover:bg-stock';
const CARD = 'rounded-2xl bg-surface shadow-card';

function SearchBox({ inputs, setInputs, id, T, onSearch }) {
  const [more, setMore] = useState(!!(inputs.upc.trim() || (inputs.lot || '').trim()));
  const [scanning, setScanning] = useState(false);
  const typedAny = !!(inputs.query.trim() || inputs.upc.trim() || (inputs.lot || '').trim());
  const digits = normalizeUpcInput(inputs.upc);
  const upcState = upcInputState(digits);
  const upcHint = upcState === 'too_short' ? T.keepTyping : upcState === 'prefix' ? T.partialUpc : upcState === 'too_long' ? T.tooLongUpc : '';
  return (
    <form id={id} className="mt-7" onSubmit={(e) => { e.preventDefault(); onSearch(); }} role="search" aria-label={T.whatsInKitchen}>
      {scanning && <Scanner T={T} onClose={() => setScanning(false)} onRead={(d) => { setInputs({ ...inputs, upc: d }); setScanning(false); setMore(true); onSearch(); }} />}
      {/* The question above is the label; the placeholder carries the hint. No subtext. */}
      <label htmlFor={`${id}-q`} className="sr-only">{T.whatsInKitchen}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-faint pointer-events-none"><Icon name="search" size={22} /></span>
        <input id={`${id}-q`} className={`${FIELD} min-h-[60px] pl-[52px] pr-12 text-xl`} type="search" autoComplete="off" placeholder={T.kitchenPlaceholder} value={inputs.query} onChange={(e) => setInputs({ ...inputs, query: e.target.value })} />
        {typedAny && <button type="button" onClick={() => setInputs({ ...inputs, query: '', upc: '', lot: '' })} aria-label={T.clearSearch} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl text-faint inline-flex items-center justify-center hover:bg-stock"><Icon name="x" /></button>}
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <button type="submit" className={BTN_PRIMARY}>{T.searchBtn}</button>
        <button type="button" onClick={() => setScanning(true)} className={BTN_QUIET}><Icon name="barcode" size={20} />{T.scanBarcode}</button>
      </div>
      <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className="mt-1 min-h-[44px] text-sm text-faint font-medium inline-flex items-center gap-1">{more ? T.fewerWays : T.moreWays}<Chev open={more} size={14} /></button>
      {more && (
        <div className="mt-1 grid gap-3 sm:grid-cols-2 rounded-2xl bg-stock p-4">
          <label className="block">
            <span className="block text-sm font-medium mb-1">{T.barcodeLabel}</span>
            <input className={`${FIELD} font-mono text-base min-h-[48px] rounded-xl`} translate="no" inputMode="numeric" pattern="[0-9 -]*" placeholder={T.barcodePlaceholder} value={inputs.upc} onChange={(e) => setInputs({ ...inputs, upc: e.target.value })} aria-describedby={`${id}-upc-hint`} />
            <span id={`${id}-upc-hint`} className="mt-1 block text-xs text-slate min-h-[1rem]">{upcHint || T.barcodeHint}</span>
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">{T.lotLabel}</span>
            <input className={`${FIELD} font-mono text-base min-h-[48px] rounded-xl`} translate="no" placeholder={T.lotPlaceholder} value={inputs.lot || ''} onChange={(e) => setInputs({ ...inputs, lot: e.target.value })} />
            <span className="mt-1 block text-xs text-slate">{T.lotHint}</span>
          </label>
        </div>
      )}
    </form>
  );
}

/** "Your state: [Florida]". The select is the change control; the hint text is gone (the About page explains it). */
function StateRow({ inputs, setInputs, T }) {
  return (
    <div className={`mt-4 ${CARD} shadow-none border border-stockdeep px-4 py-3 flex items-center gap-3 flex-wrap`}>
      <span className="text-slate"><Icon name="pin" size={20} /></span>
      <label htmlFor="state-select" className="text-base font-medium">{T.yourState}</label>
      <select id="state-select" className="flex-1 min-w-[11rem] min-h-[44px] rounded-xl border border-field bg-surface px-2.5 text-base font-medium" value={inputs.state || ''} onChange={(e) => setInputs({ ...inputs, state: e.target.value || null })}>
        <option value="">{T.chooseState}</option>
        {Object.entries(STATES).sort((a, b) => a[0].localeCompare(b[0])).map(([name, code]) => (
          <option key={code} value={code}>{name.replace(/\b\w/g, (c) => c.toUpperCase())}</option>
        ))}
      </select>
    </div>
  );
}

// ---------- cards ----------

function IncidentCard({ row, onOpen, T, lang, recalls, archived = false }) {
  const { incident: inc, match } = row;
  const mt = matchText(T, match);
  const closed = archived && inc.status !== 'active';
  const olderOpen = archived && inc.status === 'active';
  const hasMatch = !['none', 'nationwide', 'state_only'].includes(match.matchBasis);
  const sample = row.sample;
  // Food first. The October 2026 UX pass flipped the card: people scan a list for the food they
  // own, not for the hazard sentence. Headline = the product when one notice names it briefly,
  // else the food category in their language; second line = hazard · where sold. The plain
  // sentence and full title still exist behind Details (collapse, never remove).
  const children = recalls ? inc.recallIds.map((id) => recalls.get(id)).filter(Boolean) : [];
  const single = children.length === 1 ? children[0] : null;
  const desc = single?.product?.rawDescription || '';
  const useDesc = single && desc.length > 0 && desc.length <= 70;
  // "Several foods" says nothing; list the actual categories across the notices instead.
  const catsAcross = (() => {
    if (inc.titleParts?.category !== 'several' || !children.length) return null;
    const raw = [...new Set(children.map((c) => c.product.categoryGuess).filter(Boolean))];
    const cats = (raw.length > 1 ? raw.filter((c) => c !== 'other') : raw).map((c) => foodLabelFor(lang, { category: c }));
    return cats.length ? (cats.slice(0, 3).join(', ') + (cats.length > 3 ? ` +${cats.length - 3}` : '')) : null;
  })();
  const headline = useDesc ? desc : (catsAcross || foodLabelFor(lang, inc.titleParts) || incidentTitleFor(lang, inc.titleParts, inc.title));
  const headlineEn = useDesc || (!inc.titleParts && lang !== 'en');
  const who = inc.titleParts?.whoKind === 'firm' ? inc.titleParts.who : (single?.firm?.raw || null);
  const hazard = hazardLabelFor(lang, inc.titleParts) || inc.agentLabel || '';
  const reachTone = match.matchBasis === 'other_state' ? 'text-slate' : ['upc', 'upc_unverified', 'lot', 'state_and_product'].includes(match.matchBasis) ? 'text-stamp' : 'text-ochre';
  return (
    <li className={`fade-in ${CARD} hover:shadow-cardhover`}>
      <button type="button" onClick={() => onOpen(inc.id)} className="w-full text-left py-5 pl-6 pr-5 min-h-[44px] rounded-2xl flex items-center gap-4">
        <span className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="flex gap-2.5 items-center flex-wrap text-sm text-faint">
            <SevChip severity={inc.severity} T={T} />
            {inc.lastUpdated && <span>{fmtDay(inc.lastUpdated)}</span>}
            {closed && <span className="rounded-full border border-stockdeep px-2 text-xs">{T.closedTag}</span>}
            {olderOpen && <span className="rounded-full border border-stockdeep px-2 text-xs">{T.openTag(fmtDay(inc.lastNoticeDate || inc.firstInitiated))}</span>}
            {sample && <span className="rounded-full border border-ochre text-ochre px-2 text-xs">{T.sampleTag}</span>}
          </span>
          <span lang={headlineEn ? 'en' : undefined} className="mt-1 block text-xl font-semibold leading-tight tracking-tight">{headline}</span>
          {who && <span className="block text-base text-faint" lang="en">{who}</span>}
          <span className="block text-base">{hazard} · {scopeLabelT(T, inc)}</span>
          {hasMatch && <span className={`mt-1 inline-flex items-center gap-1.5 text-base font-semibold ${reachTone}`}><Icon name="pin" size={16} />{mt.headline}</span>}
        </span>
        <span className="text-faint"><Icon name="right" size={22} /></span>
      </button>
    </li>
  );
}

/** Split "First sentence. The rest." → [lead, rest] across Latin and CJK punctuation. */
function splitLead(text) {
  const m = String(text).match(/^(.*?[.!?。！？])(\s*)([\s\S]*)$/);
  return m ? [m[1], m[3]] : [text, ''];
}

/**
 * The verdict after someone searches or scans. Boxed and high-contrast so it can't be skimmed
 * past: caution styling when nothing matched (an empty result is the moment people most need to
 * read the caveat), calm styling when something did. role="status" so screen readers announce it.
 */
function ResultVerdict({ matched, T, shareLabel, query, exactUpc = 0 }) {
  const none = matched === 0;
  // A full, valid barcode match is the one certain result the site gives (principle 7): say so.
  const [lead, rest] = splitLead(none ? T.nothingMatched(query) : exactUpc ? T.matchedUpc(exactUpc, query) : T.matchedCount(matched, query));
  return (
    <div role="status" className={`mt-4 ${CARD} p-6 ${none ? 'border border-ochre' : ''}`}>
      <p className="text-3xl font-medium leading-tight tracking-tight flex items-start gap-2">{none && <span className="text-ochre mt-1.5"><Icon name="warn" size={22} /></span>}<span>{lead}</span></p>
      {rest && <p className="mt-2 text-base text-slate">{rest}</p>}
      <p className="mt-4 flex gap-2 flex-wrap">
        {/* The link is the share: state, words, barcode all travel in the URL, nothing on a server. */}
        {shareLabel && <ShareButton title={shareLabel} label={shareLabel} T={T} />}
      </p>
    </div>
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
  const typedProduct = !!(inputs.query.trim() || normalizeUpcInput(inputs.upc).length >= 6 || normalizeLotInput(inputs.lot).length >= 4);
  const typed = !!inputs.state || typedProduct;
  const loading = state && state.phase !== 'done';

  // Closed recalls become relevant only when someone names a product or barcode — then the archive
  // loads (once) and product/barcode matches from it show in their own section.
  const wantsArchive = inputs.query.trim().length >= 3 || normalizeUpcInput(inputs.upc).length >= 6 || normalizeLotInput(inputs.lot).length >= 4;
  useEffect(() => {
    if (!state || !wantsArchive || state.archive?.loadedAt || state.archive?.loading || !state.archive?.available) return;
    loadArchive(state).then(() => onArchive());
  }, [wantsArchive, state?.phase]);
  const PRODUCT_BASES = new Set(['upc', 'upc_unverified', 'lot', 'state_and_product', 'nationwide_and_product', 'product_guess', 'upc_prefix']);
  // The verdict counts only product/barcode/lot matches. Counting state-only matches too made a
  // barcode that matches nothing read "102 recalls may match 041220334568" (found by the scanner
  // end-to-end test, Nov 2026) — the opposite of what principle 7 promises.
  const matched = rows.filter((r) => PRODUCT_BASES.has(r.match.matchBasis));

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
  // The main list shows a page at a time. "Show N more" is a counted fold, not a filter: the
  // count is on screen, and one tap reveals everything — the same collapse-don't-remove rule.
  const PAGE = 6;
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setFoldOpen(false); setShowAll(false); }, [inputs.state, inputs.query, inputs.upc, inputs.lot]);
  const relevantRows = foldActive ? rows.filter(isRelevant) : rows;
  const foldedRows = foldActive ? rows.filter((r) => !isRelevant(r)) : [];

  // With a fold active, matched Class III cards stay in the main list (severity folding would
  // hide a direct hit); with no inputs, Class III folds as before.
  const major = relevantRows.filter((r) => r.incident.severity !== 'class_3' || foldActive);
  const minor = foldActive ? [] : relevantRows.filter((r) => r.incident.severity === 'class_3');
  const majorShown = showAll ? major : major.slice(0, PAGE);
  const scrollToList = () => document.getElementById('active-h')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const closedRows = useMemo(() => {
    if (!state?.archive?.loadedAt || !wantsArchive) return [];
    return orderIncidents(state.archive.incidents, state.recalls, inputs).filter((r) => PRODUCT_BASES.has(r.match.matchBasis)).slice(0, 12);
  }, [state?.archive?.loadedAt, inputs, wantsArchive]);

  useEffect(() => {
    if (!state || state.phase !== 'done') return;
    if (foldActive && typedProduct) announce(`${relevantRows.length} ${relevantRows.length === 1 ? 'recall matches' : 'recalls match'}; ${foldedRows.length} collapsed below.`);
    else if (typedProduct) announce('Nothing matched; showing everything active.');
  }, [inputs.state, inputs.query, inputs.upc, inputs.lot]);

  useEffect(() => {
    if (!state) return;
    if (state.phase === 'snapshot_done') announce(`${rows.length} active recalls loaded from the saved data.`);
    if (state.phase === 'live_done' && state.live.added) announce(`${state.live.added} more from FDA.`);
    if (state.phase === 'done' && state.fsisLive.added) announce(`${state.fsisLive.added} more from USDA.`);
  }, [state?.phase]);

  const anyFailing = state ? Object.values(state.sources || {}).some((x) => x?.lastError || x?.liveError) : false;
  const stale = state?.snapshot?.dataThroughDate ? (Date.now() - new Date(state.snapshot.dataThroughDate + 'T12:00:00Z')) / 86400000 > 21 : false;
  const checkedAt = state?.live?.fetchedAt || state?.sources?.snapshot?.fetchedAt || null;
  const activeOutbreaks = state?.outbreaks ? state.outbreaks.filter((o) => o.source === 'fda_core' && o.status === 'active' && o.eventStatus !== 'ended').length : 0;
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24">
      <Header section="home" onHome={() => {}} onOutbreaks={onOutbreaks} activeOutbreaks={activeOutbreaks} lang={lang} setLang={setLang} T={T} />

      {/* First screen: the question, as the largest thing on the page, then one box and two buttons.
          No subtext under either — the placeholder and the About page carry the hints. */}
      <section aria-labelledby="ask" className="pt-[72px]">
        <h1 id="ask" className="text-[34px] sm:text-[40px] font-medium leading-[1.15] tracking-tight [text-wrap:balance]">{T.tagline}</h1>
        <SearchBox id="narrow" inputs={inputs} setInputs={setInputs} T={T} onSearch={() => { announce(typedProduct ? T.sortedForYou : T.activeNow); scrollToList(); }} />
        <StateRow inputs={inputs} setInputs={setInputs} T={T} />
      </section>

      <section aria-labelledby="active-h" className="mt-[72px]">
        <div className={`flex items-baseline justify-between gap-3 flex-wrap ${typedProduct ? 'sr-only' : ''}`}>
          <h2 id="active-h" className="text-2xl font-semibold tracking-tight scroll-mt-4">
            {typedProduct ? T.sortedForYou : T.activeNow}
            {loading && <span className="ml-2 text-sm font-normal text-faint">{T.stillChecking}</span>}
          </h2>
          <button type="button" onClick={onAbout} className="min-h-[44px] text-sm font-medium text-inspection">{T.obAboutList}</button>
        </div>
        {!typedProduct && <p className="mt-1 text-sm text-faint">{inputs.state ? T.listSubState(stateName(inputs.state)) : T.listSubAll}</p>}
        {/* Freshness detail and the blind-spot bar appear only when something is wrong — a failing
            source or stale data — so the omission is stated on-page (principle 4) without a box
            sitting above the list on a normal day. */}
        {(anyFailing || stale) && <div className={`mt-3 ${CARD} shadow-none border border-stamp/40 px-4 pb-3`}><Stamp state={state} onAbout={onAbout} T={T} /><BlindSpotBar state={state} T={T} /></div>}
        {typedProduct && <ResultVerdict matched={matched.length} exactUpc={matched.filter((r) => r.match.matchBasis === 'upc').length} T={T} shareLabel={T.shareSearch} query={inputs.query.trim() || normalizeUpcInput(inputs.upc) || normalizeLotInput(inputs.lot) || T.whatYouEntered} />}
        {!state && <p className="mt-3 text-slate">Loading…</p>}
        {state && !rows.length && state.phase === 'done' && (
          <div className={`mt-4 ${CARD} p-5`}>
            <p className="font-medium">{T.noActive}</p>
            <p className="mt-1 text-sm text-slate">{T.noActiveSub}</p>
          </div>
        )}
        <ul className="mt-5 space-y-3">
          {majorShown.map((r) => <IncidentCard key={r.incident.id} row={r} onOpen={onOpen} T={T} lang={lang} recalls={state.recalls} />)}
        </ul>
        {major.length > PAGE && (
          <button type="button" onClick={() => setShowAll(!showAll)} aria-expanded={showAll} className={`mt-4 ${BTN_GHOST}`}>
            {showAll ? T.showFewer : T.showMore(major.length - PAGE)}
          </button>
        )}
        {foldActive && (
          <div className="mt-3">
            <button type="button" onClick={() => setFoldOpen(!foldOpen)} aria-expanded={foldOpen} className={BTN_FOLD}>
              <span>{typedProduct ? T.notMatchingFold(foldedRows.length) : T.otherStatesFold(foldedRows.length)}</span>
              <Chev open={foldOpen} />
            </button>
            {foldOpen && <ul className="mt-3 space-y-3">{foldedRows.map((r) => <IncidentCard key={r.incident.id} row={r} onOpen={onOpen} T={T} lang={lang} recalls={state.recalls} />)}</ul>}
          </div>
        )}
        {minor.length > 0 && (
          <div className="mt-3">
            <button type="button" onClick={() => setShowMinor(!showMinor)} aria-expanded={showMinor} className={BTN_FOLD}>
              <span>{T.minorFold(minor.length)}</span><Chev open={showMinor} />
            </button>
            {showMinor && <ul className="mt-3 space-y-3">{minor.map((r) => <IncidentCard key={r.incident.id} row={r} onOpen={onOpen} T={T} lang={lang} recalls={state.recalls} />)}</ul>}
          </div>
        )}
        <p className="mt-3"><button type="button" onClick={onActive} className="text-inspection text-sm font-medium min-h-[44px]">{T.seeEverything}</button></p>
      </section>

      {wantsArchive && state?.archive?.available && (
        <section className="mt-14" aria-labelledby="closed-h">
          <h2 id="closed-h" className="text-xl font-semibold tracking-tight">{T.olderClosedHead}</h2>
          <p className="mt-1 text-base text-slate">{T.olderClosedSub}</p>
          {state.archive.loading && <p className="mt-1 text-sm text-slate">{T.checkingOlder}</p>}
          {state.archive.lastError && <p className="mt-1 text-sm text-stamp">Couldn’t load older recalls: {state.archive.lastError.message}. Reload to try again.</p>}
          {state.archive.loadedAt && !closedRows.length && <p className="mt-1 text-sm text-slate">{T.noneOlder}</p>}
          {closedRows.length > 0 && <p className="mt-1 text-sm text-slate">{T.closedMatchSub(Math.round((state.currentDays || 180) / 30))}</p>}
          <ul className="mt-3 space-y-3">{closedRows.map((r) => <IncidentCard key={r.incident.id} row={r} onOpen={onOpen} T={T} lang={lang} recalls={state.recalls} archived />)}</ul>
        </section>
      )}

      <footer className="mt-16 pt-6 border-t border-stockdeep flex flex-col gap-3">
        <p className="text-base text-slate">{T.bottomNote}</p>
        <p className="text-sm text-faint">{checkedAt ? `${T.updatedFrom(fmtTime(checkedAt))} ` : ''}{T.disclaimer}{state?.archive?.available?.olderOpen > 0 ? ` ${T.olderOpenNote(state.archive.available.olderOpen, Math.round((state.currentDays || 180) / 30))}` : ''}</p>
        <p className="flex gap-6 items-center flex-wrap"><FeedbackLink T={T} lang={lang} /><DonateLink T={T} /></p>
      </footer>
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
  // Vendored, not CDN: ./vendor/zxing-browser.min.js ships with the site, loads when someone taps
  // Scan (immediately if the native detector is unusable, in the background otherwise), and
  // defines window.ZXingBrowser.
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
    const stopNative = () => { clearTimeout(timer); if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; } if (videoRef.current) videoRef.current.srcObject = null; };

    // Path 2: vendored ZXing decoder — Windows/Mac desktop browsers, iPhone Safari, and any
    // browser whose native detector exists but doesn't actually work.
    const startZxing = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera API');
        await loadZxing();
        if (stopped) return;
        const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
        zxControls = await reader.decodeFromConstraints({ video: { facingMode: 'environment' }, audio: false }, videoRef.current,
          (result) => { if (result) ok(result.getText()); });
        setLoading(false);
      } catch (e) {
        setErr(e?.name === 'NotAllowedError' ? 'denied' : 'unsupported');
        setLoading(false);
      }
    };

    // Decide native vs ZXing BEFORE opening the camera. Windows/Mac desktop Chrome exposes the
    // BarcodeDetector class but has no decoding service behind it: getSupportedFormats() comes
    // back empty (or throws), and detect() would reject forever. That probe takes milliseconds;
    // the old approach waited for 40 rejected frames (~10 s) before handing off.
    const FORMATS = ['upc_a', 'upc_e', 'ean_13', 'ean_8'];
    const nativeUsable = async () => {
      if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) return false;
      try {
        const supported = typeof window.BarcodeDetector.getSupportedFormats === 'function' ? await window.BarcodeDetector.getSupportedFormats() : FORMATS;
        if (!Array.isArray(supported) || !supported.some((f) => FORMATS.includes(f))) return false;
        // Second probe: a real detect() on a blank frame. A working service resolves []; a stub
        // service rejects. Bounded so a hung probe can't add the delay we just removed.
        const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16;
        const det = new window.BarcodeDetector({ formats: FORMATS });
        await Promise.race([det.detect(canvas), new Promise((_, rej) => setTimeout(() => rej(new Error('probe timeout')), 1000))]);
        return true;
      } catch { return false; }
    };

    (async () => {
      const useNative = await nativeUsable();
      if (stopped) return;
      if (useNative) {
        // Path 1: built-in detector (Android Chrome/Edge, ChromeOS). Start fetching the ZXing script
        // in the background anyway — it's local and small — so a mid-scan handoff is instant.
        loadZxing().catch(() => { /* only matters if we hand off */ });
        try {
          const detector = new window.BarcodeDetector({ formats: FORMATS });
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          if (stopped) return;
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setLoading(false);
          let failures = 0;
          const tick = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(videoRef.current);
              failures = 0;
              const hit = codes.find((c) => /^\d{8,14}$/.test(c.rawValue));
              if (hit) { ok(hit.rawValue); return; }
            } catch (e) {
              // Safety net for a detector that passed the probe but fails on live frames:
              // 8 consecutive rejections (~2 s), not 40.
              failures++;
              if (e?.name === 'NotSupportedError' || failures >= 8) { stopNative(); startZxing(); return; }
            }
            timer = setTimeout(tick, 250);
          };
          tick();
          return;
        } catch (e) {
          if (e?.name === 'NotAllowedError') { setErr('denied'); setLoading(false); return; }
          stopNative();
        }
      }
      startZxing();
    })();

    return () => {
      stopped = true;
      stopNative();
      if (zxControls) try { zxControls.stop(); } catch { /* already stopped */ }
      const vs = videoRef.current?.srcObject; if (vs) { for (const t of vs.getTracks()) t.stop(); }
    };
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label={T.scanTitle} className="fixed inset-0 z-50 bg-ink/90 flex flex-col items-center justify-center p-4">
      <div className={`w-full max-w-md ${CARD} p-5`}>
        <p className="text-lg font-semibold">{T.scanTitle}</p>
        {!err && <>
          <video ref={videoRef} playsInline muted className="mt-3 w-full rounded-xl bg-ink aspect-video object-cover" />
          <p className="mt-2 text-sm text-slate">{loading ? T.scanLoading : T.scanHint}</p>
        </>}
        {err === 'unsupported' && <p className="mt-3 text-sm">{T.scanUnsupported}</p>}
        {err === 'denied' && <p className="mt-3 text-sm">{T.scanDenied}</p>}
        <p className="mt-2 text-xs text-slate">{T.scanLotNote}</p>
        <button type="button" onClick={onClose} className={`mt-3 w-full ${BTN_PRIMARY}`}>{T.scanClose}</button>
      </div>
    </div>
  );
}

function ShareButton({ title, T, label = null }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: `Recall: ${title}`, url }); return; }
      await navigator.clipboard.writeText(url);
      setDone(true); setTimeout(() => setDone(false), 2000);
    } catch { /* user cancelled */ }
  };
  return <button type="button" onClick={share} className={PILL}><Icon name={done ? 'check' : 'share'} size={16} />{done ? T.linkCopied : (label || T.share)}</button>;
}

function CodeList({ label, items, mono = true }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <span className="block text-sm text-faint">{label}</span>
      <ul className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
        {items.map((x) => <li key={x} translate="no" className={`${mono ? 'font-mono' : ''} text-base font-medium tabular-nums`}>{x}</li>)}
      </ul>
    </div>
  );
}

/** The product line as the agency wrote it. FDA's can run to 600 characters; clamp at four lines with a More toggle. */
function ProductLine({ text, T }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 160;
  return (
    <>
      <p className={`mt-0.5 text-base leading-snug ${long && !open ? 'line-clamp-4' : ''}`} lang="en">{text}</p>
      {long && <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-h-[36px] text-sm font-medium text-inspection">{open ? T.showLessText : T.showMoreText}</button>}
    </>
  );
}

/**
 * One card per notice: brand on top, the product line as the agency wrote it, then the codes for
 * that notice only. Merging codes across notices is what made "two brands" invisible.
 * Long incidents (a company recalling forty SKUs) page at six, counted.
 */
function ProductCards({ children, T, lang }) {
  const PAGE = 6;
  const [all, setAll] = useState(false);
  const shown = all ? children : children.slice(0, PAGE);
  return (
    <>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {shown.map((c) => {
          const brand = c.firm.raw || c.product.brandGuesses?.[0] || null;
          const guess = c.product.brandGuesses?.[0];
          const upcs = c.product.upcs.map((u) => u.digits + (u.checkDigitValid ? '' : ' *'));
          const unverified = c.product.upcs.some((u) => !u.checkDigitValid);
          return (
            <li key={c.id} className={`${CARD} shadow-none border border-stockdeep p-5`}>
              <p className={`text-sm font-semibold ${brand ? 'text-faint' : 'text-faint font-normal'}`} lang="en">{brand || T.brandNotStated}</p>
              <ProductLine text={c.product.rawDescription || c.title} T={T} />
              {guess && guess !== brand && <p className="text-sm text-faint" lang="en">{guess}</p>}
              <CodeList label={T.barcodes} items={upcs} />
              <CodeList label={T.lotCodes} items={c.product.lotCodes} />
              <CodeList label={T.pkgDates} items={c.product.bestByDates.map((d) => d.raw)} />
              {unverified && <p className="mt-1 text-xs text-slate">* {T.upcAsPrinted}</p>}
            </li>
          );
        })}
      </ul>
      {children.length > PAGE && (
        <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className={`mt-3 ${BTN_GHOST}`}>{all ? T.showFewer : T.showMore(children.length - PAGE)}</button>
      )}
    </>
  );
}

/**
 * Pure lookup, no rendering: resolves the at-risk block for an agent/language, with {allergen}
 * substituted. Shared by the AtRisk component (renders it) and the read-aloud text composer
 * (speaks it) so the two can never drift out of sync with each other.
 */
function resolveAtRisk(agent, allergens, guidance, lang) {
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
  // Old shape (a bare {who, lines, citation}) still resolves, as English.
  const langs = entry.langs || { en: { who: entry.who, lines: entry.lines, checks: entry.citation?.checks || [] } };
  const block = langs[lang] || langs.en;
  if (!block?.who || !block?.lines) return null; // summary-only entry: no at-risk block to show
  const usedFallback = !langs[lang] && lang !== 'en';
  const sub = (t) => t.replace('{allergen}', allergen || '');
  return { who: sub(block.who), lines: block.lines.map(sub), usedFallback, citation: entry.citation || {}, checks: block.checks || [] };
}

function AtRisk({ agent, allergens, guidance, T, lang }) {
  const r = resolveAtRisk(agent, allergens, guidance, lang);
  if (!r) return null;
  const { who, lines, usedFallback, citation: c, checks } = r;
  const people = new Set(checks.map((x) => (x.by || '').trim().toLowerCase()).filter(Boolean));
  const last = checks.map((x) => x.at).sort().slice(-1)[0];
  const checkedLine = !checks.length ? T.unverifiedSource
    : people.size >= 2 ? T.checkedMany(people.size, fmtDay(last))
    : T.checkedOnce(fmtDay(last));
  const dead = c.url && c.lastReachableAt === null && c.lastCheckStatus && c.lastCheckStatus !== 403 && c.lastCheckStatus !== 429;

  return (
    <div className="mt-5 pt-4 border-t border-stockdeep" lang={usedFallback ? 'en' : undefined}>
      <p className="text-base font-semibold">{who}</p>
      <ul className="mt-1 space-y-1 text-base">
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
      {lang !== 'en' && !usedFallback && !checks.length && T.translationUnverified && <p className="mt-2 text-xs text-ochre font-medium">{T.translationUnverified}</p>}
      <p className="mt-2 text-xs text-slate">
        {c.url ? <a className="text-inspection font-medium" href={c.url} target="_blank" rel="noopener" lang="en">{c.title}</a> : <span lang="en">{c.title}</span>}
        {' · '}<span className={checks.length ? '' : 'text-ochre font-medium'}>{checkedLine}</span>
        {dead ? <span className="text-stamp font-medium"> · {T.linkMoved}</span> : null}
      </p>
    </div>
  );
}

/**
 * Read-aloud button. Uses the browser's built-in speech synthesis — on-device, free, no new
 * dependency, same "use what the browser already gives us" pattern as the barcode scanner.
 * Renders nothing if the API is unavailable (old browsers, some webviews) or there's no text.
 * Only one utterance plays at a time across the whole page: starting a new one cancels any
 * other, which fires that other button's onerror/onend and resets its own label back to Listen.
 */
let voicesCache = null;
/** Voices load asynchronously in Chrome; wait briefly for them rather than reading an empty list. */
function loadVoices() {
  const ss = window.speechSynthesis;
  if (voicesCache?.length) return Promise.resolve(voicesCache);
  return new Promise((resolve) => {
    const got = () => { const v = ss.getVoices(); if (v.length) { voicesCache = v; resolve(v); return true; } return false; };
    if (got()) return;
    let done = false;
    const onChange = () => { if (!done && got()) { done = true; } };
    if (ss.addEventListener) ss.addEventListener('voiceschanged', onChange);
    else ss.onvoiceschanged = onChange;
    setTimeout(() => { if (!done) { done = true; resolve(ss.getVoices()); } }, 1500);
  });
}
/** Exact tag match, then language-prefix match. Tagalog voices are tagged fil-* or tl-*. */
function pickVoice(voices, tag) {
  const t = tag.toLowerCase();
  const prefixes = t.startsWith('fil') || t.startsWith('tl') ? ['fil', 'tl'] : [t.slice(0, 2)];
  const norm = (v) => (v.lang || '').toLowerCase().replace('_', '-');
  return voices.find((v) => norm(v) === t) || voices.find((v) => prefixes.some((p) => norm(v).startsWith(p))) || null;
}

function SpeakButton({ text, lang, T, size = 'sm' }) {
  const [speaking, setSpeaking] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* already gone */ } }, []);
  const supported = typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function';
  if (!supported || !text) return null;
  const toggle = async (e) => {
    e.stopPropagation();
    const ss = window.speechSynthesis;
    if (speaking) { ss.cancel(); setSpeaking(false); return; }
    ss.cancel();
    const tag = langTag(lang);
    const voice = pickVoice(await loadVoices(), tag);
    if (!voice && lang !== 'en') {
      // Say so rather than play silence: the device has no voice for this language.
      setNoVoice(true); setTimeout(() => setNoVoice(false), 4000);
    }
    // Chrome cuts long utterances off around 15 s; queue one utterance per sentence instead.
    const chunks = String(text).split(/(?<=[.!?。！？])\s+/).filter((c) => c.trim());
    chunks.forEach((chunk, i) => {
      const u = new window.SpeechSynthesisUtterance(chunk);
      u.lang = tag;
      if (voice) u.voice = voice;
      if (i === 0) u.onstart = () => setSpeaking(true);
      if (i === chunks.length - 1) u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      ss.speak(u);
    });
  };
  const langName = (LANGS.find((l) => l.code === lang) || LANGS[0]).label;
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <button type="button" onClick={toggle} aria-pressed={speaking}
        className={size === 'lg' ? `${PILL} ${speaking ? 'bg-inspectiontint text-inspectiondark border-inspectiontint' : ''}` : `min-h-[44px] inline-flex items-center gap-1.5 text-sm font-medium ${speaking ? 'text-inspectiondark' : 'text-inspection'}`}>
        <Icon name={speaking ? 'pause' : 'speaker'} size={16} />{speaking ? T.stopListening : T.listen}
      </button>
      {noVoice && <span role="status" className="text-xs text-ochre">{T.noVoice(langName)}</span>}
    </span>
  );
}

function Incident({ state, id, inputs, onBack, onOpen, onArchive, onOutbreaks, T, lang }) {
  const inc = resolveIncident(state, id);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [id]);
  // Unknown id: it may be a closed incident. Load the archive once before saying not found.
  useEffect(() => {
    if (inc || !state.archive?.available || state.archive?.loadedAt || state.archive?.loading) return;
    loadArchive(state).then(() => onArchive());
  }, [id, inc]);
  // Hooks must run unconditionally, so this sits above the early returns.
  useHistory(state, !!(inc && (inc.outbreakIds || []).length), onArchive);
  if (!inc && state.archive?.available && !state.archive?.loadedAt && !state.archive?.lastError) {
    return <main className="mx-auto w-full max-w-2xl px-4 py-6"><p className="text-slate">Checking closed recalls…</p></main>;
  }
  if (!inc) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <button type="button" onClick={onBack} className="min-h-[48px] inline-flex items-center gap-1 text-base font-medium text-inspection"><Icon name="left" />{T.back}</button>
        <h1 className="mt-4 text-3xl font-medium tracking-tight">{T.notFoundHead}</h1>
        <p className="mt-2">{T.notFoundBody}</p>
        <button type="button" onClick={onBack} className={`mt-4 ${BTN_PRIMARY}`}>{T.seeAllActive}</button>
      </main>
    );
  }
  const children = inc.recallIds.map((rid) => state.recalls.get(rid)).filter(Boolean);
  const lead = children.slice().sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0))[0] || children[0];
  const closed = inc.status !== 'active';
  const s = SEVERITY[inc.severity] || SEVERITY.unclassified;
  const instr = children.find((c) => c.consumerInstruction?.extracted)?.consumerInstruction || lead.consumerInstruction;
  const disposal = lead.disposalAction;
  const related = (inc.relatedIncidentIds || []).map((rid) => resolveIncident(state, rid)).filter(Boolean);
  const outbreaks = (inc.outbreakIds || []).map((oid) => state.outbreaks.find((o) => o.id === oid)).filter(Boolean);
  const confidenceLine = { certain: null, likely: T.groupLikely, possible: T.groupPossible }[inc.groupingConfidence];

  // One spoken pass over the whole "what do I do" path: title, severity, the food, where it was
  // sold, what to do (the same text the page quotes or falls back to), and the at-risk block.
  // Deliberately leaves out codes/notices/related-incidents — those are for reading, not the
  // ten-second answer this button exists for.
  const atRisk = resolveAtRisk(inc.agent, lead.hazard.allergens, state.hazardGuidance, lang);
  const speechText = (() => {
    const esChild = lang === 'es' ? children.find((c) => c.es?.instruction) : null;
    const doText = esChild ? esChild.es.instruction
      : instr?.extracted ? instr.text
      : `${T.dontEat} ${disposal !== 'see_notice' ? dispCopy(T, disposal) : (lead.source === 'fda_enforcement' ? T.fdaDbNoInstr : T.disp_see_notice)}`;
    const dispLine = (instr?.extracted || esChild) && disposal !== 'see_notice' ? dispCopy(T, disposal) : null;
    const foodDesc = [...new Set(children.map((c) => c.product.rawDescription || c.title))].join('. ');
    return [
      incidentTitleFor(lang, inc.titleParts, inc.title),
      sevText(T, inc.severity).one,
      foodDesc,
      scopeLabelT(T, inc),
      doText,
      dispLine,
      atRisk ? `${atRisk.who}. ${atRisk.lines.join(' ')}` : null,
    ].filter(Boolean).join('. ');
  })();

  const posted = inc.lastNoticeDate || inc.firstInitiated;
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24">
      <div className="pt-5 flex items-center justify-between gap-2 flex-wrap">
        <button type="button" onClick={onBack} className="min-h-[48px] inline-flex items-center gap-1 text-base font-medium text-inspection"><Icon name="left" />{T.results}</button>
        <span className="flex gap-2">
          <SpeakButton text={speechText} lang={lang} T={T} size="lg" />
          <ShareButton title={inc.title} T={T} />
        </span>
      </div>

      {children.every((c) => c.fromFixture) && <p className="mt-2 text-sm text-ochre font-medium">{T.incSample}</p>}
      {closed && <p className="mt-4 rounded-2xl bg-stock px-4 py-3 text-base"><span className="font-medium">{T.bannerClosed(inc.agencies.map((a) => AGENCY_NAME[a]).join(T.and), inc.closedDate ? fmtDay(inc.closedDate) : null)}</span>{T.bannerClosedTail}</p>}
      {!closed && !isCurrent(inc, new Date(), state.currentDays || 180) && <p className="mt-4 rounded-2xl bg-stock px-4 py-3 text-base"><span className="font-medium">{T.bannerOlder(fmtDay(inc.lastNoticeDate || inc.firstInitiated), inc.agencies.map((a) => AGENCY_NAME[a]).join(T.and), Math.round((state.currentDays || 180) / 30))}</span>{T.bannerOlderTail}</p>}

      {/* "Sold in Texas" — the reader's own state against this notice, when a state is set. Reuses
          the result-language table so the wording and confidence match the list. */}
      {inputs?.state && (() => {
        const m = evaluate(inc, state.recalls, { state: inputs.state });
        const mt = matchText(T, m);
        if (!mt.headline) return null;
        const tone = ['state_only', 'state_and_product', 'nationwide', 'nationwide_and_product'].includes(m.matchBasis) ? 'bg-stamptint text-stamp' : m.matchBasis === 'other_state' ? 'bg-stock text-slate' : 'bg-ochretint text-ochre';
        return <p role="status" className={`mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-lg font-semibold ${tone}`}><Icon name="pin" size={20} />{mt.headline}</p>;
      })()}

      <section className="mt-8">
        <SevChip severity={inc.severity} T={T} size="lg" long />
        <h1 lang={!inc.titleParts && lang !== 'en' ? 'en' : undefined} className="mt-3 text-[32px] sm:text-[40px] font-medium leading-[1.15] tracking-tight [text-wrap:balance]">{incidentTitleFor(lang, inc.titleParts, inc.title)}</h1>
        <p className="mt-2 text-lg text-slate" lang="en">
          {(() => {
            const firms = [...new Set(children.map((c) => c.firm.raw).filter(Boolean))];
            const head = firms.slice(0, 2).join(', ');
            const more = children.length > 2 ? ` ${T.andNMore(children.length - 2)}` : '';
            const agency = AGENCY_NAME[lead.agency] || lead.agency;
            const tail = children.length === 1 ? T.fromNoticeId(agency, lead.nativeId) : T.fromNotices(children.length, inc.agencies.map((a) => AGENCY_NAME[a]).join(T.and));
            return `${head}${more} ${tail}`.trim();
          })()}
        </p>
      </section>

      <section className={`mt-8 ${CARD} p-7`} aria-labelledby="do-h">
        <h2 id="do-h" className="text-sm font-semibold uppercase tracking-wider text-faint">{T.whatToDoHead}</h2>
        {(() => {
          // Spanish readers get USDA's own Spanish notice text when it exists — official beats any translation.
          const esChild = lang === 'es' ? children.find((c) => c.es?.instruction) : null;
          if (esChild) return (
            <blockquote className="mt-2" lang="es">
              <p className="text-xl leading-snug">{esChild.es.instruction}</p>
              <footer className="mt-2 text-sm text-faint">{T.fromNoticeEs}</footer>
            </blockquote>
          );
          if (instr?.extracted) return (
            <blockquote className="mt-2">
              <p className="text-xl leading-snug" lang={lang !== 'en' ? 'en' : undefined}>{instr.text}</p>
              <footer className="mt-2 text-sm text-faint">{T.fromNotice(instr.source)}</footer>
            </blockquote>
          );
          return (
            <div className="mt-2">
              <p className="text-2xl font-semibold leading-snug tracking-tight">{T.dontEat}</p>
              <p className="mt-1 text-lg leading-snug">
                {disposal !== 'see_notice' ? dispCopy(T, disposal)
                  : lead.source === 'fda_enforcement' ? T.fdaDbNoInstr
                  : T.disp_see_notice}
              </p>
              <p className="mt-2 text-sm text-faint">{lead.source === 'fda_enforcement' ? T.summaryDb : T.summaryNoQuote}</p>
            </div>
          );
        })()}
        {(instr?.extracted || (lang === 'es' && children.some((c) => c.es?.instruction))) && disposal !== 'see_notice' && <p className="mt-3 text-lg font-medium">{dispCopy(T, disposal)}</p>}
        {lang !== 'en' && T.noticeInEnglish && !(lang === 'es' && children.some((c) => c.es?.instruction)) && <p className="mt-2 text-sm text-faint">{T.noticeInEnglish}</p>}
        <AtRisk agent={inc.agent} allergens={lead.hazard.allergens} guidance={state.hazardGuidance} T={T} lang={lang} />
      </section>

      <section className="mt-14" aria-labelledby="food-h">
        <h2 id="food-h" className="text-2xl font-semibold tracking-tight">{T.isThisYours}</h2>
        <p className="mt-1 text-base text-slate">{T.isThisYoursSub}</p>
        <ProductCards children={children} T={T} lang={lang} />
        {inc.codeStatus === 'none' && <p className="mt-3 text-base text-slate">{T.noBarcode}</p>}
        {inc.codeStatus === 'has_lot_only' && <p className="mt-3 text-base text-slate">{T.lotOnly}</p>}
      </section>

      <section className="mt-14" aria-labelledby="facts-h">
        <h2 id="facts-h" className="text-2xl font-semibold tracking-tight">{T.aboutRecall}</h2>
        <dl className="mt-4 divide-y divide-stockdeep border-y border-stockdeep">
          <div className="grid sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 py-3.5">
            <dt className="text-sm text-faint">{T.factWhy}</dt>
            <dd className="text-base">{hazardLabelFor(lang, inc.titleParts) || inc.agentLabel || sevText(T, inc.severity).meaning}</dd>
          </div>
          <div className="grid sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 py-3.5">
            <dt className="text-sm text-faint">{T.whereSold}</dt>
            <dd className="text-base">
              {scopeLabelT(T, inc)}
              {inc.statesUnion.length > 0 && inc.scope !== 'nationwide' && <span className="block text-sm text-slate">{inc.statesUnion.map(stateName).join(', ')}</span>}
              {inc.distributionIncomplete && <span className="block text-sm text-ochre font-medium">{T.distIncomplete}</span>}
              {children.some((c) => c.distribution.rawPattern) && <details className="mt-1 text-sm"><summary className="text-inspection cursor-pointer min-h-[44px] flex items-center font-medium">{T.whatNoticeSays}</summary><p className="text-slate mt-1" lang={lang !== 'en' ? 'en' : undefined}>{children.map((c) => c.distribution.rawPattern).filter(Boolean).join(' / ')}</p></details>}
            </dd>
          </div>
          {posted && (
            <div className="grid sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 py-3.5">
              <dt className="text-sm text-faint">{T.factPosted}</dt>
              <dd className="text-base">{fmtDayY(posted)} · {inc.agencies.map((a) => AGENCY_NAME[a]).join(T.and)}</dd>
            </div>
          )}
          {outbreaks.length > 0 && (
            <div className="grid sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 py-3.5">
              <dt className="text-sm text-faint">{T.factIllness}</dt>
              <dd className="text-base">
                {outbreaks.map((o) => (
                  <div key={o.id} className="mb-2 last:mb-0">
                    <p>
                      {o.cases != null ? T.obSick(o.cases) : T.obSeeAdv}{o.hospitalizations ? `, ${T.obHosp(o.hospitalizations)}` : ''}{o.deaths ? `, ${T.obDied(o.deaths)}` : ''} · <span lang={lang !== 'en' ? 'en' : undefined}>{String(o.foodGuess || '').replace(/\s+/g, ' ')}</span>
                      {o.url && <> · <a className="text-inspection font-medium" href={o.url} target="_blank" rel="noopener">{SOURCE_LABEL[o.source] || 'Investigation page'}</a></>}
                    </p>
                    <CaseHistory state={state} outbreakId={o.id} T={T} className="mt-1" />
                  </div>
                ))}
                <p className="text-sm text-faint">{T.illnessLinkNote} <button type="button" onClick={onOutbreaks} className="text-inspection font-medium">{T.allInvestigations}</button></p>
              </dd>
            </div>
          )}
        </dl>
        {(lead.sourceUrl || lead.enforcementReportUrl) && (
          <a className="mt-4 min-h-[48px] inline-flex items-center gap-1.5 text-lg font-medium text-inspection" href={lang === 'es' && lead.es?.sourceUrl ? lead.es.sourceUrl : (lead.sourceUrl || lead.enforcementReportUrl)} target="_blank" rel="noopener">
            {T.readNotice(AGENCY_NAME[lead.agency] || lead.agency)}<Icon name="out" size={16} />
          </a>
        )}
      </section>

      {(children.length > 1 || related.length > 0) && (
        <section className="mt-10" aria-labelledby="rel-h">
          <h2 id="rel-h" className="text-xl font-semibold tracking-tight">{children.length > 1 ? T.noticesInRecall(children.length) : T.possiblyRelated}</h2>
          {confidenceLine && <p className="mt-1 text-sm text-slate">{confidenceLine}</p>}
          <ul className="mt-2 space-y-2">
            {children.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-mono text-xs text-slate" translate="no">{c.nativeId}</span> · {AGENCY_NAME[c.agency]} · <SeverityBadge severity={c.severity} T={T} />
                {c.publishedDate && <span className="text-slate"> · {fmtDay(c.publishedDate)}</span>}
                {c.status !== 'ongoing' && <span className="text-slate"> · {c.status === 'terminated' ? `closed${c.terminationDate ? ` ${fmtDay(c.terminationDate)}` : ''}` : c.status}</span>}
                {c.sourceUrl
                  ? <> · <a className="text-inspection font-medium" href={lang === 'es' && c.es?.sourceUrl ? c.es.sourceUrl : c.sourceUrl} target="_blank" rel="noopener">{lang === 'es' && c.es?.sourceUrl ? 'Ver el aviso (español)' : T.seeNotice}</a></>
                  : c.enforcementReportUrl
                    ? <> · <a className="text-inspection font-medium" href={c.enforcementReportUrl} target="_blank" rel="noopener">FDA enforcement report</a> <span className="text-slate">(search for {c.nativeId})</span></>
                    : null}
              </li>
            ))}
            {related.map((r) => (
              <li key={r.id}><button type="button" onClick={() => onOpen(r.id)} className="text-inspection font-medium text-left min-h-[44px]">{incidentTitleFor(lang, r.titleParts, r.title)}</button> <span className="text-xs text-slate">{T.sameCompany}</span></li>
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
    <button type="button" onClick={() => setSort(v)} aria-pressed={sort === v} className={`min-h-[44px] px-4 rounded-full border text-sm ${sort === v ? 'bg-inspectiontint text-inspectiondark border-inspection font-semibold' : 'bg-surface border-field text-ink font-medium'}`}>{label}</button>
  );
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24">
      <div className="pt-5"><button type="button" onClick={onBack} className="min-h-[48px] inline-flex items-center gap-1 text-base font-medium text-inspection"><Icon name="left" />{T.back}</button></div>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">{T.aaHead}</h1>
      <p className="mt-1 text-sm text-slate">{T.aaSub(rows.length, Math.round((state?.currentDays || 180) / 30))}{inputs.state || inputs.query ? ` ${T.aaFilters}` : ''}</p>
      <div className="mt-3 flex gap-2 text-sm" role="group" aria-label={T.aaSort}>{btn('severity', T.aaSortSerious)}{btn('newest', T.aaSortNewest)}</div>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => <IncidentCard key={r.incident.id} row={r} onOpen={onOpen} T={T} lang={lang} recalls={state.recalls} />)}
      </ul>
      {state?.archive?.available?.olderOpen > 0 && <p className="mt-4 text-sm text-slate">{T.olderOpenNote(state.archive.available.olderOpen, Math.round((state.currentDays || 180) / 30))}</p>}
    </main>
  );
}

// ---------- review queue (unlinked from nav; for the maintainer) ----------
function Review({ state, onBack }) {
  const q = state?.reviewQueue || [];
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24">
      <div className="pt-5"><button type="button" onClick={onBack} className="min-h-[48px] inline-flex items-center gap-1 text-base font-medium text-inspection"><Icon name="left" />Back</button></div>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">Grouping review queue</h1>
      <p className="mt-1 text-sm text-slate">Clusters of unmerged incidents that share a germ and a candidate ingredient word inside 30 days — the token list saying where it might be incomplete. Add good tokens to build/ingredient-tokens.json and rebuild.</p>
      {state?.parseHealth && (
        <section className={`mt-4 ${CARD} shadow-none border border-stockdeep p-4`}>
          <h2 className="text-base font-semibold">Parse health (this snapshot)</h2>
          <p className="mt-1 text-xs text-slate">Extraction rates per source. The build fails rather than publish if these fall below floors or drop sharply — see build/health.js.</p>
          <dl className="mt-2 space-y-1 text-sm font-mono">
            {Object.entries(state.parseHealth).map(([src, m]) => <div key={src}><dt className="inline font-semibold">{src}</dt> <dd className="inline text-slate">{Object.entries(m).map(([k, v]) => `${k}=${v ?? '—'}`).join(' ')}</dd></div>)}
          </dl>
        </section>
      )}
      {!q.length && <p className={`mt-4 ${CARD} p-5`}>Queue is empty — no unexplained clusters in the current data.</p>}
      <ul className="mt-3 space-y-3">
        {q.map((e, i) => (
          <li key={i} className={`${CARD} p-5`}>
            <p className="font-medium">{e.agent} · {fmtDay(e.windowStart)} → {fmtDay(e.windowEnd)} · {e.incidentIds.length} incidents</p>
            <p className="mt-1 text-sm">Candidate tokens: {e.candidateTokens.map((c) => <code key={c.token} className="font-mono bg-surface border border-stockdeep rounded px-1 mr-1">{c.token} ({c.inIncidents})</code>)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

// ---------- outbreak count history ----------
// What FDA's table said on the dates we checked (data/history.json). No axes, no interpolation:
// each row is one observation as published. One entry means we've only ever seen one value.
function fmtDayY(iso) {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso);
  const opts = d.getUTCFullYear() === new Date().getUTCFullYear() ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString(CURRENT_TAG, opts);
}
function CaseHistory({ state, outbreakId, T, className = '' }) {
  const h = state?.history;
  if (!h?.available) return null;
  if (h.lastError) return <p className={`text-xs text-slate ${className}`}>{T.histFailed}</p>;
  if (!h.loadedAt) return null;
  const obs = h.outbreaks?.[outbreakId] || [];
  if (!obs.length) return null;
  if (obs.length === 1) return <p className={`text-xs text-slate ${className}`}>{T.histSince(fmtDayY(obs[0].seen))}</p>;
  // Date shown is the agency's own posted date when it moved; otherwise the day we saw the change.
  let prevShown = null;
  const rows = obs.map((o, k) => {
    let day = o.agencyDate || o.seen;
    if (day === prevShown) day = o.seen;
    prevShown = day;
    const before = obs[k - 1];
    const ended = o.status === 'closed' && before && before.status !== 'closed';
    const count = o.cases != null ? T.obSick(o.cases) : T.obSeeAdv;
    const extra = [o.hospitalizations ? T.obHosp(o.hospitalizations) : null, o.deaths ? T.obDied(o.deaths) : null].filter(Boolean);
    return { key: o.seen, day: fmtDayY(day), text: [count, ...extra].join(', ') + (ended ? ` · ${T.histEnded}` : '') };
  });
  return (
    <div className={className}>
      <p className="text-xs font-medium text-slate">{T.histHead}</p>
      <ol className="mt-1 text-sm">
        {rows.map((r) => (
          <li key={r.key} className="flex justify-between gap-3 border-t border-stockdeep py-1">
            <span className="text-slate shrink-0">{r.day}</span>
            <span className="text-ink text-right">{r.text}</span>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-xs text-slate">{T.histNote}</p>
    </div>
  );
}
/** Fetch history.json once, the first time a screen that shows outbreaks mounts. */
function useHistory(state, wanted, onLoaded) {
  useEffect(() => {
    if (!wanted || !state?.history?.available || state.history.loadedAt || state.history.loading || state.history.lastError) return;
    loadHistory(state).then(() => onLoaded());
  }, [wanted, state?.history?.available, state?.history?.loadedAt]);
}

// ---------- outbreaks ----------
// Oct 2026 redesign (outside UX review). Informational, not action-oriented: most outbreaks have
// no consumer action yet. Active = still making people sick (FDA's outbreak/event status), not
// "FDA still has a file open". Grouped by germ; unknown foods fold to one line per germ; Ended by
// year, newest first, current year open. Stage fields and the full count history sit behind
// Details. The CDC comparison moved to About; the CDC link stays in the footer here.
// All grouping rules live in src/data/outbreaks.js and are tested there.

/** "116 people sick, up from 97 on Sep 8" — the current count plus the last recorded change, if any. */
function countLine(o, state, T) {
  const obs = state?.history?.outbreaks?.[o.id] || [];
  const cur = o.cases != null ? T.obSick(o.cases) : T.obCountInAdvice;
  if (o.cases == null || obs.length < 2) return cur;
  const prev = [...obs].reverse().find((x) => x.cases != null && x.cases !== o.cases);
  if (!prev) return cur;
  const d = fmtDayY(prev.agencyDate || prev.seen);
  return `${cur}, ${prev.cases < o.cases ? T.obUpFrom(prev.cases, d) : T.obDownFrom(prev.cases, d)}`;
}

/** Localized stage-field list (traceback, sampling…) as FDA published it; behind Details only. */
function StageFields({ o, T }) {
  const COLS = [
    [/date\s*posted|posted/i, 'col_date'], [/total\s*case|case\s*count/i, 'col_cases'],
    [/investigation\s*status/i, 'col_invstatus'], [/advisor/i, 'col_advisory'], [/event\s*status|outbreak\s*\/?\s*event/i, 'col_eventstatus'],
    [/recall/i, 'col_recall'], [/traceback/i, 'col_traceback'], [/inspection/i, 'col_inspection'], [/sampl/i, 'col_sampling'],
  ];
  const HIDE = /^(ref|reference|id|pathogen|product|food)/i;
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
  const stages = Object.entries(o.fields || {}).filter(([h]) => !HIDE.test(h));
  if (!stages.length) return null;
  return (
    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate">
      {stages.map(([h, v]) => { const [hl, hOk] = colLabel(h); const [vl, vOk] = valLabel(v); return <div key={h} className="contents"><dt className={hOk ? '' : 'capitalize'} lang={hOk ? undefined : 'en'}>{hl}</dt><dd className="text-ink" lang={vOk ? undefined : 'en'}>{vl}</dd></div>; })}
    </dl>
  );
}

function NewTag({ T, n }) {
  return <span className="text-xs font-semibold rounded-full bg-inspectiontint text-inspectiondark px-2 py-0.5">{n ? T.obNewN(n) : T.obNew}</span>;
}

/** One named-food entry. `compact` is the Ended row style; otherwise the Active card. */
function OutbreakEntry({ o, state, T, lang, now, compact }) {
  const [open, setOpen] = useState(false);
  const agency = advisoryAgency(o);
  const q = searchQueryFor(o);
  const recallHref = q ? `#/?q=${encodeURIComponent(q.toLowerCase())}` : null;
  const links = (
    <span className="flex flex-wrap gap-x-6">
      {o.advisoryUrl && <a className="min-h-[44px] inline-flex items-center gap-1 text-inspection font-medium" href={o.advisoryUrl} target="_blank" rel="noopener">{T.obAdvice(agency)}<Icon name="out" size={14} /></a>}
      {recallHref && !compact && <a className="min-h-[44px] inline-flex items-center text-inspection font-medium" href={recallHref}>{T.obSeeRecalled}</a>}
    </span>
  );
  const tags = <>{isNew(o, now) && <NewTag T={T} />}{investigationStillOpen(o) && <span className="text-xs text-slate rounded-full border border-stockdeep px-2 py-0.5">{T.obInvOpen}</span>}</>;
  if (compact) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-x-3 py-2 border-b border-stockdeep">
        <div className="min-w-0">
          <p className="font-medium flex flex-wrap items-center gap-2"><span lang="en">{foodText(o)}</span>{tags}</p>
          <p className="text-sm text-faint">{countLine(o, state, T)} · {T.obPosted(fmtDayY(o.lastUpdated))}</p>
        </div>
        {links}
      </li>
    );
  }
  return (
    <li className={`${CARD} px-6 py-5`}>
      <p className="text-xl font-semibold leading-tight tracking-tight flex flex-wrap items-center gap-2"><span lang="en">{foodText(o)}</span>{tags}</p>
      <p className="mt-1 text-base text-slate">{countLine(o, state, T)} · {T.obPosted(fmtDayY(o.lastUpdated))}</p>
      {links}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-h-[44px] text-sm text-faint inline-flex items-center gap-1">{T.details}<Chev open={open} size={14} /></button>
      {open && <div className="mt-1"><CaseHistory state={state} outbreakId={o.id} T={T} /><StageFields o={o} T={T} /></div>}
    </li>
  );
}

/** The folded "food not identified" line for one germ; opens to the individual rows. */
function UnknownFold({ u, named, state, T, now, compact, ended }) {
  const [open, setOpen] = useState(false);
  if (!u.n) return null;
  const newN = u.items.filter((o) => isNew(o, now)).length;
  const head = ended ? T.obUnknownEnded(u.n) : named ? T.obUnknownMore(u.n) : u.n === 1 ? T.obUnknownOne : T.obUnknownN(u.n);
  const dates = u.dates.slice(0, 3).map(fmtDayY).join(', ');
  const meta = [u.casesKnown ? T.obSickTotal(u.cases) : null, dates ? T.obPosted(dates) : null].filter(Boolean).join(' · ');
  return (
    <li className={compact ? 'py-2 border-b border-stockdeep' : 'rounded-2xl bg-stock px-6 py-4'}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full text-left min-h-[44px]">
        <span className={`${compact ? 'font-medium' : 'text-lg font-semibold'} flex flex-wrap items-center gap-2`}>{head}{newN > 0 && !ended && <NewTag T={T} n={newN} />}</span>
        <span className="block text-sm text-faint">{meta}</span>
      </button>
      {open && (
        <ul className="mt-1 pl-3 border-l-2 border-stockdeep">
          {u.items.map((o) => (
            <li key={o.id} className="py-1.5 text-sm">
              <p>{countLine(o, state, T)} · {T.obPosted(fmtDayY(o.lastUpdated))}{investigationStillOpen(o) ? <> · <span className="text-slate">{T.obInvOpen}</span></> : null}</p>
              <CaseHistory state={state} outbreakId={o.id} T={T} className="mt-1" />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** One germ inside an Ended year: the mockup's prose line; tapping it opens the rows with their links. */
function EndedGroup({ g, germName, state, T, lang, now }) {
  const [open, setOpen] = useState(false);
  const { foods, unknown } = summarizeGroup(g);
  const line = [...foods.map((f) => f.text + (f.n > 1 ? ` (${f.n})` : '')), unknown ? T.obUnknownEnded(unknown) : null].filter(Boolean).join(', ');
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full text-left min-h-[44px]">
        <span className="block text-lg font-semibold">{germName(g.agent)} <span className="text-faint font-normal">· {g.n}</span></span>
        <span className="block text-base text-slate" lang="en">{line}</span>
      </button>
      {open && (
        <ul className="mt-1 pl-3 border-l-2 border-stockdeep">
          {g.named.map((o) => <OutbreakEntry key={o.id} o={o} state={state} T={T} lang={lang} now={now} compact />)}
          <UnknownFold u={g.unknown} named={g.named.length > 0} state={state} T={T} now={now} compact ended />
        </ul>
      )}
    </div>
  );
}

function Outbreaks({ state, onBack, onOpen, onRefresh, T, lang, setLang = () => {}, initialTab = 'active' }) {
  const core = state?.sources?.fda_core;
  useHistory(state, true, onRefresh || (() => {}));
  const [tab, setTab] = useState(initialTab);
  const [germ, setGerm] = useState('all');
  const thisYear = String(new Date().getFullYear());
  const [openYears, setOpenYears] = useState({ [thisYear]: true });
  const now = new Date();
  const split = useMemo(() => splitOutbreaks(state?.outbreaks || [], now), [state?.outbreaks]);
  const shown = filterByAgent(split, germ);
  const stale = core?.dataThroughDate && (Date.now() - new Date(core.dataThroughDate + 'T12:00:00Z')) / 86400000 > 14;
  const germName = (a) => agentLabel(lang, a) || a;
  const chips = [{ agent: 'all', n: tab === 'active' ? split.activeN : split.endedN }, ...(tab === 'active' ? split.agentsActive : split.agentsEnded)];
  const summaryFor = (agent) => {
    const e = state?.hazardGuidance?.[agent]?.langs;
    if (!e) return null;
    const b = e[lang] || e.en;
    if (!b?.summary) return null;
    return { text: b.summary, verified: (b.summaryChecks || []).length > 0, fallback: !e[lang] && lang !== 'en' };
  };
  const chip = 'min-h-[44px] px-4 rounded-full border text-sm';
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24">
      <Header section="outbreaks" onHome={onBack} onOutbreaks={() => {}} activeOutbreaks={split.activeN} lang={lang} setLang={setLang} T={T} />
      <h1 className="mt-14 sm:mt-16 text-[34px] sm:text-[40px] font-medium leading-[1.15] tracking-tight">{T.navOutbreaks}</h1>
      <p className="mt-3 text-lg leading-snug text-body">{T.obIntro2}</p>
      {core?.lastError ? <p className="mt-2 text-sm text-stamp">{T.obFetchFailed(core.lastError.message)}</p> : null}
      {stale ? <p className="mt-2 text-sm text-stamp font-medium">{T.obDated(fmtDay(core.dataThroughDate))}{T.fr_stale}</p> : null}

      <div role="group" aria-label={T.obTabsLabel} className="mt-8 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-track">
        {[['active', T.obTabActive, split.activeN], ['ended', T.obTabEnded, split.endedN]].map(([id, label, n]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setGerm('all'); }}
            className={`min-h-[52px] rounded-xl flex items-center justify-center gap-2 ${tab === id ? 'bg-surface text-ink shadow-card' : 'text-slate'}`}>
            <span className="font-semibold">{label}</span><span className="text-sm text-faint">{n}</span>
          </button>
        ))}
      </div>
      <div role="group" aria-label={T.obChipsLabel} className="mt-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c.agent} type="button" aria-pressed={germ === c.agent} onClick={() => setGerm(c.agent)}
            className={`${chip} ${germ === c.agent ? 'bg-inspectiontint text-inspectiondark border-inspection font-semibold' : 'bg-surface border-field text-ink font-medium'}`}>{c.agent === 'all' ? T.obAll : germName(c.agent)} {c.n}</button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">{tab === 'active' ? T.obShowingActive(shown.activeN, germ === 'all' ? '' : germName(germ)) : T.obShowingEnded(shown.endedN, germ === 'all' ? '' : germName(germ))}</p>

      {tab === 'active' && (
        <>
          {!shown.active.length && <p className={`mt-6 ${CARD} p-5`}>{T.obNoneActive}</p>}
          {shown.active.map((g) => {
            const sum = summaryFor(g.agent);
            return (
              <section key={g.agent} className="mt-11" aria-labelledby={`g-${g.agent}`}>
                <h2 id={`g-${g.agent}`} className="text-2xl font-semibold tracking-tight">{germName(g.agent)}</h2>
                {sum && <p className="mt-1 text-base text-slate" lang={sum.fallback ? 'en' : undefined}>{sum.text}{!sum.verified && <span className="text-ochre font-medium"> · {T.obSummaryUnverified}</span>}</p>}
                <ul className="mt-4 space-y-3">
                  {g.named.map((o) => <OutbreakEntry key={o.id} o={o} state={state} T={T} lang={lang} now={now} />)}
                  <UnknownFold u={g.unknown} named={g.named.length > 0} state={state} T={T} now={now} />
                </ul>
              </section>
            );
          })}
        </>
      )}

      {tab === 'ended' && (
        <>
          {shown.ended.map((y) => {
            const isOpen = !!openYears[y.year];
            return (
              <section key={y.year} className="mt-4 first:mt-7 border-t border-stockdeep">
                <h2><button type="button" aria-expanded={isOpen} onClick={() => setOpenYears({ ...openYears, [y.year]: !isOpen })} className="w-full min-h-[60px] flex items-center gap-3 text-left">
                  <span className="flex-1 text-[22px] font-semibold">{y.year}</span><span className="text-sm text-faint">{T.obYearN(y.n)}</span><span className="text-faint"><Chev open={isOpen} size={20} /></span>
                </button></h2>
                {isOpen && <div className="pb-4 flex flex-col gap-3.5">{y.groups.map((g) => <EndedGroup key={g.agent} g={g} germName={germName} state={state} T={T} lang={lang} now={now} />)}</div>}
              </section>
            );
          })}
        </>
      )}

      <p className="mt-14 text-sm text-faint">
        {T.obFrom(fmtDay(core?.fetchedAt || core?.dataThroughDate || state?.generatedAt))}{' '}
        <a className="text-inspection font-medium" href="https://www.fda.gov/food/foodborne-pathogens/investigations-foodborne-illness-outbreaks" target="_blank" rel="noopener">{T.obFdaFull}</a>
        {' · '}<a className="text-inspection font-medium" href="https://www.cdc.gov/foodborne-outbreaks/" target="_blank" rel="noopener">{T.obCdcList}</a>
      </p>
    </main>
  );
}

// ---------- about (minimal for Part 2; expanded in Part 3) ----------
function About({ state, onBack, T, lang }) {
  const s = state?.sources || {};
  const SRC_KEY = { fda_enforcement: 'src_fda', fsis_recall: 'src_usda', fda_rss: 'src_rss', fda_core: 'src_core', cdc_outbreaks: 'src_cdc', fsis_mpi: 'src_mpi', fda_live: 'src_live', snapshot: 'src_snap' };
  const w = (sev) => sevText(T, sev);
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24">
      <div className="pt-5"><button type="button" onClick={onBack} className="min-h-[48px] inline-flex items-center gap-1 text-base font-medium text-inspection"><Icon name="left" />{T.back}</button></div>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">{T.aboutData}</h1>
      <section className={`mt-4 ${CARD} p-5`}>
        <h2 className="text-xl font-semibold tracking-tight">{T.whyHead}</h2>
        <p className="mt-2 text-sm">{T.whyBody}</p>
        <p className="mt-2 text-xs text-slate">{T.whySource} <a className="text-inspection font-medium" href="https://www.foodnavigator.com/Article/2026/02/16/fda-and-usda-staff-cuts-under-trump-raise-food-safety-risks/" target="_blank" rel="noopener" lang="en">“Trump purge at FDA and USDA triggers food safety ‘brain drain’” — FoodNavigator, Feb 16, 2026</a> · <span lang="en">based on US OPM workforce data</span></p>
        <p className="mt-3 flex gap-3 items-center flex-wrap"><FeedbackLink T={T} lang={lang} /><DonateLink T={T} /></p>
      </section>
      <p className="mt-4">{T.abIntro}</p>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">{T.abBlindHead}</h2>
      <p className="mt-2 text-sm">{T.abBlindBody}</p>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">{T.abWordsHead}</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {['class_1', 'class_2', 'class_3', 'alert'].map((sev) => <li key={sev}><span className="font-medium">{w(sev).label}</span> — {w(sev).one}</li>)}
        <li><span className="font-medium">{T.abW_closedT}</span> — {T.abW_closed}</li>
      </ul>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">{T.abSourcesHead}</h2>
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
      <p className="mt-4 text-sm text-slate">{T.rememberedNote} {T.stateHint}</p>
      <p className="mt-2 text-sm text-slate">{T.obOurs}</p>
      {state?.cdcCounts && (
        <section className={`mt-4 ${CARD} shadow-none border border-stockdeep p-4`} aria-labelledby="cmp-h">
          <h2 id="cmp-h" className="text-base font-semibold">{T.cmpHead}</h2>
          <p className="mt-1 text-xs text-slate">{T.cmpIntro}</p>
          <dl className="mt-2 space-y-1 text-sm">
            {Object.entries(state.cdcCounts.byAgent).map(([a, n]) => {
              const fdaN = (state.outbreaks || []).filter((o) => o.source === 'fda_core' && o.agent === a && o.status === 'active' && o.eventStatus !== 'ended').length;
              return <div key={a} className="flex flex-wrap gap-x-2"><dt className="font-medium">{agentLabel(lang, a) || a}</dt><dd className="text-slate">{T.cmpRow(n, fdaN)}</dd></div>;
            })}
          </dl>
          <p className="mt-2 text-xs text-slate">{T.cmpAsOf(fmtDay(state.cdcCounts.lastUpdated))} <a className="text-inspection font-medium" href="https://www.cdc.gov/foodborne-outbreaks/" target="_blank" rel="noopener">{T.cmpLink}</a></p>
        </section>
      )}
      <p className="mt-3 text-xs text-slate">{T.ab_review}</p>
      <p className="mt-3 text-xs text-slate">{T.disclaimerLong}</p>
      {state?.snapshot?.fixture && <p className="mt-3 rounded bg-ochre/10 border border-ochre p-2 text-sm">{T.ab_sample}</p>}
    </main>
  );
}

// ---------- app ----------
// Locale used by fmtDay/fmtTime; set once per render from App. Module-level is fine because the
// app renders from a single root and re-renders on language change.
let CURRENT_TAG = 'en-US';

// On-device memory for the two things an older relative should never have to re-enter: state and
// language. A URL param always wins (a shared link opens as the sender saw it); storage only fills
// in when the URL is silent. Nothing leaves the phone; try/catch because private windows throw.
const remember = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* storage blocked */ } },
};
function App() {
  const initial = (() => {
    const r = parseRoute();
    const hashParams = new URLSearchParams((window.location.hash.split('?')[1] || ''));
    if (!hashParams.get('state')) { const saved = normalizeStateInput(remember.get('fc-state')); if (saved) r.inputs = { ...r.inputs, state: saved }; }
    if (!hashParams.get('lang')) { const saved = remember.get('fc-lang'); if (saved && LANGS.some((l) => l.code === saved)) r.lang = saved; }
    return r;
  })();
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
    history.replaceState(null, '', routeFor(initial.view, initial.inputs, initial.lang));
    loadAll((s) => setState({ ...s })).catch((e) => setState((prev) => ({ ...(prev || {}), phase: 'done', fatal: String(e.message || e) })));
    const onHash = () => { const r = parseRoute(); setViewRaw(r.view); setInputsRaw(r.inputs); setLangRaw(r.lang); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Navigation pushes a history entry (back button works); typing only rewrites the current one.
  const langRef = useRef(lang); langRef.current = lang;
  const setView = (v) => { setViewRaw(v); const h = routeFor(v, inputsRef.current, langRef.current); if (window.location.hash !== h) window.location.hash = h; };
  const setInputs = (i) => { setInputsRaw(i); remember.set('fc-state', i.state ? stateName(i.state).toLowerCase() : null); history.replaceState(null, '', routeFor(viewRef.current, i, langRef.current)); };
  const setLang = (l) => { setLangRaw(l); remember.set('fc-lang', l); history.replaceState(null, '', routeFor(viewRef.current, inputsRef.current, l)); };
  const T = makeT(lang);

  const open = (id) => setView({ name: 'incident', id });
  const onArchive = () => setState((s) => (s ? { ...s } : s));
  const home = () => setView({ name: 'home' });

  return (
    <>
      <div aria-live="polite" className="sr-only">{msg}</div>
      {state?.snapshot?.fixture && view.name !== 'about' && (
        <p className="bg-ochre text-surface text-center text-xs py-1 px-2">
          {(state.live?.fetchedAt || state.fsisLive?.fetchedAt)
            ? T.bannerMixed
            : 'Sample data — fictional recalls for testing. Not real.'}
        </p>
      )}
      {state?.fatal && <p className="bg-stamp text-surface text-sm px-4 py-2">The page couldn’t start its data check: {state.fatal}. Reload to try again.</p>}
      {view.name === 'home' && <Home state={state} inputs={inputs} setInputs={setInputs} onOpen={open} onAbout={() => setView({ name: 'about' })} onOutbreaks={() => setView({ name: 'outbreaks' })} onActive={() => setView({ name: 'active' })} announce={announce} onArchive={onArchive} T={T} lang={lang} setLang={setLang} />}
      {view.name === 'active' && state && <AllActive state={state} inputs={inputs} onOpen={open} onBack={home} T={T} lang={lang} />}
      {view.name === 'review' && <Review state={state} onBack={home} />}
      {view.name === 'outbreaks' && <Outbreaks state={state} onBack={home} onOpen={open} onRefresh={onArchive} T={T} lang={lang} setLang={setLang} />}
      {view.name === 'incident' && state && <Incident state={state} id={view.id} inputs={inputs} onBack={home} onOpen={open} onArchive={onArchive} onOutbreaks={() => setView({ name: 'outbreaks' })} T={T} lang={lang} />}
      {view.name === 'about' && <About state={state} onBack={home} T={T} lang={lang} />}
    </>
  );
}

export { App, Home, Incident, About, Outbreaks, AllActive, Review, parseRoute, routeFor };
const rootEl = document.getElementById('root');
rootEl.dataset.started = '1';
ReactDOM.createRoot(rootEl).render(<App />);
