// reconcile.js — group Recall records into Incidents.
// Layers (first match wins, confidence recorded):
//   0  same fdaEventId                                  certain
//   1  same firm.key + same hazard.agent, ±14 days     certain
//   2  same hazard.agent + shared ingredient token, ±21 days   likely
//   3  same hazard.agent + overlapping active Outbreak  possible
// Hard rules: never merge different agents; never across >45 days; never when either
// side's hazard confidence is low (those get a cross-link, not a merge).
// Incident id = 'inc-' + id of the child with the smallest firstSeenAt (tiebreak: string
// sort of recall ids). firstSeenAt is assigned at ingest and carried forward, so the id
// cannot change when a late-classified record with an earlier initiatedDate joins.

import { parseCategory, ALLERGEN_LABEL } from './parse.js';

const DAY = 86400000;

function days(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(new Date(a) - new Date(b)) / DAY;
}

function anchorDate(r) {
  return r.initiatedDate || r.publishedDate || null;
}

function foodMatches(outbreak, recall) {
  const food = (outbreak.foodGuess || '').toLowerCase();
  if (!food) return false;
  if (parseCategory(food) !== 'other' && parseCategory(food) === recall.product.categoryGuess) return true;
  const words = new Set(food.match(/[a-z]{4,}/g) || []);
  const hay = `${recall.product.rawDescription} ${recall.title}`.toLowerCase();
  for (const w of words) if (hay.includes(w.replace(/s$/, ''))) return true;
  return false;
}

export function ingredientTokensIn(text, tokenList) {
  const t = (text || '').toLowerCase();
  return tokenList.filter((tok) => new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i').test(t));
}

/** Carry firstSeenAt forward from the previous snapshot. Mutates recalls in place. */
export function carryFirstSeen(recalls, previousRecalls = []) {
  const prev = new Map(previousRecalls.map((r) => [r.id, r.firstSeenAt]));
  let carried = 0;
  for (const r of recalls) {
    const seen = prev.get(r.id);
    if (seen) { r.firstSeenAt = seen; carried++; }
  }
  return carried;
}

/**
 * RSS press releases arrive weeks before openFDA classifies them. When an openFDA record
 * matches a provisional RSS record on firm + product tokens + date, the openFDA record
 * absorbs it and inherits the earlier publishedDate and firstSeenAt.
 */
export function absorbProvisionals(recalls) {
  const provisional = recalls.filter((r) => r.source === 'fda_rss');
  const classified = recalls.filter((r) => r.source === 'fda_enforcement');
  const absorbed = new Set();
  const tokens = (r) => new Set((r.product.rawDescription + ' ' + r.title).toLowerCase().match(/[a-z]{4,}/g) || []);

  for (const p of provisional) {
    if (!p.firm.key) continue;
    const pt = tokens(p);
    const match = classified.find((c) => {
      if (c.firm.key !== p.firm.key) return false;
      if (days(anchorDate(c), anchorDate(p)) > 30) return false;
      let shared = 0;
      for (const t of tokens(c)) if (pt.has(t)) shared++;
      return shared >= 2;
    });
    if (match) {
      absorbed.add(p.id);
      match.absorbedProvisionalId = p.id;
      if (p.publishedDate && (!match.publishedDate || p.publishedDate < match.publishedDate)) match.pressPublishedDate = p.publishedDate;
      if (p.firstSeenAt && p.firstSeenAt < match.firstSeenAt) match.firstSeenAt = p.firstSeenAt;
      if (!match.sourceUrl && p.sourceUrl) match.sourceUrl = p.sourceUrl;
      if (!match.consumerInstruction.extracted && p.consumerInstruction.extracted) {
        match.consumerInstruction = { ...p.consumerInstruction };
        match.disposalAction = p.disposalAction;
        match.parseFlags = match.parseFlags.filter((f) => f !== 'instruction_generated');
      }
    }
  }
  return recalls.filter((r) => !absorbed.has(r.id));
}

const SEVERITY_RANK = { class_1: 4, alert: 3, class_2: 2, class_3: 1, unclassified: 0 };
const SCOPE_RANK = { nationwide: 4, unknown: 3, international: 3, multi_state: 2, single_state: 1 };

function humanAgent(agent, type) {
  if (!agent) return 'Unread hazard';
  const map = {
    listeria: 'Listeria', salmonella: 'Salmonella', e_coli: 'E. coli', botulism: 'Botulism risk',
    hepatitis_a: 'Hepatitis A', norovirus: 'Norovirus', cyclospora: 'Cyclospora', cronobacter: 'Cronobacter',
    clostridium: 'Clostridium', shigella: 'Shigella', staph: 'Staph', vibrio: 'Vibrio',
    foreign_material: 'Foreign material', chemical: 'Chemical contamination', labeling: 'Labeling error',
    uninspected: 'Uninspected product', processing_defect: 'Processing problem', unfit: 'Unfit to eat',
  };
  if (agent.startsWith('undeclared_')) {
    const a = agent.slice('undeclared_'.length);
    return a === 'unknown' ? 'Undeclared allergen' : `Undeclared ${ALLERGEN_LABEL[a] || a}`;
  }
  return map[agent] || (type ? type.replace('_', ' ') : 'Unread hazard');
}

const CATEGORY_LABEL = {
  leafy_greens: 'leafy greens', produce: 'produce', deli_meat: 'deli meat', meat_poultry: 'meat & poultry',
  seafood: 'seafood', dairy: 'dairy', eggs: 'eggs', infant: 'baby & infant food', frozen: 'frozen food',
  bakery: 'baked goods', snacks: 'snacks', packaged: 'packaged food', beverage: 'drinks', supplement: 'supplements', other: 'food',
};

function incidentTitle(children) {
  const lead = [...children].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0];
  let agent = humanAgent(lead.hazard.agent, lead.hazard.type);
  if (lead.hazard.allergens?.length > 1) agent = `Undeclared ${lead.hazard.allergens.map((a) => ALLERGEN_LABEL[a] || a).join(' and ')}`;
  const cats = new Set(children.map((c) => c.product.categoryGuess).filter((c) => c !== 'other'));
  const cat = cats.size === 1 ? CATEGORY_LABEL[[...cats][0]] : cats.size > 1 ? 'several foods' : CATEGORY_LABEL.other;
  const firms = new Set(children.map((c) => c.firm.raw).filter(Boolean));
  const phaOnly = children.every((c) => c.noticeType === 'public_health_alert');
  const who = firms.size === 1 ? [...firms][0] : firms.size > 1 ? 'multiple brands' : phaOnly ? 'USDA public health alert' : 'company not named';
  return `${agent} in ${cat} — ${who}`;
}

function buildIncident(children, confidence, reason, outbreaks) {
  const sorted = [...children].sort((a, b) => (a.firstSeenAt.localeCompare(b.firstSeenAt)) || a.id.localeCompare(b.id));
  const anchor = sorted[0];
  const states = new Set();
  let scope = 'single_state';
  let anyUnknown = false;
  for (const c of children) {
    for (const s of c.distribution.states) states.add(s);
    if (SCOPE_RANK[c.distribution.scope] > SCOPE_RANK[scope]) scope = c.distribution.scope;
    if (c.distribution.scope === 'unknown' || c.distribution.confidence === 'low') anyUnknown = true;
  }
  if (scope === 'single_state' && states.size > 1) scope = 'multi_state';
  const lead = [...children].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0];
  const dates = children.map(anchorDate).filter(Boolean).sort();
  // Same germ is not enough: without a food match, every Salmonella recall would inherit the case
  // count of every open Salmonella investigation. Same rule as grouping layer 3.
  const linked = outbreaks.filter((o) => o.agent && o.agent === lead.hazard.agent && o.status === 'active'
    && children.some((c) => foodMatches(o, c)));
  const firms = new Set(children.map((c) => c.firm.raw).filter(Boolean));
  const cats = new Set(children.map((c) => c.product.categoryGuess).filter((c) => c !== 'other'));
  return {
    id: `inc-${anchor.id}`,
    title: incidentTitle(children),
    // Structured parts so the UI can assemble the title in any language (firm names stay as-is).
    titleParts: {
      agent: lead.hazard.agent,
      hazardType: lead.hazard.type,
      allergens: lead.hazard.allergens || [],
      category: cats.size === 1 ? [...cats][0] : cats.size > 1 ? 'several' : 'other',
      who: firms.size === 1 ? [...firms][0] : null,
      whoKind: firms.size === 1 ? 'firm' : firms.size > 1 ? 'multiple' : children.every((c) => c.noticeType === 'public_health_alert') ? 'pha' : 'unknown',
    },
    severity: lead.severity,
    hazardType: lead.hazard.type,
    agent: lead.hazard.agent,
    agentLabel: humanAgent(lead.hazard.agent, lead.hazard.type),
    recallIds: children.map((c) => c.id),
    agencies: [...new Set(children.map((c) => c.agency))].sort(),
    scope,
    statesUnion: [...states].sort(),
    distributionIncomplete: anyUnknown,
    firstInitiated: dates[0] || null,
    lastNoticeDate: children.map((c) => c.publishedDate || c.initiatedDate).filter(Boolean).sort().slice(-1)[0] || null,
    // The date a person sees on the card: the newest notice, not the day we ingested it.
    lastUpdated: children.map((c) => c.publishedDate || c.initiatedDate).filter(Boolean).sort().slice(-1)[0] || null,
    closedDate: children.every((c) => c.status !== 'ongoing' && c.status !== 'unknown') ? (children.map((c) => c.terminationDate).filter(Boolean).sort().slice(-1)[0] || null) : null,
    groupingConfidence: confidence,
    groupingReason: reason,
    outbreakIds: linked.map((o) => o.id),
    illnessSummary: linked.length
      ? { cases: linked.reduce((n, o) => n + (o.cases || 0), 0) || null, hospitalizations: linked.reduce((n, o) => n + (o.hospitalizations || 0), 0) || null, deaths: linked.reduce((n, o) => n + (o.deaths || 0), 0) || null }
      : null,
    status: children.some((c) => c.status === 'ongoing' || c.status === 'unknown') ? 'active' : 'closed',
    codeStatus: children.some((c) => c.product.codeStatus === 'has_upc') ? 'has_upc'
      : children.some((c) => c.product.codeStatus === 'has_lot_only') ? 'has_lot_only'
      : children.some((c) => c.product.codeStatus === 'has_dates_only') ? 'has_dates_only' : 'none',
    relatedIncidentIds: [],
  };
}

/**
 * Group recalls into incidents.
 * @param recalls   normalized Recall[] (after absorbProvisionals)
 * @param outbreaks Outbreak[]
 * @param tokens    ingredient token list (strings)
 * @param prevIncidents previous snapshot's incidents, for alias detection
 */
export function groupIncidents(recalls, outbreaks = [], tokens = [], prevIncidents = []) {
  const groups = []; // { members: Recall[], confidence, reason }
  const memberOf = new Map();

  const attach = (r, g, confidence, reason) => {
    g.members.push(r);
    memberOf.set(r.id, g);
    // Confidence of a group is the weakest link that joined it.
    const rank = { certain: 3, likely: 2, possible: 1 };
    if (rank[confidence] < rank[g.confidence]) { g.confidence = confidence; g.reason = reason; }
  };
  const newGroup = (r) => { const g = { members: [r], confidence: 'certain', reason: 'single notice' }; memberOf.set(r.id, g); groups.push(g); return g; };

  // Deterministic first: ingest in firstSeenAt order so anchors are stable.
  const ordered = [...recalls].sort((a, b) => a.firstSeenAt.localeCompare(b.firstSeenAt) || a.id.localeCompare(b.id));

  for (const r of ordered) {
    if (memberOf.has(r.id)) continue;
    let placed = false;
    const lowHazard = r.hazard.confidence === 'low' || !r.hazard.agent;

    for (const g of groups) {
      const m0 = g.members[0];
      // Hard rules
      if (!lowHazard && m0.hazard.agent !== r.hazard.agent) continue;
      if (g.members.every((m) => days(anchorDate(m), anchorDate(r)) > 45)) continue;

      // Layer 0
      if (r.fdaEventId && g.members.some((m) => m.fdaEventId === r.fdaEventId)) { attach(r, g, 'certain', 'same FDA event id'); placed = true; break; }
      if (lowHazard) continue; // low-confidence hazards only join on layer 0

      // Layer 1
      if (r.firm.key && g.members.some((m) => m.firm.key === r.firm.key && days(anchorDate(m), anchorDate(r)) <= 14)) {
        attach(r, g, 'certain', 'same firm, same hazard, within 14 days'); placed = true; break;
      }
      // Layer 2
      const rt = ingredientTokensIn(`${r.hazard.rawReason} ${r.product.rawDescription}`, tokens);
      if (rt.length) {
        const hit = g.members.find((m) => days(anchorDate(m), anchorDate(r)) <= 21 &&
          ingredientTokensIn(`${m.hazard.rawReason} ${m.product.rawDescription}`, tokens).some((t) => rt.includes(t)));
        if (hit) { attach(r, g, 'likely', `shared ingredient "${rt[0]}", same hazard, within 21 days`); placed = true; break; }
      }
      // Layer 3 — outbreak anchoring. Requires the outbreak's food to match the recall's food
      // (category or shared word); "same pathogen, any food" would merge every Listeria recall
      // in the country into one incident whenever a Listeria outbreak is open.
      const ob = outbreaks.find((o) => o.status === 'active' && o.agent === r.hazard.agent && days(o.lastUpdated, anchorDate(r)) <= 45 && foodMatches(o, r));
      if (ob && g.members.some((m) => days(anchorDate(m), anchorDate(r)) <= 45 && foodMatches(ob, m))) {
        attach(r, g, 'possible', `same hazard and food as active outbreak ${ob.id}`); placed = true; break;
      }
    }
    if (!placed) newGroup(r);
  }

  const incidents = groups.map((g) => buildIncident(g.members, g.confidence, g.reason, outbreaks));

  // Cross-links for low-confidence hazards: same firm within 30 days, not merged.
  const byFirm = new Map();
  for (const inc of incidents) for (const rid of inc.recallIds) {
    const r = recalls.find((x) => x.id === rid);
    if (!r?.firm.key) continue;
    if (!byFirm.has(r.firm.key)) byFirm.set(r.firm.key, new Set());
    byFirm.get(r.firm.key).add(inc.id);
  }
  for (const ids of byFirm.values()) {
    if (ids.size < 2) continue;
    for (const a of ids) {
      const inc = incidents.find((i) => i.id === a);
      inc.relatedIncidentIds = [...ids].filter((b) => b !== a);
    }
  }

  // Aliases: a previous incident id that no longer exists but whose children are now inside another incident.
  const aliases = {};
  const childToInc = new Map();
  const recallById = new Map(recalls.map((r) => [r.id, r]));
  for (const inc of incidents) for (const rid of inc.recallIds) {
    childToInc.set(rid, inc.id);
    const absorbed = recallById.get(rid)?.absorbedProvisionalId;
    if (absorbed) childToInc.set(absorbed, inc.id); // a press release that was absorbed still resolves
  }
  const currentIds = new Set(incidents.map((i) => i.id));
  for (const prev of prevIncidents) {
    if (currentIds.has(prev.id)) continue;
    const target = prev.recallIds.map((rid) => childToInc.get(rid)).find(Boolean);
    if (target) aliases[prev.id] = target;
  }

  return { incidents, aliases };
}

/** Attach incident ids back onto outbreaks. */
export function linkOutbreaks(incidents, outbreaks) {
  for (const o of outbreaks) o.linkedIncidentIds = incidents.filter((i) => i.outbreakIds.includes(o.id)).map((i) => i.id);
}

/**
 * Review queue: ≥3 unmerged incidents sharing an agent inside any 30-day window.
 * Candidate tokens = frequent nouns across the cluster that aren't already in the token list.
 */
export function buildReviewQueue(incidents, recalls, tokens, now) {
  const STOP = new Set(['product', 'products', 'recall', 'recalled', 'recalling', 'because', 'potential', 'potentially', 'contamination', 'contaminated', 'with', 'from', 'that', 'this', 'have', 'been', 'were', 'which', 'possible', 'undeclared', 'allergen', 'allergens', 'listeria', 'salmonella', 'monocytogenes', 'coli', 'company', 'inc', 'llc', 'foods', 'food', 'brand', 'sold', 'distributed', 'packaged', 'package', 'packages', 'packaging', 'best', 'date', 'dates', 'code', 'codes', 'ounce', 'ounces', 'pound', 'pounds', 'retail', 'stores', 'store', 'label', 'labels', 'labeled', 'presence', 'through', 'under', 'containers', 'container', 'plastic', 'clear', 'net', 'weight', 'item', 'items', 'lot', 'lots', 'upc', 'bags', 'bag', 'frozen', 'fresh', 'ready', 'eat', 'contains', 'contain', 'ingredients', 'ingredient', 'statement', 'information', 'unit', 'units', 'case', 'cases', 'tray', 'trays', 'water', 'salt', 'sodium', 'sugar', 'powder', 'whole', 'poly', 'yellow', 'does', 'each', 'sizes', 'size', 'count', 'pack', 'packs', 'boxes', 'box', 'jars', 'jar', 'bottles', 'bottle', 'cups', 'cup', 'pieces', 'piece', 'firm', 'establishment', 'approximately', 'shipped', 'between', 'produced', 'inspection', 'service', 'safety', 'department', 'agriculture', 'washington', 'announced', 'today', 'consumers', 'consumer', 'refrigerators', 'refrigerator', 'freezers', 'purchase', 'purchased', 'urged', 'concerned', 'healthcare', 'provider', 'illness', 'illnesses', 'reports', 'confirmed', 'reactions', 'reaction', 'symptoms', 'recalls', 'risk', 'health', 'cause', 'serious', 'organism', 'organisms', 'temperature', 'growth', 'liquid', 'good', 'barcode', 'barcodes', 'master', 'fsis', 'containing', 'view', 'positive', 'printed', 'keep', 'bulk', 'jumbo', 'cardboard', 'white', 'cream', 'made', 'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'grated', 'sliced', 'organic', 'natural', 'premium', 'style', 'family', 'select', 'value', 'brands', 'company', 'corporation', 'incorporated', 'distributing', 'distribution', 'imported', 'processing', 'quality', 'manufactured', 'packing', 'produce', 'twin', 'richmond',
    // ingredient tokens are foods; place names never are
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'hampshire', 'jersey', 'mexico', 'york', 'carolina', 'dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode', 'island', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'wisconsin', 'wyoming']);
  const byRecall = new Map(recalls.map((r) => [r.id, r]));
  const queue = [];
  const byAgent = new Map();
  // Pathogens only: an ingredient cascade is a pathogen phenomenon. Three unrelated undeclared-milk
  // recalls in a month is normal and would fill the queue with noise.
  for (const inc of incidents) {
    if (!inc.agent || inc.hazardType !== 'pathogen') continue;
    if (!byAgent.has(inc.agent)) byAgent.set(inc.agent, []);
    byAgent.get(inc.agent).push(inc);
  }
  for (const [agent, incs] of byAgent) {
    const sorted = incs.filter((i) => i.firstInitiated).sort((a, b) => a.firstInitiated.localeCompare(b.firstInitiated));
    // Fixed 30-day windows starting at each incident; a window is reported only if it holds ≥3 unmerged
    // incidents AND has candidate tokens. Then skip past it so the same incidents aren't reported twice.
    // Listeria and Salmonella recalls arrive every week; without the token requirement every month
    // would be "a cluster".
    const AGENT_WORDS = new Set(['listeria', 'monocytogenes', 'salmonella', 'coli', 'escherichia', 'botulism', 'botulinum', 'clostridium', 'hepatitis', 'norovirus', 'cyclospora', 'cronobacter', 'shiga', 'toxin']);
    let i = 0;
    while (i < sorted.length) {
      const start = sorted[i].firstInitiated;
      const window = sorted.filter((x) => x.firstInitiated >= start && days(x.firstInitiated, start) <= 30);
      if (window.length < 3) { i++; continue; }
      const counts = new Map();
      for (const c of window) {
        const words = new Set();
        for (const rid of c.recallIds) {
          const r = byRecall.get(rid);
          if (!r) continue;
          for (const w of `${r.hazard.rawReason} ${r.product.rawDescription}`.toLowerCase().match(/[a-z]{4,}/g) || []) {
            if (!STOP.has(w) && !AGENT_WORDS.has(w) && !tokens.includes(w) && !tokens.includes(w.replace(/s$/, '')) && !tokens.includes(w.replace(/es$/, ''))) words.add(w);
          }
        }
        for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
      }
      const need = Math.max(2, Math.ceil(window.length / 2));
      const candidateTokens = [...counts.entries()].filter(([, n]) => n >= need).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w, n]) => ({ token: w, inIncidents: n }));
      if (candidateTokens.length) {
        queue.push({ agent, windowStart: start, windowEnd: window[window.length - 1].firstInitiated, incidentIds: window.map((c) => c.id), candidateTokens, firstFlaggedAt: now });
        i += window.length;
      } else {
        i++;
      }
    }
  }
  return queue;
}
