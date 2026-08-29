// match.js — "does this affect me". Pure functions over the Incident/Recall model.
// Rules: inputs reorder and label; they never remove an item from the list.
// Language: "This is recalled" only on a full UPC match. Everything else hedges.

import { STATES, toGtin14 } from './parse.js';
import { tokenizeMultilingual } from './foodwords.js';

// Display order. 'unclassified' (a press release the agency hasn't graded yet) sorts right
// after Class I: it was issued because the public needed to know now, and its severity is
// unknown, not low. It never displays as Class I — the badge says "not yet classified".
export const SEVERITY_RANK = { class_1: 5, alert: 4, unclassified: 3, class_2: 2, class_3: 1 };

// Relevance window. FDA leaves recalls "Ongoing" long after product has left shelves, so an open
// recall older than this is not shown on first paint; it stays searchable and is labeled as open.
export const CURRENT_DAYS = 180;
export function isCurrent(incident, now = new Date(), days = CURRENT_DAYS) {
  if (incident.status !== 'active') return false;
  const d = incident.lastNoticeDate || incident.firstInitiated;
  if (!d) return true; // undated but open: keep it visible rather than guess it away
  return (now - new Date(d + 'T12:00:00Z')) / 86400000 <= days;
}
const SCOPE_ORDER = { nationwide: 0, unknown: 1, international: 1, multi_state: 2, single_state: 3 };

export function normalizeStateInput(s) {
  if (!s) return null;
  const t = String(s).trim().toLowerCase();
  if (STATES[t]) return STATES[t];
  const up = t.toUpperCase();
  if (Object.values(STATES).includes(up)) return up;
  return null;
}

/** Lot codes: keep letters and digits, uppercase. "L-123 A" and "l123a" compare equal. */
export function normalizeLotInput(v) { return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

export function normalizeUpcInput(s) {
  return String(s || '').replace(/\D/g, '');
}

export function upcInputState(digits) {
  if (!digits) return 'empty';
  if (digits.length < 6) return 'too_short';
  if (digits.length < 12) return 'prefix';
  if (digits.length <= 14) return 'full';
  return 'too_long';
}

// Result-language table. Keyed by matchBasis. Sorted by rank (lower = shown first).
export const RESULT_LANGUAGE = {
  upc: { rank: 0, confidence: 'certain', headline: 'This is recalled', line: 'The barcode you entered matches this notice.' },
  upc_unverified: { rank: 1, confidence: 'likely', headline: 'May be recalled', line: "This matches a code in the notice, but the notice's code may contain a typo. Compare the brand too." },
  lot: { rank: 1, confidence: 'likely', headline: 'Matches a lot code in this notice', line: 'Lot numbers repeat across companies, so also compare the brand and package before deciding.' },
  state_and_product: { rank: 2, confidence: 'likely', headline: (ctx) => `Recalled in ${ctx.stateName} — check for this`, line: (ctx) => `The notice lists ${ctx.stateName}. Compare the code on your package.` },
  nationwide_and_product: { rank: 2, confidence: 'likely', headline: 'Recalled — check for this', line: 'Sold nationwide. Compare the code on your package.' },
  upc_prefix: { rank: 3, confidence: 'possible', headline: 'Same company has a recall', line: 'The first digits you entered match this company\u2019s barcode range, but not this exact product. Enter the full number, or compare the brand and size.' },
  product_guess: { rank: 4, confidence: 'possible', headline: (ctx) => `May match — ${ctx.token}`, line: (ctx) => `The notice mentions \u201c${ctx.token}\u201d. Compare against your package before deciding.` },
  state_only: { rank: 5, confidence: 'possible', headline: (ctx) => `Sold in ${ctx.stateName}`, line: 'Check whether you have this product.' },
  distribution_incomplete: { rank: 6, confidence: 'possible', headline: 'May affect you', line: (ctx) => ctx.stateCount ? `Sold in ${ctx.stateCount} states listed; we couldn\u2019t read the full list. Treat as possible.` : 'The notice doesn\u2019t say where this was sold.' },
  nationwide: { rank: 6, confidence: 'possible', headline: 'Sold nationwide', line: 'Check whether you have this product.' },
  other_state: { rank: 8, confidence: 'unlikely', headline: (ctx) => `Not listed for ${ctx.stateName}`, line: (ctx) => `The notice lists ${ctx.listed}. Still shown in case the list is incomplete.` },
  none: { rank: 7, confidence: null, headline: null, line: null },
};

function render(entry, key, ctx) {
  const v = entry[key];
  return typeof v === 'function' ? v(ctx) : v;
}

function stateName(code) {
  const name = Object.entries(STATES).find(([, c]) => c === code)?.[0] || code;
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

function listStates(codes) {
  if (codes.length <= 3) return codes.map(stateName).join(', ');
  return `${codes.slice(0, 3).map(stateName).join(', ')} and ${codes.length - 3} more`;
}

function tokenize(q) {
  // Multilingual: Spanish/Korean/Chinese food words expand to the English tokens notices use.
  // Returns { tokens, origin }; origin maps an expansion back to the typed word for display.
  return tokenizeMultilingual(q);
}

/**
 * Evaluate one incident against the inputs.
 * @returns { matchBasis, confidence, headline, line, rank, evidence }
 */
export function evaluate(incident, recalls, { state = null, query = '', upc = '', lot = '' } = {}) {
  const children = incident.recallIds.map((id) => recalls.get(id)).filter(Boolean);
  const digits = normalizeUpcInput(upc);
  const upcState = upcInputState(digits);
  const ctx = { stateName: state ? stateName(state) : null };

  // 1. Barcode paths
  if (upcState === 'full') {
    const g = toGtin14(digits);
    for (const c of children) for (const u of c.product.upcs) {
      if (u.gtin14 === g) {
        const basis = u.checkDigitValid ? 'upc' : 'upc_unverified';
        return out(basis, { ...ctx, upc: u.digits, recallId: c.id });
      }
    }
  }
  if (upcState === 'full' || upcState === 'prefix') {
    for (const c of children) for (const u of c.product.upcs) {
      // Compare against the code as printed (12/13/14 digits) and its GTIN-14 form, so a
      // person typing the leading digits off a UPC-A label matches without leading zeros.
      const forms = [u.digits, u.gtin14];
      if (digits.length >= 6 && forms.some((f) => f.startsWith(digits) && f !== digits) && !forms.includes(toGtin14(digits))) {
        // Prefix only; a full match would have returned above. Keep looking for a better path below.
        const prefixHit = out('upc_prefix', { ...ctx, recallId: c.id });
        const better = evaluateNonUpc(incident, children, state, query, ctx);
        return better.rank < prefixHit.rank ? better : prefixHit;
      }
    }
  }
  // Lot code: normalized equality with any lot the notices list, or containment once the person
  // has typed enough (≥6 chars) that a substring is meaningful. Likely, never certain — lot
  // numbers are per-company, not global.
  const lotTyped = normalizeLotInput(lot);
  if (lotTyped.length >= 4) {
    const lots = children.flatMap((c) => c.product.lotCodes || []).map(normalizeLotInput).filter(Boolean);
    const hit = lots.find((l) => l === lotTyped || (lotTyped.length >= 6 && (l.includes(lotTyped) || lotTyped.includes(l))));
    if (hit) return out('lot', { ...ctx, lot: hit });
  }
  return evaluateNonUpc(incident, children, state, query, ctx);
}

function evaluateNonUpc(incident, children, state, query, ctx) {
  const { tokens, origin } = tokenize(query);
  // Product token match against raw description, brand guesses, category, title.
  let productHit = null;
  let productRaw = false;
  if (tokens.length) {
    for (const c of children) {
      const hay = `${c.product.rawDescription} ${c.title} ${c.product.brandGuesses.join(' ')}`.toLowerCase();
      const hit = tokens.find((t) => hay.includes(t));
      if (hit) {
        productHit = hit;
        productRaw = c.product.rawDescription.toLowerCase().includes(hit);
        break;
      }
    }
    if (!productHit) {
      const cat = incident.title.toLowerCase();
      const hit = tokens.find((t) => cat.includes(t));
      if (hit) { productHit = hit; productRaw = false; }
    }
  }

  const listsState = state && incident.statesUnion.includes(state);
  const nationwide = incident.scope === 'nationwide';
  const incomplete = incident.distributionIncomplete || incident.scope === 'unknown' || incident.scope === 'international';

  if (productHit && productRaw && listsState) return out('state_and_product', ctx);
  if (productHit && productRaw && nationwide) return out('nationwide_and_product', ctx);
  if (productHit) return out('product_guess', { ...ctx, token: origin[productHit] || productHit });
  if (state) {
    if (listsState) return out('state_only', ctx);
    if (nationwide) return out('nationwide', ctx);
    if (incomplete) return out('distribution_incomplete', { ...ctx, stateCount: incident.statesUnion.length });
    return out('other_state', { ...ctx, listed: listStates(incident.statesUnion) });
  }
  // Zero input, or a query with no hit: no match headline. Scope ordering and the card's
  // own scope label ("Where sold: not listed") carry the information instead.
  return out('none', ctx);
}

function out(basis, ctx) {
  const e = RESULT_LANGUAGE[basis];
  return { matchBasis: basis, confidence: e.confidence, headline: render(e, 'headline', ctx), line: render(e, 'line', ctx), rank: e.rank, evidence: ctx };
}

/**
 * Order the full incident list for display. Never filters.
 * Sort: match rank → severity → scope breadth → newest.
 */
export function orderIncidents(incidents, recalls, inputs) {
  const rows = incidents.map((inc) => ({ incident: inc, match: evaluate(inc, recalls, inputs) }));
  // Tiers: product/barcode matches (rank ≤ 4) outrank everything; geography-only matches
  // (state listed / nationwide / unknown, ranks 5–7) collapse into ONE tier so severity bands stay
  // intact — a Class I sold nationwide never sits below a Class II that happens to list your state.
  // Within a band, your state's items come first (original rank), then scope breadth, then newest.
  const tier = (r) => (r <= 4 ? r : r === 8 ? 8 : 5);
  rows.sort((a, b) =>
    tier(a.match.rank) - tier(b.match.rank) ||
    SEVERITY_RANK[b.incident.severity] - SEVERITY_RANK[a.incident.severity] ||
    a.match.rank - b.match.rank ||
    SCOPE_ORDER[a.incident.scope] - SCOPE_ORDER[b.incident.scope] ||
    String(b.incident.lastUpdated).localeCompare(String(a.incident.lastUpdated)));
  return rows;
}

export function scopeLabel(incident) {
  switch (incident.scope) {
    case 'nationwide': return 'Sold nationwide';
    case 'single_state': return `Sold in ${stateName(incident.statesUnion[0])} only`;
    case 'multi_state': return `Sold in ${incident.statesUnion.length} states`;
    case 'international': return 'Sold outside the US; US sales not listed';
    default: return 'Where sold: not listed';
  }
}

export { stateName };
