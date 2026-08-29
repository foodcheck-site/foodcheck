// health.js — parse-health metrics and drift detection.
// FDA and FSIS change their formats without notice; when they do, parsers don't crash — they
// quietly extract less. These numbers make that visible, and the build FAILS (keeping the last
// good snapshot) instead of publishing a silently degraded one.

/** Percent (0–100) of records where fn(record) is truthy. */
const pct = (records, fn) => (records.length ? Math.round((records.filter(fn).length / records.length) * 100) : null);

/** Compute parse-health per source from normalized recalls. */
export function computeParseHealth(recalls) {
  const by = (src) => recalls.filter((r) => r.source === src);
  const fda = by('fda_enforcement');
  const fsis = by('fsis_recall');
  const rss = by('fda_rss');
  const hazardKnown = (r) => r.hazard.agent || (r.hazard.type && r.hazard.type !== 'unknown');
  const hasWhere = (r) => r.distribution.scope === 'nationwide' || r.distribution.scope === 'international' || (r.distribution.states || []).length > 0;
  const hasCodes = (r) => (r.product.upcs || []).length > 0 || (r.product.lotCodes || []).length > 0;
  return {
    fda: { n: fda.length, hazardPct: pct(fda, hazardKnown), statesPct: pct(fda, hasWhere), codesPct: pct(fda, hasCodes) },
    fsis: { n: fsis.length, hazardPct: pct(fsis, hazardKnown), statesPct: pct(fsis, hasWhere), instructionPct: pct(fsis, (r) => r.consumerInstruction?.extracted) },
    rss: { n: rss.length, titlePct: pct(rss, (r) => (r.title || '').length > 10) },
  };
}

// Absolute floors: below these, something structural broke regardless of history.
const FLOORS = [
  ['fda', 'hazardPct', 55], ['fda', 'statesPct', 45], ['fda', 'codesPct', 20],
  ['fsis', 'hazardPct', 55], ['fsis', 'statesPct', 45], ['fsis', 'instructionPct', 55],
];
// Relative rule: a metric falling this many points below the previous build is drift even if
// still above its floor.
const MAX_DROP = 18;
// Metrics only mean something with enough records behind them.
const MIN_N = 40;

/**
 * Compare current health to previous. Returns a list of violation strings; empty = healthy.
 * prev may be null/undefined (first build): only floors apply.
 */
export function checkDrift(health, prev) {
  const v = [];
  for (const [src, key, floor] of FLOORS) {
    const cur = health[src];
    if (!cur || cur.n < MIN_N || cur[key] == null) continue;
    if (cur[key] < floor) v.push(`${src}.${key} = ${cur[key]}% is below the ${floor}% floor (${cur.n} records) — the ${src} format may have changed`);
    const was = prev?.[src];
    if (was && was.n >= MIN_N && was[key] != null && was[key] - cur[key] > MAX_DROP) {
      v.push(`${src}.${key} dropped ${was[key]}% → ${cur[key]}% (more than ${MAX_DROP} points) — the ${src} format may have changed`);
    }
  }
  return v;
}
