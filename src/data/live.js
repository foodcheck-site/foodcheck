// live.js — browser data loader.
// Request budget per page load: 2.
//   1  snapshot.json
//   2  openFDA delta since the snapshot's FDA data-through date (+1 page only if >1000 records)
// USDA (FSIS) is snapshot-only. The API allows browser fetch (CORS probe 2026-08-25) but its only
// endpoint returns the entire archive since 2014 — 2,022 rows, 13 MB, English and Spanish — which is
// not something to download on every page load. FSIS_LIVE re-enables the live stage if a filtered
// endpoint is found; the code path is kept and tested.
const FSIS_LIVE = false;
//
// Progressive: onUpdate() fires after the snapshot and again after the live delta, so the UI
// renders partial results as they arrive. Every failure lands in sources[id].lastError and the
// page keeps working with whatever loaded.

import { fromOpenFda, fromFsis } from './normalize.js';
import { absorbProvisionals, groupIncidents, linkOutbreaks } from './reconcile.js';

const OPENFDA = 'https://api.fda.gov/food/enforcement.json';
const FSIS = 'https://www.fsis.usda.gov/fsis/api/recall/v/1';
const SNAPSHOT_URL = './data/snapshot.json';

export const SOURCE_LABEL = {
  fda_enforcement: 'FDA (everything else)',
  fda_rss: 'FDA press releases',
  fda_live: 'FDA live check',
  fsis_recall: 'USDA (meat & poultry)',
  fsis_mpi: 'USDA establishment list',
  fda_core: 'FDA outbreak investigations',
  cdc_outbreaks: 'CDC illness reports',
  snapshot: 'Snapshot file',
};

function emptyState() {
  return {
    recalls: new Map(),
    incidents: [],
    aliases: {},
    outbreaks: [],
    tokens: [],
    hazardGuidance: null,
    sources: {},
    snapshot: { generatedAt: null, dataThroughDate: null, fixture: false, ok: false },
    live: { attemptedAt: null, fetchedAt: null, added: 0, requests: 0, lastError: null },
    fsisLive: { attemptedAt: null, fetchedAt: null, added: 0, lastError: null },
    cdcCounts: null,
    archive: { incidents: [], loadedAt: null, loading: false, lastError: null, available: null },
    phase: 'idle',
  };
}

function fmtDate(iso) { return iso ? iso.replace(/-/g, '') : null; }

function yyyymmdd(d) { return d.toISOString().slice(0, 10).replace(/-/g, ''); }

/** Build a quoted openFDA search string. Term values are always quoted (constraint 2); ranges use bracket syntax. */
export function openFdaSearch({ reportFrom, reportTo }) {
  return `report_date:[${reportFrom}+TO+${reportTo}]`;
}

async function fetchJson(url, { timeoutMs = 12000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (res.status === 404) return { notFound: true, status: 404 };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { json: await res.json(), status: res.status };
  } finally {
    clearTimeout(t);
  }
}

function validateSnapshot(s) {
  if (!s || typeof s !== 'object') throw new Error('not an object');
  if (!s.generatedAt || !Array.isArray(s.recalls) || !Array.isArray(s.incidents)) throw new Error('missing generatedAt, recalls, or incidents');
  return s;
}

/**
 * Load everything. Calls onUpdate(state) after each stage.
 * @param {object} opts { fetchImpl, now, snapshotUrl, liveWindowDays }
 */
export async function loadAll(onUpdate, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date();
  const state = emptyState();
  const emit = (phase) => { state.phase = phase; onUpdate(structuredCloneSafe(state)); };

  // ---- Stage 1: snapshot ----
  emit('loading_snapshot');
  try {
    const { json, notFound } = await fetchJson(opts.snapshotUrl || SNAPSHOT_URL);
    if (notFound) throw new Error('file not found (has the build step run?)');
    const snap = validateSnapshot(json);
    for (const r of snap.recalls) state.recalls.set(r.id, snap.fixture ? { ...r, fromFixture: true } : r);
    state.incidents = snap.incidents;
    state.aliases = snap.aliases || {};
    state.outbreaks = snap.outbreaks || [];
    state.tokens = snap.ingredientTokens || [];
    state.hazardGuidance = snap.hazardGuidance || null;
    state.reviewQueue = snap.reviewQueue || [];
    state.cdcCounts = snap.cdcCounts || null;
    state.archive.available = snap.archive || null;
    state.currentDays = snap.currentDays || 180;
    state.parseHealth = snap.parseHealth || null;
    state.sources = snap.sources || {};
    state.snapshot = {
      generatedAt: snap.generatedAt,
      dataThroughDate: snap.sources?.fda_enforcement?.dataThroughDate || null,
      fixture: !!snap.fixture,
      ok: true,
      schemaVersion: snap.schemaVersion,
    };
    state.sources.snapshot = { fetchedAt: now.toISOString(), lastError: null, dataThroughDate: snap.generatedAt };
  } catch (err) {
    state.snapshot.ok = false;
    state.sources.snapshot = { fetchedAt: null, lastError: { at: now.toISOString(), message: String(err.message || err) }, dataThroughDate: null };
    // Mark every snapshot-only source as unavailable so the stamp names them.
    for (const id of ['fsis_recall', 'fda_rss', 'fda_core', 'cdc_outbreaks']) {
      state.sources[id] = { fetchedAt: null, dataThroughDate: null, lastError: { at: now.toISOString(), message: 'snapshot unavailable' } };
    }
  }
  emit('snapshot_done');

  // ---- Stage 2: openFDA delta ----
  // Window: from the snapshot's FDA data-through date (or 45 days back if no snapshot) to today.
  const fromIso = state.snapshot.dataThroughDate || new Date(now - (opts.liveWindowDays ?? 45) * 86400000).toISOString().slice(0, 10);
  const reportFrom = fmtDate(fromIso);
  const reportTo = yyyymmdd(now);
  state.live.attemptedAt = now.toISOString();
  emit('loading_live');
  const fresh = [];
  try {
    let skip = 0;
    const limit = 1000;
    for (let page = 0; page < 2; page++) {
      const url = `${OPENFDA}?search=${openFdaSearch({ reportFrom, reportTo })}&limit=${limit}&skip=${skip}`;
      state.live.requests++;
      const { json, notFound } = await fetchJson(url);
      if (notFound) break; // openFDA returns 404 for "no matches"; that's an empty window, not a failure.
      const results = json.results || [];
      for (const raw of results) fresh.push(fromOpenFda(raw, now.toISOString()));
      const total = json.meta?.results?.total ?? results.length;
      state.live.dataLastUpdated = json.meta?.last_updated || null;
      if (results.length < limit || skip + limit >= total) break;
      skip += limit;
      if (page === 1) state.live.truncated = true;
    }
    let added = 0;
    for (const r of fresh) {
      const existing = state.recalls.get(r.id);
      if (existing) {
        // Keep the snapshot's firstSeenAt; refresh status and lastSeenDate.
        r.firstSeenAt = existing.firstSeenAt;
        if (existing.status !== r.status) added++;
        state.recalls.set(r.id, { ...existing, status: r.status, lastSeenDate: r.lastSeenDate });
      } else {
        state.recalls.set(r.id, r);
        added++;
      }
    }
    state.live.added = added;
    state.live.fetchedAt = new Date().toISOString();
    // If the live delta found records newer than the snapshot's corpus, the "data through" date
    // moves forward — the stamp and the blind-spot tick reflect what we actually have now.
    const maxReport = fresh.map((r) => r.publishedDate).filter(Boolean).sort().slice(-1)[0] || null;
    if (maxReport && (!state.snapshot.dataThroughDate || maxReport > state.snapshot.dataThroughDate)) {
      state.snapshot.dataThroughDate = maxReport;
      if (state.sources.fda_enforcement) state.sources.fda_enforcement.dataThroughDate = maxReport;
    }
    state.sources.fda_live = { fetchedAt: state.live.fetchedAt, dataThroughDate: fromIso, lastError: null, recordCount: fresh.length };
    if (added > 0 || !state.snapshot.ok) regroup(state);
  } catch (err) {
    const msg = /429/.test(String(err.message)) ? 'rate limited by openFDA (too many checks from this network today)' : String(err.message || err);
    state.live.lastError = { at: new Date().toISOString(), message: msg };
    state.sources.fda_live = { fetchedAt: null, dataThroughDate: fromIso, lastError: state.live.lastError };
  }
  emit('live_done');

  // ---- Stage 3: FSIS live (off by default; see FSIS_LIVE) ----
  if (!(opts.fsisLive ?? FSIS_LIVE)) { emit('done'); return state; }
  // Replaces the snapshot's FSIS records with the live list; firstSeenAt is kept from the
  // snapshot so incident ids don't move. If it fails, the snapshot copy stays and the stamp says so.
  state.fsisLive.attemptedAt = new Date().toISOString();
  emit('loading_fsis');
  try {
    const { json } = await fetchJson(FSIS, { timeoutMs: 15000 });
    const rows = Array.isArray(json) ? json : json?.data || json?.results || [];
    const fresh = rows.map((r) => fromFsis(r, new Date().toISOString())).filter((r) => r && r.nativeId);
    if (!fresh.length) throw new Error('response had no recall records');
    let added = 0;
    const liveIds = new Set(fresh.map((r) => r.id));
    for (const r of fresh) {
      const existing = state.recalls.get(r.id);
      if (existing) { r.firstSeenAt = existing.firstSeenAt; if (existing.status !== r.status) added++; }
      else added++;
      state.recalls.set(r.id, r);
    }
    // FSIS records that dropped off the live list are closed, not deleted.
    for (const r of state.recalls.values()) {
      if (r.source === 'fsis_recall' && !liveIds.has(r.id) && r.status === 'ongoing') { r.status = 'completed'; added++; }
    }
    state.fsisLive.added = added;
    state.fsisLive.fetchedAt = new Date().toISOString();
    state.sources.fsis_recall = { ...(state.sources.fsis_recall || {}), fetchedAt: state.fsisLive.fetchedAt, lastError: null, live: true, recordCount: fresh.length,
      dataThroughDate: fresh.map((r) => r.publishedDate).filter(Boolean).sort().slice(-1)[0] || null };
    if (added > 0) regroup(state);
  } catch (err) {
    state.fsisLive.lastError = { at: new Date().toISOString(), message: String(err.message || err) };
    // Keep the snapshot's FSIS block but record that the live check failed.
    state.sources.fsis_recall = { ...(state.sources.fsis_recall || { fetchedAt: null, dataThroughDate: null }), liveError: state.fsisLive.lastError, live: false };
  }
  emit('done');
  return state;
}

function regroup(state) {
  // Archive recalls stay in their own list; only live-set recalls are regrouped.
  const all = absorbProvisionals([...state.recalls.values()].filter((r) => !r.fromArchive));
  const { incidents, aliases } = groupIncidents(all, state.outbreaks, state.tokens, state.incidents);
  state.incidents = incidents;
  state.aliases = { ...state.aliases, ...aliases };
  linkOutbreaks(state.incidents, state.outbreaks);
}

function structuredCloneSafe(state) {
  // Maps don't survive JSON; hand the UI a shallow copy with the same Map reference.
  return { ...state, recalls: state.recalls };
}

/**
 * Load archive.json (closed recalls) on demand — when someone types a barcode or product, or opens
 * a link to an incident that isn't in the active set. One request, once per page load.
 * Mutates state: state.archive = { incidents, loadedAt } and adds closed recalls to state.recalls.
 */
export async function loadArchive(state, opts = {}) {
  if (state.archive?.loadedAt || state.archive?.loading) return state;
  state.archive = { ...(state.archive || {}), loading: true };
  try {
    const { json, notFound } = await fetchJson(opts.archiveUrl || './data/archive.json', { timeoutMs: 20000 });
    if (notFound) throw new Error('archive file not found');
    for (const r of json.recalls || []) if (!state.recalls.has(r.id)) state.recalls.set(r.id, { ...r, fromArchive: true, ...(json.fixture ? { fromFixture: true } : {}) });
    state.archive = { incidents: json.incidents || [], loadedAt: new Date().toISOString(), loading: false, lastError: null };
  } catch (err) {
    state.archive = { incidents: [], loadedAt: null, loading: false, lastError: { at: new Date().toISOString(), message: String(err.message || err) } };
  }
  return state;
}

/** Resolve an incident id through aliases; looks in the archive too if it's loaded. */
export function resolveIncident(state, id) {
  let cur = id;
  for (let i = 0; i < 5 && state.aliases[cur]; i++) cur = state.aliases[cur];
  return state.incidents.find((x) => x.id === cur) || (state.archive?.incidents || []).find((x) => x.id === cur) || null;
}

/** Freshness lines for the stamp, localized through T (an i18n lookup). Returns [{ label, detail, ok }]. */
export function freshnessLines(state, T, now = new Date(), locale = undefined) {
  const age = (iso) => {
    if (!iso) return null;
    const h = (now - new Date(iso)) / 3600000;
    if (h < 1) return T.ago_min(Math.max(1, Math.round(h * 60)));
    if (h < 36) return T.ago_h(Math.round(h));
    return T.ago_d(Math.round(h / 24));
  };
  const day = (iso) => (iso ? new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString(locale, { month: 'short', day: 'numeric' }) : null);
  const s = state.sources || {};
  const lines = [];

  // FDA line: corpus through date, press releases, live check.
  const fda = s.fda_enforcement;
  const rss = s.fda_rss;
  const live = s.fda_live;
  const fdaParts = [];
  let fdaOk = true;
  if (fda?.dataThroughDate) fdaParts.push(T.fr_dataThrough(day(fda.dataThroughDate)));
  else if (!state.snapshot.ok) { fdaParts.push(T.fr_noSaved); fdaOk = false; }
  if (live?.fetchedAt) fdaParts.push(T.fr_liveCheck(age(live.fetchedAt)));
  else if (live?.lastError) { fdaParts.push(T.fr_liveFailed(live.lastError.message)); fdaOk = false; }
  if (rss?.lastError) { fdaParts.push(T.fr_pressFailed(age(rss.lastError.at))); fdaOk = false; }
  else if (rss?.fetchedAt) fdaParts.push(T.fr_press(age(rss.fetchedAt)));
  lines.push({ id: 'fda', label: T.src_fda, detail: fdaParts.join(' · '), ok: fdaOk });

  const fsis = s.fsis_recall;
  if (fsis?.live) lines.push({ id: 'usda', label: T.src_usda, detail: T.fr_liveCheck(age(fsis.fetchedAt)), ok: true });
  else if (fsis?.liveError && fsis?.fetchedAt) lines.push({ id: 'usda', label: T.src_usda, detail: T.fr_liveFailedSnap(age(fsis.fetchedAt)), ok: false });
  else if (fsis?.lastError) lines.push({ id: 'usda', label: T.src_usda, detail: `${T.fr_failed(age(fsis.lastError.at))}${fsis.dataThroughDate ? T.fr_showThrough(day(fsis.dataThroughDate)) : ''}`, ok: false });
  else if (fsis?.fetchedAt) lines.push({ id: 'usda', label: T.src_usda, detail: T.fr_snapshot(age(fsis.fetchedAt)), ok: true });
  else lines.push({ id: 'usda', label: T.src_usda, detail: T.fr_unavail, ok: false });
  const core = s.fda_core;
  if (core?.lastError) lines.push({ id: 'core', label: T.src_core, detail: `${T.fr_failed(age(core.lastError.at))}${core.dataThroughDate ? T.fr_showThrough(day(core.dataThroughDate)) : ''}`, ok: false });
  else if (core?.fetchedAt) {
    const stale = core.dataThroughDate && (now - new Date(core.dataThroughDate + 'T12:00:00Z')) / 86400000 > 14;
    lines.push({ id: 'core', label: T.src_core, detail: core.dataThroughDate ? `${T.fr_table(day(core.dataThroughDate))}${stale ? T.fr_stale : ''} · ${T.fr_fetched(age(core.fetchedAt))}` : T.fr_noPageDate(age(core.fetchedAt)), ok: !stale });
  }
  const cdc = s.cdc_outbreaks;
  if (cdc?.lastError) lines.push({ id: 'cdc', label: T.src_cdc, detail: T.fr_failed(age(cdc.lastError.at)), ok: false });
  else if (cdc?.dataThroughDate) lines.push({ id: 'cdc', label: T.src_cdc, detail: T.fr_counts(day(cdc.dataThroughDate)), ok: true });

  return lines;
}
