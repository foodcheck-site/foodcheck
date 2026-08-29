// normalize.js — turn raw records from each source into one Recall shape.
// Recall shape (all fields always present; unknowns are null, not missing):
// {
//   id, agency, source, nativeId, fdaEventId,
//   severity: 'class_1'|'class_2'|'class_3'|'unclassified',
//   status: 'ongoing'|'completed'|'terminated'|'unknown',
//   initiatedDate, publishedDate (ISO yyyy-mm-dd or null), lastSeenDate,
//   firstSeenAt (ISO datetime, assigned at ingest; never recomputed),
//   firm: { raw, key, city, stateRaw, countryRaw },
//   product: { rawDescription, brandGuesses[], categoryGuess, codeInfoRaw,
//              upcs[], lotCodes[], bestByDates[], codeStatus },
//   hazard: { rawReason, type, agent, confidence },
//   distribution: { rawPattern, scope, states[], international, confidence, flags[] },
//   consumerInstruction: { text, source, extracted },
//   disposalAction, sourceUrl, title, parseFlags[]
// }

import {
  stripHtml, firmKey, parseHazard, parseDistribution, parseUpcs, parseLotCodes,
  parseBestByDates, codeStatus, extractConsumerInstruction, deriveDisposal,
  parseCategory, parseBrands,
} from './parse.js';

/** Disposal from the quoted instruction first; if that yields nothing, from the whole notice. */
function bestDisposal(texts, agent) {
  for (const t of texts) { if (!t) continue; const d = deriveDisposal(t, agent); if (d !== 'see_notice') return d; }
  return 'see_notice';
}

export function isoFromYyyymmdd(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})(\d{2})(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function isoFromLoose(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  if (/^\d{8}$/.test(t)) return isoFromYyyymmdd(t);
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function severityFromClass(cls, riskLevel) {
  const c = String(cls || '').toLowerCase().replace(/\s+/g, ' ');
  if (/class\s*i{3}\b|class\s*3\b/.test(c)) return 'class_3';
  if (/class\s*ii\b|class\s*2\b/.test(c)) return 'class_2';
  if (/class\s*i\b|class\s*1\b/.test(c)) return 'class_1';
  const r = String(riskLevel || '').toLowerCase();
  if (/high/.test(r)) return 'class_1';
  if (/low/.test(r)) return 'class_2';
  if (/marginal/.test(r)) return 'class_3';
  return 'unclassified';
}

function statusFromFda(s) {
  const t = String(s || '').toLowerCase();
  if (t.startsWith('ongoing')) return 'ongoing';
  if (t.startsWith('completed')) return 'completed';
  if (t.startsWith('terminated')) return 'terminated';
  if (t.startsWith('pending')) return 'ongoing';
  return 'unknown';
}

function productBlock(description, codeInfo, extraCodeText) {
  const upcs = parseUpcs(codeInfo, description, extraCodeText);
  const lotCodes = parseLotCodes(codeInfo, description, extraCodeText);
  const bestByDates = parseBestByDates(codeInfo, description, extraCodeText);
  return {
    rawDescription: stripHtml(description || ''),
    brandGuesses: parseBrands(description),
    categoryGuess: parseCategory(description),
    codeInfoRaw: stripHtml(codeInfo || ''),
    upcs,
    lotCodes,
    bestByDates,
    codeStatus: codeStatus({ upcs, lotCodes, bestByDates }),
  };
}

function flagsFor(hazard, distribution, product, instruction) {
  const f = [];
  if (hazard.confidence === 'low') f.push('hazard_unread');
  if (distribution.confidence === 'low') f.push('distribution_unread');
  if (!product.brandGuesses.length) f.push('brand_unread');
  if (product.codeStatus === 'none') f.push('no_codes');
  if (!instruction.extracted) f.push('instruction_generated');
  return f;
}

/** openFDA /food/enforcement record → Recall */
export function fromOpenFda(r, now) {
  const nativeId = r.recall_number || `event-${r.event_id}-${(r.product_description || '').slice(0, 20)}`;
  const hazard = parseHazard(r.reason_for_recall, r.product_description);
  const distribution = parseDistribution(r.distribution_pattern);
  const product = productBlock(r.product_description, r.code_info, r.more_code_info);
  const instruction = extractConsumerInstruction(r.reason_for_recall);
  const instructionText = instruction.text;
  return {
    id: `fda:${nativeId}`,
    agency: 'FDA',
    source: 'fda_enforcement',
    nativeId,
    fdaEventId: r.event_id ? String(r.event_id) : null,
    severity: severityFromClass(r.classification),
    // A termination date means FDA closed it, whatever the status string says.
    status: r.termination_date ? 'terminated' : statusFromFda(r.status),
    terminationDate: isoFromYyyymmdd(r.termination_date),
    initiatedDate: isoFromYyyymmdd(r.recall_initiation_date),
    publishedDate: isoFromYyyymmdd(r.report_date),
    classifiedDate: isoFromYyyymmdd(r.center_classification_date),
    lastSeenDate: now.slice(0, 10),
    firstSeenAt: now,
    firm: {
      raw: r.recalling_firm || '',
      key: firmKey(r.recalling_firm),
      city: r.city || null,
      stateRaw: r.state || null,
      countryRaw: r.country || null,
    },
    product,
    hazard: { rawReason: hazard.raw, type: hazard.type, agent: hazard.agent, allergens: hazard.allergens || [], confidence: hazard.confidence },
    distribution: {
      rawPattern: distribution.raw, scope: distribution.scope, states: distribution.states,
      international: distribution.international, confidence: distribution.confidence, flags: distribution.flags,
    },
    consumerInstruction: { text: instructionText, source: instruction.extracted ? 'FDA' : null, extracted: instruction.extracted },
    disposalAction: bestDisposal([instructionText, r.reason_for_recall], hazard.agent),
    // openFDA rows are database entries, not press releases. There is no confirmed per-record page
    // on FDA's site, so sourceUrl stays null unless an RSS press release is absorbed later.
    // enforcementReportUrl is the search page a person can use with the recall number.
    sourceUrl: null,
    enforcementReportUrl: 'https://www.accessdata.fda.gov/scripts/ires/index.cfm',
    title: stripHtml(r.product_description || '').slice(0, 140),
    parseFlags: flagsFor(hazard, distribution, product, instruction),
  };
}

/**
 * FSIS Recall API record → Recall. Field semantics verified against a real response (2026-08-25):
 *  - langcode is "English" | "Spanish"; Spanish rows are translations with the same recall number → drop them.
 *  - field_recall_type is the real status: "Active Recall" | "Public Health Alert" | "Closed Recall".
 *    field_active_notice is blank on nearly every row; do not use it.
 *  - field_states, field_establishment, field_product_items, field_recall_reason, field_distro_list are arrays.
 *  - field_risk_level is "High - Class I" etc.; field_recall_classification is "Class I" or "Public Health Alert".
 *  - field_recall_url is absolute. field_recall_date is ISO.
 * Returns null for rows to skip (non-English).
 */
export function fromFsis(r, now) {
  if (r.langcode && !/^en/i.test(r.langcode)) return null;
  const arr = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
  const nativeId = String(r.field_recall_number || r.field_recall_number_export || '').trim();
  const title = stripHtml(r.field_title || '');
  const summary = r.field_summary || '';
  const items = arr(r.field_product_items).map(stripHtml);
  const reasons = arr(r.field_recall_reason).map(stripHtml);
  const statesArr = arr(r.field_states).map(stripHtml);
  const type = String(r.field_recall_type || '');
  const isPha = /public health alert/i.test(type) || /public health alert/i.test(String(r.field_recall_classification || ''));
  const archived = String(r.field_archive_recall).toLowerCase() === 'true';

  // Firm: establishment field → the summary's "– Firm, a City, State establishment" → the title before "Recalls".
  let firmRaw = arr(r.field_establishment).map(stripHtml).filter(Boolean)[0] || '';
  if (!firmRaw) {
    const m = stripHtml(summary).match(/[–-]\s+([^,]{3,80}?),\s+(?:doing business as [^,]+,\s+)?an?\s+[^,]{2,40}\s+(?:establishment|firm|company)/i);
    if (m) firmRaw = m[1].trim();
  }
  if (!firmRaw && !isPha) firmRaw = title.split(/\s+recalls?\s+/i)[0].trim();
  const estMatch = firmRaw.match(/\bEST\.?\s*[A-Z]?-?\s*\d+[A-Z]?\b/i);
  firmRaw = firmRaw.replace(/,?\s*\bEST\.?\s*[A-Z]?-?\s*\d+[A-Z]?\b/i, '').replace(/[,\s]+$/, '').trim();

  const hazard = parseHazard(`${reasons.join('. ')}. ${summary}`, title);
  const distribution = parseDistribution(statesArr.length ? statesArr.join(', ') : summary, null);
  const codeText = `${items.join('\n')}\n${summary}`;
  const product = productBlock(items.join('; ') || title, codeText, null);
  const instruction = extractConsumerInstruction(summary);
  const date = isoFromLoose(r.field_recall_date);

  return {
    id: `fsis:${nativeId}`,
    agency: 'FSIS',
    source: 'fsis_recall',
    nativeId,
    noticeType: isPha ? 'public_health_alert' : 'recall',
    fdaEventId: null,
    severity: isPha ? 'alert' : severityFromClass(r.field_recall_classification, r.field_risk_level),
    status: /active recall/i.test(type) ? 'ongoing' : isPha ? (archived ? 'completed' : 'ongoing') : 'completed',
    initiatedDate: date,
    publishedDate: date,
    classifiedDate: null,
    lastSeenDate: now.slice(0, 10),
    firstSeenAt: now,
    firm: { raw: firmRaw, key: firmKey(firmRaw), establishment: estMatch ? estMatch[0].toUpperCase() : null, city: null, stateRaw: null, countryRaw: 'United States' },
    product,
    hazard: { rawReason: stripHtml(`${reasons.join(', ')}. ${summary}`).slice(0, 600), type: hazard.type, agent: hazard.agent, allergens: hazard.allergens || [], confidence: hazard.confidence, reasonTags: reasons },
    distribution: {
      rawPattern: distribution.raw, scope: distribution.scope, states: distribution.states,
      international: distribution.international, confidence: distribution.confidence, flags: distribution.flags,
    },
    consumerInstruction: { text: instruction.text, source: instruction.extracted ? 'USDA' : null, extracted: instruction.extracted },
    disposalAction: bestDisposal([instruction.text, summary], hazard.agent),
    sourceUrl: r.field_recall_url ? (String(r.field_recall_url).startsWith('http') ? String(r.field_recall_url).replace(/^http:/, 'https:') : `https://www.fsis.usda.gov${r.field_recall_url}`) : null,
    relatedToOutbreak: String(r.field_related_to_outbreak).toLowerCase() === 'true',
    title: title.slice(0, 140),
    parseFlags: flagsFor(hazard, distribution, product, instruction),
  };
}

/** FDA Recalls RSS item → provisional Recall (severity unclassified until an openFDA record absorbs it). */
export function fromRss(item, now) {
  const desc = item.description || '';
  const title = stripHtml(item.title || '');
  const hazard = parseHazard(`${title} ${desc}`);
  const distribution = parseDistribution(desc);
  const product = productBlock(title, desc, null);
  const instruction = extractConsumerInstruction(desc);
  const firmRaw = title.split(/\s+(recalls?|issues|announces|voluntarily)\b/i)[0] || '';
  const nativeId = item.guid || item.link || title;
  return {
    id: `rss:${String(nativeId).replace(/[^A-Za-z0-9\-_:.]/g, '').slice(-80)}`,
    agency: 'FDA',
    source: 'fda_rss',
    nativeId,
    fdaEventId: null,
    severity: 'unclassified',
    status: 'ongoing',
    initiatedDate: isoFromLoose(item.pubDate),
    publishedDate: isoFromLoose(item.pubDate),
    classifiedDate: null,
    lastSeenDate: now.slice(0, 10),
    firstSeenAt: now,
    firm: { raw: firmRaw, key: firmKey(firmRaw), city: null, stateRaw: null, countryRaw: null },
    product,
    hazard: { rawReason: stripHtml(desc).slice(0, 600), type: hazard.type, agent: hazard.agent, allergens: hazard.allergens || [], confidence: hazard.confidence },
    distribution: {
      rawPattern: distribution.raw, scope: distribution.scope, states: distribution.states,
      international: distribution.international, confidence: distribution.confidence, flags: distribution.flags,
    },
    consumerInstruction: { text: instruction.text, source: instruction.extracted ? 'FDA' : null, extracted: instruction.extracted },
    disposalAction: bestDisposal([instruction.text, desc], hazard.agent),
    sourceUrl: item.link || null,
    title: title.slice(0, 140),
    parseFlags: [...flagsFor(hazard, distribution, product, instruction), 'provisional'],
  };
}

/** Outbreak rows from FDA CORE / CDC pages → Outbreak. Scraper output is already loosely structured. */
export function toOutbreak(row, source, now) {
  const hazard = parseHazard(row.pathogen || row.title || '');
  const distribution = parseDistribution(row.states || '');
  // Case counts must come from the header-labeled cell and be plainly numeric. FDA sometimes puts
  // "See Advisory" there; and a mis-grabbed column once produced five-digit "case counts". A count
  // we can't trust renders as "see advisory", never as a number.
  const fieldNum = (re) => {
    const entry = Object.entries(row.fields || {}).find(([h]) => re.test(h));
    if (!entry) return undefined; // no such column → fall back to the scraper's positional value
    const v = String(entry[1]).trim().replace(/,/g, '');
    return /^\d{1,4}$/.test(v) ? Number(v) : null; // non-numeric → null, never a guess
  };
  const casesF = fieldNum(/total\s*case|case\s*count/i);
  const hospF = fieldNum(/hospital/i);
  const deathsF = fieldNum(/death/i);
  const sane = (n) => (n != null && n >= 0 && n <= 5000 ? n : null);
  return {
    id: `${source}:${(row.ref || row.id || row.title || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 60)}`,
    source,
    agent: hazard.agent,
    pathogenLabel: row.pathogen || null,
    foodGuess: stripHtml(row.product || row.food || row.title || '').slice(0, 140),
    statesAffected: distribution.states,
    cases: sane(casesF !== undefined ? casesF : row.cases ?? null),
    hospitalizations: sane(hospF !== undefined ? hospF : row.hospitalizations ?? null),
    deaths: sane(deathsF !== undefined ? deathsF : row.deaths ?? null),
    status: /active|ongoing|investigat/i.test(row.status || 'active') ? 'active' : 'closed',
    url: row.url || null,
    ref: row.ref || null,
    fields: row.fields || {},
    lastUpdated: isoFromLoose(row.updated) || row.pageDate || now.slice(0, 10),
    linkedIncidentIds: [],
  };
}
