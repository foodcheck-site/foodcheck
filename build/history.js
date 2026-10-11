// history.js — what FDA's outbreak table said each time we looked.
//
// The snapshot holds only today's case count per outbreak; every build overwrites it. This file
// keeps the observations so a page can say "12 on Jan 3 → 34 on Jan 19 → 41 on Feb 2". It records
// what the agency published on the dates we checked — nothing is interpolated, nothing is estimated.
//
// Rules (each is load-bearing):
//  1. Append only when something changed (cases, hospitalizations, deaths, status). Hourly builds
//     that see the same numbers add nothing, so the file stays small.
//  2. Never touch history on a run where FDA CORE failed. The outbreaks in that build are copies
//     from the previous snapshot; recording them as "seen today" would fabricate an observation.
//     The caller enforces this (build-snapshot.mjs); updateHistory itself is pure.
//  3. An outbreak that drops off FDA's page keeps its history. It may return, and a closed
//     investigation's last observation is still true.
//  4. Fixture data never reaches data/history.json.
//
// Shape of data/history.json:
// {
//   schemaVersion: 1, generatedAt,
//   outbreaks: { [outbreakId]: [ { seen, agencyDate, cases, hospitalizations, deaths, status }, ... ] },
//   health:    { [yyyy-mm-dd]: { fda: [hazardPct, statesPct, codesPct], fsis: [hazardPct, statesPct, instructionPct] } }
// }
//   seen        — build time we observed this value (ISO datetime)
//   agencyDate  — the row's own "date posted / updated" when FDA printed one, else null
//   cases etc.  — numbers as parsed (null = FDA printed "see advisory" or nothing numeric)

export const HISTORY_SCHEMA = 1;
const MAX_ENTRIES_PER_OUTBREAK = 120;
const MAX_HEALTH_DAYS = 400;

export function emptyHistory() {
  return { schemaVersion: HISTORY_SCHEMA, generatedAt: null, outbreaks: {}, health: {} };
}

/** Accept a parsed history file; return a well-formed one (or empty on anything unreadable). */
export function normalizeHistory(h) {
  if (!h || typeof h !== 'object' || h.fixture) return emptyHistory();
  return {
    schemaVersion: HISTORY_SCHEMA,
    generatedAt: h.generatedAt || null,
    outbreaks: h.outbreaks && typeof h.outbreaks === 'object' ? h.outbreaks : {},
    health: h.health && typeof h.health === 'object' ? h.health : {},
  };
}

const sameObservation = (a, b) =>
  a.cases === b.cases && a.hospitalizations === b.hospitalizations && a.deaths === b.deaths && a.status === b.status;

/**
 * Pure. Returns { history, appended: [outbreakId...] }. `prev` is never mutated.
 * @param prev       previous history (any shape; normalized here)
 * @param outbreaks  this build's outbreaks (normalized Outbreak objects)
 * @param now        ISO datetime of this build
 * @param parseHealth this build's parse-health block (optional) — recorded once per day, last write wins
 */
export function updateHistory(prev, outbreaks, now, parseHealth = null) {
  const base = normalizeHistory(prev);
  const out = { ...base, generatedAt: now, outbreaks: { ...base.outbreaks }, health: { ...base.health } };
  const appended = [];
  for (const o of outbreaks || []) {
    if (!o?.id) continue;
    const obs = {
      seen: now,
      agencyDate: o.lastUpdated || null,
      cases: numOrNull(o.cases),
      hospitalizations: numOrNull(o.hospitalizations),
      deaths: numOrNull(o.deaths),
      status: o.status === 'closed' ? 'closed' : 'active',
    };
    const list = out.outbreaks[o.id] ? out.outbreaks[o.id].slice() : [];
    const last = list[list.length - 1];
    if (last && sameObservation(last, obs)) continue;
    list.push(obs);
    if (list.length > MAX_ENTRIES_PER_OUTBREAK) list.splice(0, list.length - MAX_ENTRIES_PER_OUTBREAK);
    out.outbreaks[o.id] = list;
    appended.push(o.id);
  }
  if (parseHealth?.fda && parseHealth?.fsis) {
    const day = String(now).slice(0, 10);
    out.health[day] = {
      fda: [parseHealth.fda.hazardPct ?? null, parseHealth.fda.statesPct ?? null, parseHealth.fda.codesPct ?? null],
      fsis: [parseHealth.fsis.hazardPct ?? null, parseHealth.fsis.statesPct ?? null, parseHealth.fsis.instructionPct ?? null],
    };
    const days = Object.keys(out.health).sort();
    if (days.length > MAX_HEALTH_DAYS) for (const d of days.slice(0, days.length - MAX_HEALTH_DAYS)) delete out.health[d];
  }
  return { history: out, appended };
}

/** Summary for the snapshot so the SPA knows the file exists without loading it. */
export function historySummary(history) {
  const ids = Object.keys(history?.outbreaks || {});
  let since = null;
  for (const id of ids) { const first = history.outbreaks[id][0]?.seen; if (first && (!since || first < since)) since = first; }
  return { file: 'history.json', outbreaksTracked: ids.length, since };
}

function numOrNull(v) { return typeof v === 'number' && Number.isFinite(v) ? v : null; }
