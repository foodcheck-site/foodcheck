#!/usr/bin/env node
// build-snapshot.mjs — runs on a schedule (GitHub Action, cron, anything with Node ≥ 18).
// Owns: the full openFDA corpus (keyed, date-sliced, paginated under the 26k ceiling),
// FSIS Recall API, FDA Recalls RSS, FDA CORE outbreak table, CDC outbreak notices,
// reconciliation, first-seen ids, aliases, review queue, citation link check.
// Writes data/snapshot.json. The SPA reads it in one request.
//
//   node build/build-snapshot.mjs                 # live fetch, needs OPENFDA_API_KEY for backfill
//   node build/build-snapshot.mjs --fixture       # offline: uses test/fixtures/raw.json
//   node build/build-snapshot.mjs --since 2024-01-01   # corpus start date (default: 18 months back)
//
// Every source is wrapped: a failure records sources[id].lastError and keeps the previous
// snapshot's records for that source, so one broken feed never empties the file.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromOpenFda, fromFsis, fromRss, toOutbreak } from '../src/data/normalize.js';
import { carryFirstSeen, absorbProvisionals, groupIncidents, linkOutbreaks, buildReviewQueue } from '../src/data/reconcile.js';
import { parseRss, scrapeTable, scrapeCdcCounts, pageDate } from './scrape.js';
import { extractConsumerInstruction, stripHtml } from '../src/data/parse.js';
import { isCurrent, CURRENT_DAYS } from '../src/data/match.js';
import { computeParseHealth, checkDrift } from './health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'snapshot.json');
const ARCHIVE_OUT = path.join(ROOT, 'data', 'archive.json');
const args = process.argv.slice(2);
const FIXTURE = args.includes('--fixture');
const SINCE = (() => { const i = args.indexOf('--since'); if (i >= 0) return args[i + 1]; const d = new Date(); d.setMonth(d.getMonth() - 18); return d.toISOString().slice(0, 10); })();
const NOW = new Date().toISOString();
const KEY = process.env.OPENFDA_API_KEY || null;
const CURRENT = (() => { const i = args.indexOf('--current-days'); return i >= 0 ? Number(args[i + 1]) : CURRENT_DAYS; })();

// CORS probe results (build/probe-cors.html, run 2026-08-25 from a Windows 11 browser):
//   openFDA yes · FSIS Recall API yes · FDA RSS no · FDA CORE no · CDC: HTML, snapshot-only by design
const PROBE = { fda_enforcement: true, fsis_recall: true, fda_rss: false, fda_core: false, cdc_outbreaks: false };
// FSIS allows browser fetch, but its only endpoint returns the full 13 MB archive, so the SPA does not
// fetch it live (see src/data/live.js FSIS_LIVE). browserFetchable stays true as a statement of fact.

// Endpoints. Only confirmed URLs are set; FSIS_MPI stays null until you confirm the
// directory JSON path — the build skips it when null rather than guessing.
const ENDPOINTS = {
  openfda: 'https://api.fda.gov/food/enforcement.json',
  fsis_recall: 'https://www.fsis.usda.gov/fsis/api/recall/v/1',
  fsis_mpi: process.env.FSIS_MPI_URL || null,
  fda_rss: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml',
  fda_core: 'https://www.fda.gov/food/foodborne-pathogens/investigations-foodborne-illness-outbreaks',
  cdc_outbreaks: 'https://www.cdc.gov/foodborne-outbreaks/outbreaks/index.html',
};

const log = (...a) => console.error(`[snapshot] ${a.join(' ')}`);
const sources = {};
function ok(id, extra = {}) { sources[id] = { fetchedAt: NOW, lastError: null, ...extra }; }
function fail(id, err, extra = {}) {
  sources[id] = { fetchedAt: null, lastError: { at: NOW, message: String(err?.message || err), httpStatus: err?.status ?? null }, ...extra };
  log(`${id} FAILED: ${sources[id].lastError.message}`);
}

async function get(url, { json = false, headers = {} } = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': 'foodcheck-snapshot (public-interest recall tracker)', ...headers } });
  if (!res.ok) { const e = new Error(`HTTP ${res.status} ${res.statusText}`); e.status = res.status; throw e; }
  return json ? res.json() : res.text();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- previous snapshot ----------
let prev = { recalls: [], incidents: [], outbreaks: [], sources: {} };
if (existsSync(OUT)) {
  try {
    prev = JSON.parse(await readFile(OUT, 'utf8'));
    if (prev.fixture && !FIXTURE) { log('previous snapshot was sample data; not carrying anything forward'); prev = { recalls: [], incidents: [], outbreaks: [], sources: {} }; }
    else {
      // The archive holds closed recalls; their firstSeenAt must carry forward too.
      if (existsSync(ARCHIVE_OUT)) { try { const a = JSON.parse(await readFile(ARCHIVE_OUT, 'utf8')); prev.recalls.push(...(a.recalls || [])); prev.incidents.push(...(a.incidents || [])); } catch { /* ignore a bad archive */ } }
      log(`previous snapshot: ${prev.recalls.length} recalls, ${prev.incidents.length} incidents (snapshot + archive)`);
    }
  }
  catch (e) { log(`previous snapshot unreadable (${e.message}); starting clean`); }
}
const prevBySource = (id) => prev.recalls.filter((r) => r.source === id);

// ---------- fixture ----------
let fixture = null;
if (FIXTURE) {
  fixture = JSON.parse(await readFile(path.join(ROOT, 'test', 'fixtures', 'raw.json'), 'utf8'));
  log('FIXTURE mode: no network');
}

// ---------- openFDA backfill ----------
async function fetchOpenFda() {
  if (FIXTURE) return fixture.openfda;
  const out = [];
  const key = KEY ? `&api_key=${KEY}` : '';
  if (!KEY) log('no OPENFDA_API_KEY — backfill will run keyless at 1,000 req/day; fine for small windows only');
  const yyyymmdd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  let start = new Date(SINCE);
  const end = new Date();
  let requests = 0;
  // Start with 90-day slices; halve any slice whose total exceeds 25,000 (the skip ceiling).
  let sliceDays = 90;
  while (start < end) {
    const stop = new Date(Math.min(end, start.getTime() + sliceDays * 86400000));
    const range = `report_date:[${yyyymmdd(start)}+TO+${yyyymmdd(stop)}]`;
    const head = await fetchCount(range);
    requests++;
    if (head.total > 25000 && sliceDays > 1) { sliceDays = Math.max(1, Math.floor(sliceDays / 2)); log(`slice too big (${head.total}); halving to ${sliceDays} days`); continue; }
    let skip = 0;
    while (skip < head.total) {
      const url = `${ENDPOINTS.openfda}?search=${range}&limit=1000&skip=${skip}${key}`;
      let json;
      try { json = await get(url, { json: true }); }
      catch (e) { if (e.status === 404) break; if (e.status === 429) { log('429; sleeping 60s'); await sleep(60000); continue; } throw e; }
      requests++;
      out.push(...(json.results || []));
      skip += 1000;
      await sleep(260); // stay under 240/min
    }
    start = new Date(stop.getTime() + 86400000);
  }
  log(`openFDA: ${out.length} records in ${requests} requests`);
  async function fetchCount(range) {
    try { const j = await get(`${ENDPOINTS.openfda}?search=${range}&limit=1${key}`, { json: true }); return { total: j.meta?.results?.total ?? 0, lastUpdated: j.meta?.last_updated }; }
    catch (e) { if (e.status === 404) return { total: 0 }; throw e; }
  }
  return out;
}

// ---------- FSIS ----------
async function fetchFsis() {
  if (FIXTURE) return fixture.fsis;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const json = await get(ENDPOINTS.fsis_recall, { json: true, headers: { Accept: 'application/json' } });
      return Array.isArray(json) ? json : json.data || json.results || [];
    } catch (e) {
      lastError = e;
      if (e.status === 403 && attempt < 3) {
        const delay = Math.pow(2, attempt) * 10000; // 20s, 40s
        log(`FSIS 403; retrying in ${delay/1000}s (attempt ${attempt+1}/3)`);
        await sleep(delay);
      } else throw e;
    }
  }
  throw lastError;
}

async function fetchRss() {
  if (FIXTURE) return fixture.rss;
  return parseRss(await get(ENDPOINTS.fda_rss));
}

async function fetchCdcCounts() { if (FIXTURE) return fixture.cdcCounts; return scrapeCdcCounts(await get(ENDPOINTS.cdc_outbreaks)); }

async function fetchCore() {
  if (FIXTURE) return { rows: fixture.core, pageDate: '2026-08-20' };
  const html = await get(ENDPOINTS.fda_core);
  const rows = scrapeTable(html, ENDPOINTS.fda_core);
  if (!rows.length) throw new Error('scrape returned 0 rows — page structure may have changed');
  const dated = pageDate(html);
  for (const r of rows) r.pageDate = dated;
  return { rows, pageDate: dated };
}

// ---------- run all sources, isolated ----------
let recalls = [];
let outbreaks = [];

async function stage(id, fn, onOk) {
  try { const data = await fn(); onOk(data); }
  catch (e) {
    const kept = prevBySource(id);
    fail(id, e, { dataThroughDate: prev.sources?.[id]?.dataThroughDate ?? null, recordCount: kept.length, keptFromPrevious: true });
    recalls.push(...kept);
  }
}

await stage('fda_enforcement', fetchOpenFda, (raw) => {
  const rs = raw.map((r) => fromOpenFda(r, NOW));
  recalls.push(...rs);
  const through = rs.map((r) => r.publishedDate).filter(Boolean).sort().slice(-1)[0] || null;
  ok('fda_enforcement', { dataThroughDate: through, recordCount: rs.length, browserFetchable: PROBE.fda_enforcement });
});
await stage('fsis_recall', fetchFsis, (raw) => {
  // USDA publishes official Spanish translations as separate rows with the same recall number.
  // Attach them so Spanish users see USDA's own words, not a machine translation.
  const spanish = new Map();
  for (const row of raw) {
    if (/^es|spanish/i.test(String(row.langcode || ''))) {
      const num = String(row.field_recall_number || '').trim();
      if (num) spanish.set(num, row);
    }
  }
  // The API returns the whole archive since 2014 (~13 MB, English + Spanish). Keep English rows that are
  // active, a public health alert, or dated within the corpus window; the rest never reach the snapshot.
  const rs = raw.map((r) => fromFsis(r, NOW)).filter((r) => r && r.nativeId)
    .filter((r) => r.status === 'ongoing' || (r.publishedDate && r.publishedDate >= SINCE));
  let esCount = 0;
  for (const r of rs) {
    const esRow = spanish.get(r.nativeId);
    if (!esRow) continue;
    const esInstr = extractConsumerInstruction(esRow.field_summary || '');
    r.es = {
      title: stripHtml(esRow.field_title || '').slice(0, 140) || null,
      instruction: esInstr.extracted ? esInstr.text : null,
      sourceUrl: esRow.field_recall_url ? (String(esRow.field_recall_url).startsWith('http') ? String(esRow.field_recall_url).replace(/^http:/, 'https:') : `https://www.fsis.usda.gov${esRow.field_recall_url}`) : null,
    };
    esCount++;
  }
  log(`FSIS: ${raw.length} rows in response → ${rs.length} kept (English, active or since ${SINCE}); official Spanish attached to ${esCount}`);
  recalls.push(...rs);
  ok('fsis_recall', { dataThroughDate: rs.map((r) => r.publishedDate).filter(Boolean).sort().slice(-1)[0] || null, recordCount: rs.length, browserFetchable: PROBE.fsis_recall });
});
await stage('fda_rss', fetchRss, (items) => {
  const rs = items.map((i) => fromRss(i, NOW));
  recalls.push(...rs);
  ok('fda_rss', { dataThroughDate: rs.map((r) => r.publishedDate).filter(Boolean).sort().slice(-1)[0] || null, recordCount: rs.length, browserFetchable: PROBE.fda_rss });
});
if (ENDPOINTS.fsis_mpi) {
  try { await get(ENDPOINTS.fsis_mpi); ok('fsis_mpi', { note: 'fetched; establishment enrichment not wired in v1' }); } catch (e) { fail('fsis_mpi', e); }
} else {
  sources.fsis_mpi = { fetchedAt: null, lastError: null, skipped: 'FSIS_MPI_URL not set (optional: fills in missing company names; USDA notices almost always include them)' };
}
let cdcCounts = prev.cdcCounts || null;
try { cdcCounts = await fetchCdcCounts(); ok('cdc_outbreaks', { dataThroughDate: cdcCounts.lastUpdated, recordCount: Object.keys(cdcCounts.byAgent).length, browserFetchable: 'no' }); }
catch (e) { fail('cdc_outbreaks', e, { dataThroughDate: prev.sources?.cdc_outbreaks?.dataThroughDate ?? null, keptFromPrevious: !!cdcCounts, browserFetchable: 'no' }); }
for (const [id, fn] of [['fda_core', fetchCore]]) {
  try {
    const { rows, pageDate: dated } = await fn();
    const obs = rows.map((r) => toOutbreak(r, id, NOW)).filter((o) => o.agent);
    outbreaks.push(...obs);
    // dataThroughDate is FDA's own "content current as of" date, not our fetch time.
    ok(id, { dataThroughDate: dated || null, pageDateFound: !!dated, recordCount: obs.length, browserFetchable: 'no' });
    log(`CORE: ${obs.length} investigations; page dated ${dated || 'unknown (no "content current as of" found)'}`);
  } catch (e) {
    const kept = (prev.outbreaks || []).filter((o) => o.source === id);
    outbreaks.push(...kept);
    fail(id, e, { dataThroughDate: prev.sources?.[id]?.dataThroughDate ?? null, recordCount: kept.length, keptFromPrevious: true, browserFetchable: 'no' });
  }
}

// ---------- reconcile ----------
const carried = carryFirstSeen(recalls, prev.recalls);
log(`firstSeenAt carried forward for ${carried} of ${recalls.length} recalls`);
recalls = absorbProvisionals(recalls);
const tokens = JSON.parse(await readFile(path.join(__dirname, 'ingredient-tokens.json'), 'utf8')).tokens;
const { incidents, aliases } = groupIncidents(recalls, outbreaks, tokens, prev.incidents || []);
linkOutbreaks(incidents, outbreaks);
const reviewQueue = buildReviewQueue(incidents, recalls, tokens, NOW);
log(`${recalls.length} recalls → ${incidents.length} incidents; ${Object.keys(aliases).length} new aliases; ${reviewQueue.length} review-queue entries`);
for (const q of reviewQueue) log(`  review: ${q.agent} ${q.windowStart}→${q.windowEnd} (${q.incidentIds.length} incidents) candidates: ${q.candidateTokens.map((c) => c.token).join(', ') || 'none'}`);

// ---------- citations: link check ----------
const guidance = JSON.parse(await readFile(path.join(__dirname, 'hazard-guidance.json'), 'utf8'));
for (const [k, block] of Object.entries(guidance)) {
  if (k.startsWith('_') || !block?.citation?.url) continue;
  if (FIXTURE) { block.citation.lastReachableAt = prev.hazardGuidance?.[k]?.citation?.lastReachableAt ?? '2026-08-20T00:00:00.000Z'; continue; }
  // CDC and FDA answer 403 to bare HEAD requests from scripts. Use a browser-like GET, and record a
  // 403 as "blocked" — a check that couldn't run — never as a dead link.
  try {
    const res = await fetch(block.citation.url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) foodcheck-linkcheck', Accept: 'text/html' } });
    block.citation.lastCheckStatus = res.status;
    if (res.ok) block.citation.lastReachableAt = NOW;
    else if (res.status === 403 || res.status === 429) { block.citation.lastReachableAt = prev.hazardGuidance?.[k]?.citation?.lastReachableAt ?? null; log(`citation ${k}: check blocked (${res.status}); not treating as dead`); }
    else { block.citation.lastReachableAt = prev.hazardGuidance?.[k]?.citation?.lastReachableAt ?? null; log(`citation ${k} returned ${res.status}`); }
  } catch (e) { log(`citation ${k} unreachable: ${e.message}`); block.citation.lastCheckStatus = null; block.citation.lastReachableAt = prev.hazardGuidance?.[k]?.citation?.lastReachableAt ?? null; }
}

// ---------- parse health + drift gate ----------
// Compute extraction rates and compare with the previous build. On drift: keep the previous
// snapshot on disk, print what moved, and exit non-zero so the GitHub Action turns red.
const parseHealth = computeParseHealth(recalls);
for (const [src, m] of Object.entries(parseHealth)) log(`health ${src}: ${Object.entries(m).map(([k, x]) => `${k}=${x ?? '—'}`).join(' ')}`);
if (!FIXTURE) {
  const violations = checkDrift(parseHealth, prev.parseHealth);
  if (violations.length && !args.includes('--force')) {
    for (const v of violations) log(`DRIFT: ${v}`);
    log('Refusing to overwrite the previous snapshot with degraded data. If this change is expected (or this is a deliberate parser change), rerun with --force. Otherwise the parser needs updating for the new format.');
    process.exit(1);
  }
  if (violations.length) for (const v of violations) log(`DRIFT (forced through): ${v}`);
}

// ---------- trim + split ----------
// The page needs only active incidents to paint. Closed ones go to archive.json, fetched on demand
// when someone types a barcode or product. Long raw fields are cut; the UI never shows more.
const cut = (t, n) => (typeof t === 'string' && t.length > n ? t.slice(0, n - 1) + '…' : t);
for (const r of recalls) {
  r.hazard.rawReason = cut(r.hazard.rawReason, 320);
  r.distribution.rawPattern = cut(r.distribution.rawPattern, 320);
  r.product.rawDescription = cut(r.product.rawDescription, 320);
  r.product.codeInfoRaw = cut(r.product.codeInfoRaw, 320);
  if (r.consumerInstruction?.text) r.consumerInstruction.text = cut(r.consumerInstruction.text, 480);
}
// Three buckets: current (open, announced within CURRENT days) → snapshot; older-open and closed → archive.
const nowDate = new Date(NOW);
const currentIncidents = incidents.filter((i) => isCurrent(i, nowDate, CURRENT));
const olderOpenIncidents = incidents.filter((i) => i.status === 'active' && !isCurrent(i, nowDate, CURRENT));
const closedIncidents = incidents.filter((i) => i.status !== 'active');
const currentIds = new Set(currentIncidents.flatMap((i) => i.recallIds));
const activeRecalls = recalls.filter((r) => currentIds.has(r.id));
const closedRecalls = recalls.filter((r) => !currentIds.has(r.id));
log(`incidents: ${currentIncidents.length} current, ${olderOpenIncidents.length} open but older than ${CURRENT} days, ${closedIncidents.length} closed`);

const allAliases = { ...(prev.aliases || {}), ...aliases };
const common = { schemaVersion: 3, generatedAt: NOW, fixture: FIXTURE };
const snapshot = {
  ...common,
  parseHealth,
  sources,
  recalls: activeRecalls,
  incidents: currentIncidents,
  currentDays: CURRENT,
  outbreaks,
  cdcCounts,
  aliases: allAliases,
  ingredientTokens: tokens,
  reviewQueue,
  hazardGuidance: guidance,
  archive: { file: 'archive.json', recalls: closedRecalls.length, incidents: closedIncidents.length + olderOpenIncidents.length, olderOpen: olderOpenIncidents.length, closed: closedIncidents.length },
};
const archive = { ...common, recalls: closedRecalls, incidents: [...olderOpenIncidents, ...closedIncidents] };
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(snapshot));
await writeFile(ARCHIVE_OUT, JSON.stringify(archive));
log(`wrote ${OUT} (${(JSON.stringify(snapshot).length / 1024).toFixed(0)} KB, ${currentIncidents.length} current incidents) and archive.json (${(JSON.stringify(archive).length / 1024).toFixed(0)} KB, ${olderOpenIncidents.length} older-open + ${closedIncidents.length} closed)`);
