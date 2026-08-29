// parse.js — free-text parsers for recall notices.
// Every parser returns { value, confidence, raw } so the UI can say what it read.
// confidence: 'high' | 'medium' | 'low'. Lossy by design; never invent precision.
// Pure ESM, no dependencies. Runs in Node (build step) and in the browser (live lane).

// ---------- text helpers ----------

export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;|&lsquo;|&apos;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export function sentences(text) {
  return stripHtml(text)
    .replace(/([.!?])\s*\n+/g, '$1 ')
    .replace(/\n+/g, '. ')
    .split(/(?<=[.!?])\s+(?=[A-Z"“])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

// ---------- firm key ----------

const FIRM_SUFFIXES =
  /\b(inc|incorporated|llc|l\.l\.c|ltd|limited|co|company|corp|corporation|foods|food|group|holdings|usa|us|the|of|dba|d\/b\/a)\b/g;

export function firmKey(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(FIRM_SUFFIXES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- hazard ----------

// Order matters: first match wins within a type; pathogens checked before allergens
// because "undeclared" text sometimes co-occurs with contamination language.
const PATHOGENS = [
  ['listeria', /\blisteria\b|\bl\.\s?monocytogenes\b/i],
  ['salmonella', /\bsalmonella\b/i],
  ['e_coli', /\be\.?\s?coli\b|\bescherichia\b|\bstec\b|\bo157\b|\bo26\b|\bo121\b|\bo103\b/i],
  ['botulism', /\bbotulism\b|\bbotulinum\b|\bclostridium\s+bot/i],
  ['hepatitis_a', /\bhepatitis\s*a\b/i],
  ['norovirus', /\bnorovirus\b/i],
  ['cyclospora', /\bcyclospora\b/i],
  ['cronobacter', /\bcronobacter\b|\benterobacter\s+sakazakii\b/i],
  ['clostridium', /\bclostridium\b/i],
  ['shigella', /\bshigella\b/i],
  ['staph', /\bstaphylococc/i],
  ['vibrio', /\bvibrio\b/i],
];

const ALLERGENS = [
  ['milk', /\bmilk\b|\bdairy\b|\bcasein\b|\bwhey\b|\blactose\b/i],
  ['egg', /\beggs?\b/i],
  ['peanut', /\bpeanuts?\b/i],
  ['tree_nut', /\btree\s?nuts?\b|\balmonds?\b|\bwalnuts?\b|\bcashews?\b|\bpecans?\b|\bpistachios?\b|\bhazelnuts?\b|\bmacadamia\b|\bcoconut\b/i],
  ['wheat', /\bwheat\b|\bgluten\b/i],
  ['soy', /\bsoy\b|\bsoya\b|\bsoybeans?\b/i],
  ['fish', /\bfish\b|\banchov/i],
  ['shellfish', /\bshellfish\b|\bshrimp\b|\bcrab\b|\blobster\b|\bcrustacean/i],
  ['sesame', /\bsesame\b/i],
  ['sulfites', /\bsulfites?\b|\bsulphites?\b/i],
  ['mustard', /\bmustard\b/i],
];

const ALLERGEN_TRIGGER = /\bundeclared\b|\bunreported\b|\bunlabeled\b|\bunlabelled\b|\bnot\s+(declared|listed|labeled|labelled)\b|\ballergen/i;
const UNINSPECTED = /without\s+(the\s+)?benefit\s+of\s+(federal\s+)?inspection|\bineligible\b|\bimport\s+violation|\bnot\s+(been\s+)?(presented\s+for\s+)?(re)?inspect/i;
const PROCESSING = /\bprocessing\s+(defect|deviation)|\bunder-?process|\bunderprocess|\btemperature\s+abuse|\binadequate\s+(cook|process)/i;
const UNFIT = /\bunfit\s+for\s+human\s+consumption|\bunsanitary\b|\binsanitary\b|\bspoil/i;
const MAY_CONTAIN = /\bmay\s+contain\b|\bcontains?\b/i;
export const ALLERGEN_LABEL = { milk: 'milk', egg: 'eggs', peanut: 'peanuts', tree_nut: 'tree nuts', wheat: 'wheat', soy: 'soy', fish: 'fish', shellfish: 'shellfish', sesame: 'sesame', sulfites: 'sulfites', mustard: 'mustard', unknown: 'the undeclared ingredient' };
// Needs contamination context: "glass jars" and "plastic tubs" are packaging, not hazards.
const FOREIGN = /\bforeign\s+(material|matter|object|body|substance)|\bextraneous\s+material|\b(pieces?|fragments?|shards?|bits?|particles?)\s+of\s+(hard\s+|clear\s+|white\s+|blue\s+|black\s+)?(metal|plastic|glass|wood|rubber|bone)|\b(metal|plastic|glass|wood|rubber|bone)\s+(pieces?|fragments?|shards?|particles?|contaminat)|\bcontaminated\s+with\s+(hard\s+)?(metal|plastic|glass|wood|rubber|bone)|\bcontain\s+(hard\s+)?(metal|plastic|glass|wood|rubber)\b/i;
const CHEMICAL = /\blead\b|\bcadmium\b|\barsenic\b|\bmercury\b|\baflatoxin\b|\bpesticide|\bcleaning\s+(solution|agent)|\bsanitizer\b|\bchemical\b|\bhistamine\b|\bnitrite\b/i;
const LABELING = /\bmisbrand|\bmislabel|\bwrong\s+label|\bincorrect\s+label|\blabel(l)?ing\b|\bmisprint/i;

export function parseHazard(reasonText, extra = '') {
  const text = stripHtml(`${reasonText || ''} ${extra || ''}`);
  const raw = stripHtml(reasonText || '');
  if (!text) return { type: 'other', agent: null, confidence: 'low', raw };

  for (const [agent, re] of PATHOGENS) {
    if (re.test(text)) {
      return { type: 'pathogen', agent, confidence: agent === 'clostridium' ? 'medium' : 'high', raw };
    }
  }
  // Allergen only when the notice says "undeclared" (or similar), or says "may contain <named allergen>".
  // A bare "may contain" is not enough: "may contain small pieces of plastic" is foreign material.
  // Allergen names are looked for in the sentences that mention allergens, so FSIS boilerplate like
  // "meat, poultry, or egg product" doesn't turn every notice into an egg recall.
  const allergenSentences = sentences(raw).filter((x) => ALLERGEN_TRIGGER.test(x) || /\bknown allergens?\b|\bcontains?\b/i.test(x));
  const scope = allergenSentences.length ? allergenSentences.join(' ') : raw.replace(/meat,? poultry,? (and|or) egg products?/gi, '');
  const allergens = ALLERGENS.filter(([, re]) => re.test(scope)).map(([a]) => a);
  const named = allergens[0] || null;
  if (ALLERGEN_TRIGGER.test(text)) {
    return named
      ? { type: 'allergen', agent: `undeclared_${named}`, allergens, confidence: 'high', raw }
      : { type: 'allergen', agent: 'undeclared_unknown', allergens: [], confidence: 'medium', raw };
  }
  if (UNINSPECTED.test(text)) return { type: 'uninspected', agent: 'uninspected', confidence: 'medium', raw };
  if (PROCESSING.test(text)) return { type: 'processing', agent: 'processing_defect', confidence: 'medium', raw };
  if (FOREIGN.test(text)) return { type: 'foreign_material', agent: 'foreign_material', confidence: 'medium', raw };
  if (named && MAY_CONTAIN.test(raw)) return { type: 'allergen', agent: `undeclared_${named}`, allergens, confidence: 'medium', raw };
  if (UNFIT.test(text)) return { type: 'other', agent: 'unfit', confidence: 'medium', raw };
  if (CHEMICAL.test(text)) return { type: 'chemical', agent: 'chemical', confidence: 'medium', raw };
  if (LABELING.test(text)) return { type: 'labeling', agent: 'labeling', confidence: 'medium', raw };
  return { type: 'other', agent: null, confidence: 'low', raw };
}

// ---------- distribution ----------

export const STATES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'puerto rico': 'PR', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};
export const STATE_NAME_BY_CODE = Object.fromEntries(
  Object.entries(STATES).map(([name, code]) => [code, name.replace(/\b\w/g, (c) => c.toUpperCase())]),
);
const CODES = new Set(Object.values(STATES));
// Two-letter codes that are also English words. Accept these only inside a code list.
const AMBIGUOUS = new Set(['IN', 'OR', 'ME', 'HI', 'OK', 'DE', 'OH', 'ID', 'MA', 'PA', 'LA', 'CO', 'MO', 'AL', 'MS', 'MT', 'NE', 'WA', 'MD', 'AR', 'MI', 'IL', 'VA', 'GA', 'KS']);

const NATIONWIDE = /\bnation\s?wide\b|\bthroughout\s+the\s+(u\.?s\.?|united\s+states|country|us)\b|\ball\s+(50\s+)?states\b|\bacross\s+the\s+(u\.?s\.?|united\s+states|country)\b|\bthe\s+entire\s+(u\.?s\.?|united\s+states)\b|\bcontinental\s+(u\.?s\.?|united\s+states)\b|\bnational\s+distribution\b/i;
const INTERNATIONAL = /\bcanada\b|\bmexico\b|\bontario\b|\bquebec\b|\bbritish\s+columbia\b|\balberta\b|\binternational|\bworldwide\b|\bexport|\bunited\s+kingdom\b|\bjapan\b|\bkorea\b|\bchina\b|\btaiwan\b|\bhong\s+kong\b|\baustralia\b|\bgermany\b|\bfrance\b|\bisrael\b|\bdubai\b|\buae\b|\bsingapore\b/i;
const VAGUE = /\band\s+other\s+states\b|\bother\s+states\b|\bvia\s+(the\s+)?internet\b|\bonline\b|\bmail\s+order\b|\bdistributors?\b|\bwholesalers?\b|\bretail(ers)?\s+(stores\s+)?(in|throughout)\b|\bvarious\b|\bmultiple\s+states\b|\bseveral\s+states\b/i;

export function parseDistribution(patternText, fsisStates) {
  const raw = stripHtml(patternText || '');
  const text = raw + (fsisStates ? ` ${stripHtml(fsisStates)}` : '');
  const flags = [];

  if (!text.trim() || /^(n\/?a|none|unknown|not\s+available)\.?$/i.test(text.trim())) {
    return { scope: 'unknown', states: [], international: false, confidence: 'low', raw, flags: ['empty'] };
  }

  const found = new Set();
  const lower = text.toLowerCase();
  for (const [name, code] of Object.entries(STATES)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(lower)) found.add(code);
  }
  // Two-letter codes: unambiguous ones anywhere as a standalone uppercase token;
  // ambiguous ones only when they sit in a list of codes.
  const tokens = text.match(/\b[A-Z]{2}\b/g) || [];
  const codeList = tokens.filter((t) => CODES.has(t));
  const inList = codeList.length >= 2;
  for (const t of codeList) {
    if (!AMBIGUOUS.has(t) || inList) found.add(t);
  }

  const nationwide = NATIONWIDE.test(text);
  const international = INTERNATIONAL.test(text);
  if (VAGUE.test(text)) flags.push('vague_list');
  if (international) flags.push('international');
  if (raw.length > 400 && found.size < 3) flags.push('long_unparsed');

  let scope;
  if (nationwide) scope = 'nationwide';
  else if (found.size === 0) scope = international ? 'international' : 'unknown';
  else if (found.size === 1) scope = 'single_state';
  else scope = 'multi_state';

  let confidence = 'high';
  if (scope === 'unknown') confidence = 'low';
  else if (flags.includes('vague_list') || flags.includes('long_unparsed')) confidence = 'low';
  else if (raw.length > 200 && !nationwide) confidence = 'medium';

  return { scope, states: [...found].sort(), international, confidence, raw, flags };
}

// ---------- codes: UPC / GTIN, lot codes, dates ----------

export function gs1CheckDigitValid(digits) {
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return false;
  const body = digits.slice(0, -1);
  const check = Number(digits.slice(-1));
  let sum = 0;
  // Weights alternate 3,1 from the rightmost body digit.
  for (let i = 0; i < body.length; i++) {
    const d = Number(body[body.length - 1 - i]);
    sum += d * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === check;
}

export function toGtin14(digits) {
  return digits.padStart(14, '0');
}

const CODE_RUN = /(?<![\d])((?:\d[\s.\-]?){11,13}\d)(?![\d])/g;

export function parseUpcs(...texts) {
  const out = new Map(); // normalized -> { digits, gtin14, checkDigitValid, raw }
  for (const t of texts) {
    const text = stripHtml(t || '');
    if (!text) continue;
    for (const m of text.matchAll(CODE_RUN)) {
      const rawRun = m[1];
      const digits = rawRun.replace(/\D/g, '');
      if (![12, 13, 14].includes(digits.length)) continue;
      // Skip obvious dates like 2026-08-20 followed by digits, and phone-like runs.
      if (/^(19|20)\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}/.test(rawRun) && digits.length === 12) continue;
      const gtin14 = toGtin14(digits);
      if (!out.has(gtin14)) {
        out.set(gtin14, { digits, gtin14, checkDigitValid: gs1CheckDigitValid(digits), raw: rawRun.trim() });
      }
    }
  }
  return [...out.values()];
}

const LOT_RE = /\b(?:lots?\s*(?:no|num|number|#|codes?)\.?|lots?|batch(?:\s*(?:no|#))?|l#|l\/n|code)\s*[:#]?\s*((?:[A-Z0-9][A-Z0-9\-\/]{2,}(?:\s*(?:,|and|&|;)\s*)?)+)/gi;

export function parseLotCodes(...texts) {
  const out = new Set();
  for (const t of texts) {
    const text = stripHtml(t || '');
    for (const m of text.matchAll(LOT_RE)) {
      for (const piece of m[1].split(/\s*(?:,|and|&|;)\s*/)) {
        const p = piece.trim().replace(/[.,;]$/, '');
        // Reject things that are clearly dates or plain words.
        if (p.length < 3 || p.length > 24) continue;
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(p)) continue;
        if (!/\d/.test(p)) continue; // a lot code without a digit is almost always a word
        out.add(p.toUpperCase());
      }
    }
  }
  return [...out];
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const DATE_TRIGGER = /\b(best\s*(?:by|before|if\s+used\s+by)|use\s*by|sell\s*by|exp(?:iration|ires|iry)?\.?(?:\s*date)?|bb|enjoy\s+by|freeze\s+by|packed\s+on|pack\s+date)\b/i;
const DATE_FORMS = [
  // 08/20/2026, 8-20-26, 08.20.2026
  { re: /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g, f: (m) => [m[3], m[1], m[2]] },
  // 2026-08-20
  { re: /\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g, f: (m) => [m[1], m[2], m[3]] },
  // Aug 20, 2026 / August 20 2026 / 20 AUG 2026 / AUG2026
  { re: /\b([A-Za-z]{3,9})\.?\s*(\d{1,2})?,?\s*(20\d{2}|\d{2})\b/g, f: (m) => [m[3], MONTHS[m[1].slice(0, 4).toLowerCase()] ?? MONTHS[m[1].slice(0, 3).toLowerCase()], m[2] ?? 1] },
  { re: /\b(\d{1,2})\s*([A-Za-z]{3,9})\.?\s*(20\d{2}|\d{2})\b/g, f: (m) => [m[3], MONTHS[m[2].slice(0, 4).toLowerCase()] ?? MONTHS[m[2].slice(0, 3).toLowerCase()], m[1]] },
];

function iso(y, m, d) {
  let yy = Number(y);
  if (yy < 100) yy += 2000;
  const mm = Number(m);
  const dd = Number(d);
  if (!mm || mm < 1 || mm > 12 || !dd || dd < 1 || dd > 31 || yy < 2015 || yy > 2040) return null;
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export function parseBestByDates(...texts) {
  const out = new Map();
  for (const t of texts) {
    const text = stripHtml(t || '');
    if (!text || !DATE_TRIGGER.test(text)) continue;
    for (const { re, f } of DATE_FORMS) {
      for (const m of text.matchAll(re)) {
        const [y, mo, d] = f(m);
        if (mo === undefined) continue;
        const v = iso(y, mo, d);
        if (v && !out.has(v)) out.set(v, { iso: v, raw: m[0].trim() });
      }
    }
  }
  return [...out.values()].sort((a, b) => a.iso.localeCompare(b.iso));
}

export function codeStatus({ upcs, lotCodes, bestByDates }) {
  if (upcs.length) return 'has_upc';
  if (lotCodes.length) return 'has_lot_only';
  if (bestByDates.length) return 'has_dates_only';
  return 'none';
}

// ---------- consumer instruction ----------

const CONSUMER_SUBJECT = /^(consumers?|customers?|anyone|people|those|individuals|households?|parents|caregivers|you)\b/i;
const CONSUMER_VERB = /\b(urged|advised|encouraged|should\s+not\s+(eat|consume|use|feed)|do\s+not\s+(eat|consume|use|feed)|are\s+asked|can\s+return|may\s+return|should\s+(return|discard|throw|dispose|contact)|who\s+have\s+purchased|who\s+purchased)\b/i;
const NON_CONSUMER_SUBJECT = /^(retailers?|distributors?|wholesalers?|restaurants?|the\s+(company|firm)|firms?|foodservice|institutions?)\b/i;

const PRIMARY_INSTRUCTION = /\b(who\s+(have\s+)?purchased|urged\s+not\s+to\s+(consume|eat|use)|should\s+not\s+(consume|eat|use|feed)|do\s+not\s+(consume|eat|use|feed)|not\s+to\s+consume)\b/i;
const FOLLOW_ON = /\b(refund|return(ed)?|discard(ed)?|throw(n)?|dispose(d)?|clean|sanitize|double[\s-]?bag|place\s+of\s+purchase)\b/i;
const BOILERPLATE = /\b(check\s+back\s+frequently|effectiveness\s+checks|hotline|complaint\s+monitoring|media\s+with\s+questions|questions\s+(regarding|about)\s+the\s+recall)\b/i;

export function extractConsumerInstruction(...texts) {
  for (const t of texts) {
    const sents = sentences(t).filter((x) => !BOILERPLATE.test(x));
    // Prefer the sentence that tells purchasers what to do; "Anyone concerned about a reaction should
    // contact a provider" is real but secondary, and it comes first in FSIS notices.
    let start = sents.findIndex((x) => !NON_CONSUMER_SUBJECT.test(x) && PRIMARY_INSTRUCTION.test(x));
    if (start < 0) start = sents.findIndex((x) => !NON_CONSUMER_SUBJECT.test(x) && (CONSUMER_SUBJECT.test(x) || CONSUMER_VERB.test(x)));
    if (start < 0) continue;
    const hits = [sents[start]];
    for (let i = start + 1; i < Math.min(sents.length, start + 3); i++) {
      const next = sents[i];
      if (NON_CONSUMER_SUBJECT.test(next)) break;
      if (FOLLOW_ON.test(next) || CONSUMER_SUBJECT.test(next)) hits.push(next); else break;
      if (hits.join(' ').length > 320) break;
    }
    return { text: hits.join(' ').slice(0, 480), extracted: true };
  }
  return { text: null, extracted: false };
}

// ---------- disposal action ----------

const NEG = /\b(not|never|no)\b[^.]{0,20}$/i; // negation shortly before the verb

function hasWithoutNegation(text, verbRe) {
  for (const m of text.matchAll(verbRe)) {
    const before = text.slice(Math.max(0, m.index - 24), m.index);
    if (!NEG.test(before)) return true;
  }
  return false;
}

export function deriveDisposal(text, hazardAgent) {
  const t = stripHtml(text || '');
  if (!t) return 'see_notice';
  const sanitize = /\b(clean|sanitiz|disinfect|wash)\w*\b[^.]{0,80}\b(refrigerator|fridge|surface|container|cutting\s+board|utensil|shel(f|ves))/i.test(t);
  const doNotOpen = /\bdo\s+not\s+open\b|\beven\s+if\s+it\s+(does\s+not|doesn't)\s+(look|smell)|\bdouble[\s-]?bag/i.test(t);
  const returnRefund = hasWithoutNegation(t, /\b(return(ed)?|bring(ing)?\s+(it\s+)?back)\b[^.]{0,60}\b(refund|exchange|store|place\s+of\s+purchase|retailer)\b/gi) ||
    hasWithoutNegation(t, /\bfull\s+refund\b/gi);
  const discard = hasWithoutNegation(t, /\b(discard(ed)?|throw(n)?\s+(it\s+|them\s+)?(away|out)|dispose(d)?\s+of|destroy(ed)?)\b/gi);

  if (hazardAgent === 'botulism' || doNotOpen) return 'do_not_open';
  if (sanitize && returnRefund) return 'return_and_sanitize';
  if (sanitize && (discard || hazardAgent === 'listeria')) return 'discard_and_sanitize';
  if (returnRefund && discard) return 'discard_or_return';
  if (returnRefund) return 'return_for_refund';
  if (discard) return 'discard';
  return 'see_notice';
}

export const DISPOSAL_COPY = {
  return_for_refund: 'Take it back to where you bought it for a refund.',
  discard: 'Throw it away.',
  discard_or_return: 'Throw it away or take it back for a refund.',
  discard_and_sanitize: 'Throw it away, then clean the fridge shelves, containers, and surfaces it touched.',
  return_and_sanitize: 'Take it back for a refund, or throw it away. Then clean the fridge shelves, containers, and surfaces it touched.',
  do_not_open: "Don't open it. Throw it away in a sealed bag, or take it back unopened.",
  see_notice: 'Read the notice for what to do with it.',
};

// ---------- brand / category guesses (lossy, labeled as such) ----------

const CATEGORY_TABLE = [
  ['leafy_greens', /\b(spinach|lettuce|romaine|kale|arugula|salad|spring\s+mix|greens)\b/i],
  ['produce', /\b(cucumber|tomato|onion|pepper|melon|cantaloupe|berries|strawberr|blueberr|apple|peach|avocado|sprout|mushroom|carrot|celery|fruit|vegetable|produce|basil|cilantro|parsley)\w*/i],
  ['deli_meat', /\b(deli|sliced\s+meat|ham|turkey\s+breast|salami|bologna|pastrami|liverwurst|hot\s+dog|frankfurter)\b/i],
  ['meat_poultry', /\b(beef|pork|chicken|turkey|sausage|ground|steak|bacon|lamb|poultry|meat|jerky|wings?)\b/i],
  ['seafood', /\b(salmon|tuna|shrimp|crab|oyster|clam|fish|seafood|catfish|tilapia|cod)\b/i],
  ['dairy', /\b(cheese|milk|yogurt|yoghurt|ice\s+cream|butter|cream|queso|kefir|cottage)\b/i],
  ['eggs', /\b(eggs?)\b/i],
  ['infant', /\b(infant|baby|formula|toddler)\b/i],
  ['frozen', /\b(frozen|ice\s+pop|freezer)\b/i],
  ['bakery', /\b(bread|cookie|cake|muffin|bagel|pastry|tortilla|pie|brownie|cracker)\b/i],
  ['snacks', /\b(chips|granola|bar|snack|trail\s+mix|popcorn|pretzel|nuts?)\b/i],
  ['packaged', /\b(soup|sauce|dressing|dip|hummus|salsa|pasta|noodle|rice|cereal|canned|jar|spread|peanut\s+butter|flour|spice|seasoning)\b/i],
  ['beverage', /\b(juice|drink|beverage|water|soda|tea|coffee|smoothie)\b/i],
  ['supplement', /\b(supplement|capsule|vitamin|protein\s+powder)\b/i],
];

export function parseCategory(text) {
  const t = stripHtml(text || '');
  for (const [cat, re] of CATEGORY_TABLE) if (re.test(t)) return cat;
  return 'other';
}

export function parseBrands(text) {
  const t = stripHtml(text || '');
  const out = new Set();
  for (const m of t.matchAll(/\b(?:brand(?:ed)?|under\s+the|labeled\s+as|sold\s+as|sold\s+under)\s*[:\-]?\s*"?([A-Z][A-Za-z0-9&'\-]+(?:\s+[A-Z][A-Za-z0-9&'\-]+){0,3})"?/g)) out.add(m[1].trim());
  for (const m of t.matchAll(/["“]([A-Z][^"”]{1,40})["”]/g)) out.add(m[1].trim());
  // Leading capitalized run before a lowercase noun, e.g. "Sunny Farms baby spinach"
  const lead = t.match(/^([A-Z][A-Za-z0-9&'\-]+(?:\s+[A-Z][A-Za-z0-9&'\-]+){0,2})\s+[a-z]/);
  if (lead) out.add(lead[1].trim());
  return [...out].filter((b) => b.length >= 2 && !/^(the|and|net|wt|oz|lb|upc|lot|best|use|by|sell|class|recall)$/i.test(b)).slice(0, 6);
}
