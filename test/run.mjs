// node test/run.mjs — no test framework; exits non-zero on the first failure.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as parseMod from '../src/data/parse.js';
import {
  parseHazard, parseDistribution, parseUpcs, parseLotCodes, parseBestByDates, gs1CheckDigitValid,
  extractConsumerInstruction, deriveDisposal, firmKey,
} from '../src/data/parse.js';
import { fromOpenFda, fromFsis, fromRss, toOutbreak } from '../src/data/normalize.js';
import { carryFirstSeen, absorbProvisionals, groupIncidents, linkOutbreaks, buildReviewQueue } from '../src/data/reconcile.js';
import { evaluate, orderIncidents, normalizeStateInput, upcInputState, isCurrent } from '../src/data/match.js';

let n = 0;
const t = (name, fn) => { try { fn(); n++; console.log(`  ok  ${name}`); } catch (e) { console.error(`FAIL  ${name}\n${e.stack}`); process.exit(1); } };
const ta = async (name, fn) => { try { await fn(); n++; console.log(`  ok  ${name}`); } catch (e) { console.error(`FAIL  ${name}\n${e.stack}`); process.exit(1); } };

console.log('parse');
t('hazard: listeria before allergen', () => assert.equal(parseHazard('may be contaminated with Listeria monocytogenes; label also fails to declare milk').agent, 'listeria'));
t('hazard: undeclared allergen', () => assert.deepEqual([parseHazard('Undeclared milk').agent, parseHazard('may contain peanuts not listed').agent], ['undeclared_milk', 'undeclared_peanut']));
t('hazard: E. coli variants', () => ['E. coli O157:H7', 'STEC', 'Escherichia coli'].forEach((s) => assert.equal(parseHazard(s).agent, 'e_coli')));
t('hazard: botulism', () => assert.equal(parseHazard('Potential for Clostridium botulinum').agent, 'botulism'));
t('hazard: foreign material medium confidence', () => assert.deepEqual([parseHazard('small pieces of plastic').type, parseHazard('small pieces of plastic').confidence], ['foreign_material', 'medium']));
t('hazard: "may contain plastic" is foreign material, not allergen', () => assert.equal(parseHazard('Product may contain small pieces of plastic').type, 'foreign_material'));
t('hazard: "may contain peanuts" is allergen', () => assert.equal(parseHazard('Cookies may contain peanuts').agent, 'undeclared_peanut'));
t('disposal: return + sanitize', () => assert.equal(deriveDisposal('return it for a full refund. Consumers should also clean and sanitize refrigerator shelves', 'listeria'), 'return_and_sanitize'));
t('hazard: "glass jars" is packaging, not foreign material', () => assert.notEqual(parseHazard('8-oz glass jars of pickle produced without benefit of inspection').type, 'foreign_material'));
t('hazard: unreadable is low', () => assert.equal(parseHazard('Product recalled').confidence, 'low'));

t('distribution: nationwide + Ontario', () => { const d = parseDistribution('Nationwide in the US and Ontario, Canada'); assert.equal(d.scope, 'nationwide'); assert.equal(d.international, true); });
t('distribution: N/A is unknown/low, not empty list', () => { const d = parseDistribution('N/A'); assert.equal(d.scope, 'unknown'); assert.equal(d.confidence, 'low'); });
t('distribution: empty string is unknown', () => assert.equal(parseDistribution('').scope, 'unknown'));
t('distribution: full names', () => assert.deepEqual(parseDistribution('New Jersey, New York, Pennsylvania, Connecticut').states, ['CT', 'NJ', 'NY', 'PA']));
t('distribution: code list including ambiguous IN and OR', () => { const d = parseDistribution('AZ, CA, NV, UT, CO, TX, OR, WA, IN, and other states via distributors'); assert.ok(d.states.includes('IN') && d.states.includes('OR')); assert.equal(d.confidence, 'low'); assert.ok(d.flags.includes('vague_list')); });
t('distribution: lone ambiguous code in prose is not a state', () => assert.deepEqual(parseDistribution('Shipped in cases OR pallets to one retailer').states, []));
t('distribution: single state', () => assert.equal(parseDistribution('Vermont only').scope, 'single_state'));

t('upc: spaced, hyphenated, plain', () => { const u = parseUpcs('UPC 0 41220 33456 7. Also 041220-334581 and 041220334604'); assert.equal(u.length, 3); assert.equal(u[0].digits, '041220334567'); });
t('upc: fixture keeps one invalid code on purpose', () => assert.equal(parseUpcs('041220-334581')[0].checkDigitValid, false));
t('upc: check digit', () => { assert.equal(gs1CheckDigitValid('036000291452'), true); assert.equal(gs1CheckDigitValid('036000291453'), false); });
t('upc: ignores a phone number', () => assert.equal(parseUpcs('call 1-800-555-0199').length, 0));
t('upc: gtin14 padding', () => assert.equal(parseUpcs('712345678904')[0].gtin14, '00712345678904'));
t('lot codes', () => { const l = parseLotCodes('Lot codes RB2607A, RB2607B, RB2608A. Best by 08/12/2026'); assert.deepEqual(l, ['RB2607A', 'RB2607B', 'RB2608A']); });
t('lot: FSIS style', () => assert.ok(parseLotCodes('with lot code 0812 and use by 08/28/2026').includes('0812')));
t('best-by: slash and month-name forms', () => { const d = parseBestByDates('Best by 08/12/2026 through 08/20/2026', 'Best if used by JAN 12 2027'); assert.deepEqual(d.map((x) => x.iso), ['2026-08-12', '2026-08-20', '2027-01-12']); });
t('best-by: no trigger word, no dates', () => assert.equal(parseBestByDates('shipped 07/28/2026').length, 0));

t('instruction: consumer sentence, skips retailer', () => { const i = extractConsumerInstruction('Retailers should remove product from shelves. Consumers who purchased the product should discard it or return it to the store for a refund.'); assert.ok(i.extracted); assert.ok(i.text.startsWith('Consumers')); assert.ok(!/Retailers/.test(i.text)); });
t('instruction: FSIS order — purchaser sentence beats "anyone concerned"', () => {
  const i = extractConsumerInstruction('Anyone concerned about a reaction should contact a healthcare provider. FSIS is concerned that some product may be in consumers\u2019 refrigerators. Consumers who have purchased these products are urged not to consume them. These products should be thrown away or returned to the place of purchase. FSIS routinely conducts recall effectiveness checks.');
  assert.ok(i.text.startsWith('Consumers who have purchased'), i.text); assert.match(i.text, /thrown away or returned/); assert.ok(!/effectiveness/.test(i.text));
});
t('allergen scoped to allergen sentences, multiple kept', () => { const h = parseHazard('Recalling pasta salad due to misbranding and undeclared allergens. The product contains egg and milk, known allergens, not declared on the label. For consumers that need to report a problem with a meat, poultry, or egg product, call the hotline.'); assert.deepEqual(h.allergens, ['milk', 'egg']); });
t('boilerplate egg does not make an egg recall', () => { const h = parseHazard('Undeclared soy. The product contains soy, a known allergen. For consumers that need to report a problem with a meat, poultry, or egg product, call the hotline.'); assert.deepEqual(h.allergens, ['soy']); });
t('instruction: none', () => assert.equal(extractConsumerInstruction('Product is misbranded.').extracted, false));
t('disposal: return for refund', () => assert.equal(deriveDisposal('Consumers can return the product for a full refund.'), 'return_for_refund'));
t('disposal: "do not return" is not return', () => assert.equal(deriveDisposal('Consumers should throw them away. Do not return to the store.'), 'discard'));
t('disposal: listeria + sanitize (discard)', () => assert.equal(deriveDisposal('throw it away. Consumers should also clean and sanitize refrigerator shelves', 'listeria'), 'discard_and_sanitize'));
t('disposal: botulism', () => assert.equal(deriveDisposal('should not open the product', 'botulism'), 'do_not_open'));
t('disposal: both verbs', () => assert.equal(deriveDisposal('should be thrown away or returned to the place of purchase for a refund'), 'discard_or_return'));
t('html entities: numeric and named', () => { const { stripHtml } = parseMod; assert.equal(stripHtml('Ukrop&#039;s &amp; Sons&nbsp;&ndash; &quot;Best&quot;'), 'Ukrop\'s & Sons – "Best"'); });
t('firm key', () => assert.equal(firmKey('Riverbend Fresh Foods, Inc.'), firmKey('RIVERBEND FRESH')));

console.log('pipeline');
const raw = JSON.parse(await readFile(new URL('./fixtures/raw.json', import.meta.url), 'utf8'));
const T0 = '2026-08-24T06:00:00.000Z';
const T1 = '2026-08-25T06:00:00.000Z';
const build = (now, prev = { recalls: [], incidents: [] }, opts = {}) => {
  let recalls = [
    ...raw.openfda.filter((r) => !opts.dropFda?.includes(r.recall_number)).map((r) => fromOpenFda(r, now)),
    ...raw.fsis.map((r) => fromFsis(r, now)),
    ...raw.rss.map((r) => fromRss(r, now)),
  ];
  const outbreaks = [...raw.core.map((r) => toOutbreak(r, 'fda_core', now)), ...raw.cdc.map((r) => toOutbreak(r, 'cdc_outbreaks', now))];
  carryFirstSeen(recalls, prev.recalls);
  recalls = absorbProvisionals(recalls);
  const tokens = ['cucumber', 'spinach', 'liverwurst', 'deli meat'];
  const { incidents, aliases } = groupIncidents(recalls, outbreaks, tokens, prev.incidents);
  linkOutbreaks(incidents, outbreaks);
  return { recalls, incidents, aliases, outbreaks, reviewQueue: buildReviewQueue(incidents, recalls, tokens, now) };
};

// Day 0: the FDA spinach records haven't been classified yet — only the RSS press release exists.
const day0 = build(T0, undefined, { dropFda: ['F-1101-2026', 'F-1102-2026'] });
t('rss provisional stands alone on day 0', () => { const inc = day0.incidents.find((i) => i.recallIds.some((r) => r.startsWith('rss:example-riverbend'))); assert.ok(inc); assert.equal(inc.severity, 'unclassified'); assert.equal(inc.id, 'inc-rss:example-riverbend-2026-08-01'); });

// Day 1: openFDA classifies the spinach recall (two records, same event_id).
const day1 = build(T1, day0);
const byId = new Map(day1.recalls.map((r) => [r.id, r]));
t('rss absorbed by openFDA record', () => { assert.ok(!byId.has('rss:example-riverbend-2026-08-01')); assert.equal(byId.get('fda:F-1101-2026').absorbedProvisionalId, 'rss:example-riverbend-2026-08-01'); });
t('absorbed record inherits earlier firstSeenAt and press date', () => { const r = byId.get('fda:F-1101-2026'); assert.equal(r.firstSeenAt, T0); assert.equal(r.pressPublishedDate, '2026-08-01'); });
t('layer 0: same event id merges', () => { const inc = day1.incidents.find((i) => i.recallIds.includes('fda:F-1101-2026')); assert.ok(inc.recallIds.includes('fda:F-1102-2026')); assert.equal(inc.groupingConfidence, 'certain'); });
t('first-seen id is stable across the day-0 → day-1 transition', () => { const inc = day1.incidents.find((i) => i.recallIds.includes('fda:F-1101-2026')); assert.equal(inc.id, 'inc-fda:F-1101-2026'); assert.equal(day1.aliases['inc-rss:example-riverbend-2026-08-01'], 'inc-fda:F-1101-2026'); });
t('layer 2: cucumber cascade bridges FDA and FSIS', () => { const inc = day1.incidents.find((i) => i.recallIds.includes('fda:F-1120-2026')); assert.ok(inc.recallIds.includes('fda:F-1131-2026'), 'deli salad'); assert.ok(inc.recallIds.includes('fsis:031-2026'), 'chicken salad'); assert.equal(inc.groupingConfidence, 'likely'); assert.deepEqual(inc.agencies, ['FDA', 'FSIS']); });
t('never merges different agents', () => { const inc = day1.incidents.find((i) => i.recallIds.includes('fsis:034-2026')); assert.equal(inc.recallIds.length, 1); assert.equal(inc.agent, 'e_coli'); });
t('low-confidence hazard never merges on heuristic layers', () => { const inc = day1.incidents.find((i) => i.recallIds.includes('fda:F-1170-2026')); assert.equal(inc.recallIds.length, 1); });
t('incident severity = max child', () => assert.ok(day1.incidents.filter((i) => i.severity === 'class_1').length >= 5));
t('outbreak links only with a food match', () => { const supp = { ...day1.incidents[0] }; const anyLinked = day1.incidents.filter((i) => i.agent === 'salmonella' && i.outbreakIds.length); for (const i of anyLinked) assert.ok(i.recallIds.some((rid) => /cucumber|salad/i.test(byId.get(rid).product.rawDescription + byId.get(rid).title)), i.id); });
t('outbreak links by agent', () => { const inc = day1.incidents.find((i) => i.recallIds.includes('fda:F-1120-2026')); assert.ok(inc.outbreakIds.length === 1); assert.equal(inc.illnessSummary.cases, 44); });
t('scope: unknown propagates as distributionIncomplete', () => { const inc = day1.incidents.find((i) => i.recallIds.includes('fda:F-1140-2026')); assert.equal(inc.scope, 'unknown'); assert.equal(inc.distributionIncomplete, true); });
t('codeStatus rolls up', () => assert.equal(day1.incidents.find((i) => i.recallIds.includes('fda:F-1160-2026')).codeStatus, 'none'));
t('review queue: pathogens only, one entry per chain', () => {
  const mk = (id, agent, type, date) => ({ id, agent, hazardType: type, firstInitiated: date, recallIds: [] });
  const incs = [mk('a', 'undeclared_wheat', 'allergen', '2026-01-01'), mk('b', 'undeclared_wheat', 'allergen', '2026-01-05'), mk('c', 'undeclared_wheat', 'allergen', '2026-01-09'),
    mk('d', 'salmonella', 'pathogen', '2026-02-01'), mk('e', 'salmonella', 'pathogen', '2026-02-10'), mk('f', 'salmonella', 'pathogen', '2026-02-20'), mk('g', 'salmonella', 'pathogen', '2026-03-05'), mk('h', 'salmonella', 'pathogen', '2026-06-01')];
  // No recalls behind these incidents → no candidate tokens → nothing reported, even for the pathogen run.
  assert.equal(buildReviewQueue(incs, [], [], T1).length, 0);
  const rec = (id, text) => ({ id, hazard: { rawReason: text }, product: { rawDescription: text } });
  const withRecalls = incs.map((i) => ({ ...i, recallIds: [`r-${i.id}`] }));
  const recs = withRecalls.map((i) => rec(`r-${i.id}`, i.agent === 'salmonella' && i.id !== 'h' ? 'Salmonella in cantaloupe chunks' : 'plain'));
  const q = buildReviewQueue(withRecalls, recs, [], T1);
  assert.equal(q.length, 1); assert.equal(q[0].agent, 'salmonella'); assert.equal(q[0].candidateTokens[0].token, 'cantaloupe'); assert.deepEqual(q[0].incidentIds, ['d', 'e', 'f']);
});
t('review queue: allergens never reported', () => {
  const mk = (id, d) => ({ id, agent: 'undeclared_wheat', hazardType: 'allergen', firstInitiated: d, recallIds: [`r-${id}`] });
  const incs = [mk('a', '2026-01-01'), mk('b', '2026-01-05'), mk('c', '2026-01-09')];
  const recs = incs.map((i) => ({ id: `r-${i.id}`, hazard: { rawReason: 'undeclared wheat in cookies' }, product: { rawDescription: 'cookies' } }));
  assert.equal(buildReviewQueue(incs, recs, [], T1).length, 0);
});
await ta('core scrape prefers the investigation link over the pathogen page', async () => {
  const { scrapeTable } = await import('../build/scrape.js');
  const html = `<table><thead><tr><th>Ref #</th><th>Pathogen</th><th>Product(s) Linked to Illnesses</th><th>Total Case Count</th><th>Status</th></tr></thead>
    <tbody><tr><td>1234</td><td><a href="/food/foodborne-pathogens/listeria-listeriosis">Listeria monocytogenes</a></td><td><a href="/food/outbreaks-foodborne-illness/outbreak-investigation-listeria-monocytogenes-deli-meats-august-2026">Deli meats</a></td><td>9</td><td>Active</td></tr>
    <tr><td>1235</td><td><a href="/food/foodborne-pathogens/salmonella-salmonellosis">Salmonella</a></td><td>Not yet identified</td><td>12</td><td>Active</td></tr></tbody></table>`;
  const rows = scrapeTable(html, 'https://www.fda.gov/food/foodborne-pathogens/investigations-foodborne-illness-outbreaks');
  assert.equal(rows.length, 2);
  assert.match(rows[0].url, /outbreak-investigation-listeria/);
  assert.equal(rows[1].url, 'https://www.fda.gov/food/foodborne-pathogens/investigations-foodborne-illness-outbreaks');
});

console.log('match');
const incs = day1.incidents;
const spinach = incs.find((i) => i.recallIds.includes('fda:F-1101-2026'));
const cukes = incs.find((i) => i.recallIds.includes('fda:F-1120-2026'));
const granola = incs.find((i) => i.recallIds.includes('fda:F-1140-2026'));
const bread = incs.find((i) => i.recallIds.includes('fda:F-1160-2026'));
t('upc full match is certain', () => { const m = evaluate(spinach, byId, { upc: '0 41220 33456 8' }); assert.equal(m.matchBasis, 'upc'); assert.equal(m.headline, 'This is recalled'); });
t('upc full match with 14-digit input', () => assert.equal(evaluate(spinach, byId, { upc: '00041220334568' }).matchBasis, 'upc'));
t('upc with bad check digit in notice is likely, not certain', () => { const m = evaluate(spinach, byId, { upc: '041220334581' }); assert.equal(m.matchBasis, 'upc_unverified'); assert.equal(m.headline, 'May be recalled'); });
t('upc prefix is possible and ranks below full', () => { const m = evaluate(spinach, byId, { upc: '041220' }); assert.equal(m.matchBasis, 'upc_prefix'); assert.ok(m.rank > 0); });
t('upc input states', () => assert.deepEqual(['', '12345', '0412203', '041220334567', '123456789012345'].map(upcInputState), ['empty', 'too_short', 'prefix', 'full', 'too_long']));
t('state + raw product = hedged "Recalled in"', () => { const m = evaluate(cukes, byId, { state: 'NJ', query: 'cucumber' }); assert.equal(m.matchBasis, 'state_and_product'); assert.match(m.headline, /Recalled in New Jersey/); });
t('nationwide + raw product', () => assert.equal(evaluate(spinach, byId, { query: 'spinach' }).matchBasis, 'nationwide_and_product'));
t('product guess hedges', () => assert.equal(evaluate(cukes, byId, { query: 'salad' }).matchBasis, 'product_guess'));
t('unknown distribution with state selected says may affect', () => assert.equal(evaluate(granola, byId, { state: 'OH' }).matchBasis, 'distribution_incomplete'));
t('other state is labeled, not hidden', () => { const m = evaluate(bread, byId, { state: 'OH' }); assert.equal(m.matchBasis, 'other_state'); assert.match(m.headline, /Not listed for Ohio/); });
t('state input normalizes names and codes', () => assert.deepEqual([normalizeStateInput('ohio'), normalizeStateInput('OH'), normalizeStateInput('Ontario')], ['OH', 'OH', null]));
t('ordering never drops items', () => { const rows = orderIncidents(incs, byId, { state: 'OH' }); assert.equal(rows.length, incs.length); assert.equal(rows[rows.length - 1].match.matchBasis, 'other_state'); });
t('zero-input order: class 1 first, nationwide before single-state', () => { const rows = orderIncidents(incs, byId, {}); assert.equal(rows[0].incident.severity, 'class_1'); const order = { nationwide: 0, unknown: 1, international: 1, multi_state: 2, single_state: 3 }; const c1 = rows.filter((r) => r.incident.severity === 'class_1').map((r) => order[r.incident.scope]); assert.equal(c1[0], 0); for (let i = 1; i < c1.length; i++) assert.ok(c1[i] >= c1[i - 1], 'scope order is monotonic'); assert.equal(rows[rows.length - 1].incident.severity, 'class_3'); });
t('state ordering keeps severity bands: nationwide Class I above state-listed Class II', () => { const rows = orderIncidents(incs, byId, { state: 'NJ' }); const sevs = rows.filter((r) => r.match.rank >= 5 && r.match.rank <= 7).map((r) => r.incident.severity); const rank = { class_1: 5, alert: 4, unclassified: 3, class_2: 2, class_3: 1 }; for (let i = 1; i < sevs.length; i++) assert.ok(rank[sevs[i]] <= rank[sevs[i - 1]], sevs.join(',')); const c1 = rows.filter((r) => r.incident.severity === 'class_1' && r.match.rank >= 5 && r.match.rank <= 7); assert.equal(c1[0].match.matchBasis, 'state_only', 'your state first within the band'); });
await ta('titles localize from parts; firm stays', async () => { const { incidentTitleFor } = await import('../src/i18n.js'); const inc = day1.incidents.find((i) => i.recallIds.includes('fda:F-1101-2026')); assert.match(incidentTitleFor('es', inc.titleParts, inc.title), /^Listeria en verduras de hoja — Riverbend/); assert.match(incidentTitleFor('ko', inc.titleParts, inc.title), /잎채소 리스테리아 — Riverbend/); assert.match(incidentTitleFor('zh', inc.titleParts, inc.title), /^叶菜中的李斯特菌 — Riverbend/); const gran = day1.incidents.find((i) => i.recallIds.includes('fda:F-1140-2026')); assert.match(incidentTitleFor('es', gran.titleParts, gran.title), /Leche no declarad/); });
t('barcode + state: full match outranks state', () => { const rows = orderIncidents(incs, byId, { state: 'VT', upc: '088888111117' }); assert.equal(rows[0].incident.recallIds[0], 'fda:F-1150-2026'); });




console.log('fsis real shape');
const fsisReal = JSON.parse(await readFile(new URL('./fixtures/fsis-real-sample.json', import.meta.url), 'utf8'));
const fsisRecs = fsisReal.map((r) => fromFsis(r, T1)).filter(Boolean);
t('spanish rows are dropped', () => { assert.ok(fsisReal.filter((r) => r.langcode === 'Spanish').length >= 1); assert.ok(fsisRecs.every((r) => !/Retira/.test(r.title))); });
t('apostrophe entity decoded', () => assert.ok(fsisRecs.some((r) => r.title.startsWith("Ukrop's"))));
t('status from recall type, not active_notice', () => { const active = fsisRecs.filter((r) => r.status === 'ongoing'); assert.ok(active.length >= 10); assert.ok(fsisRecs.find((r) => r.nativeId === '002-2014').status === 'completed'); });
t('public health alert → severity alert, ongoing', () => { const pha = fsisRecs.find((r) => r.nativeId.startsWith('PHA-')); assert.equal(pha.severity, 'alert'); assert.equal(pha.noticeType, 'public_health_alert'); assert.equal(pha.status, 'ongoing'); });
t('states array → distribution', () => { const r = fsisRecs.find((r) => r.nativeId === '012-2026'); assert.deepEqual(r.distribution.states, ['NC', 'VA', 'WV']); assert.equal(r.distribution.scope, 'multi_state'); });
t('nationwide array value', () => assert.equal(fsisRecs.find((r) => r.nativeId === '017-2026').distribution.scope, 'nationwide'));
t('firm from summary when establishment is empty', () => { const r = fsisRecs.find((r) => r.nativeId === '017-2026'); assert.match(r.firm.raw, /Indus Foods/); });
t('"produced without benefit of inspection" is a hazard type', () => assert.equal(fsisRecs.find((r) => r.nativeId === '017-2026').hazard.type, 'uninspected'));
t('no fsis record is left with an unread hazard', () => assert.deepEqual(fsisRecs.filter((r) => r.hazard.confidence === 'low').map((r) => r.nativeId), []));
t('consumer instruction extracted from FSIS summaries', () => assert.ok(fsisRecs.filter((r) => r.consumerInstruction.extracted).length >= fsisRecs.length * 0.7, `${fsisRecs.filter((r) => r.consumerInstruction.extracted).length}/${fsisRecs.length}`));
t('absolute https source url', () => assert.ok(fsisRecs.every((r) => /^https:\/\/www\.fsis\.usda\.gov\//.test(r.sourceUrl))));

t('termination_date closes a record even if status says Ongoing', () => { const r = fromOpenFda({ ...raw.openfda[0], status: 'Ongoing', termination_date: '20260810' }, T1); assert.equal(r.status, 'terminated'); assert.equal(r.terminationDate, '2026-08-10'); });
t('card date is the notice date, not the ingest date', () => { const inc = day1.incidents.find((i) => i.recallIds.includes('fda:F-1101-2026')); assert.equal(inc.lastUpdated, '2026-08-19'); assert.equal(inc.lastNoticeDate, '2026-08-19'); });
t('isCurrent: open + recent yes; open + 7 months no; closed no', () => {
  const now = new Date('2026-08-25T12:00:00Z');
  assert.equal(isCurrent({ status: 'active', lastNoticeDate: '2026-08-01' }, now), true);
  assert.equal(isCurrent({ status: 'active', lastNoticeDate: '2026-01-15' }, now), false);
  assert.equal(isCurrent({ status: 'closed', lastNoticeDate: '2026-08-01' }, now), false);
  assert.equal(isCurrent({ status: 'active', lastNoticeDate: null, firstInitiated: null }, now), true);
});
t('openFDA rows carry no invented notice link', () => { const r = fromOpenFda(raw.openfda[0], T1); assert.equal(r.sourceUrl, null); assert.match(r.enforcementReportUrl, /^https:\/\/www\.accessdata\.fda\.gov\//); });
t('absorbed press release supplies the notice link', () => assert.equal(byId.get('fda:F-1101-2026').sourceUrl, 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/example-riverbend'));

t('outbreak count: "See Advisory" yields null, never a number', () => { const o = toOutbreak({ ...raw.core[0], cases: 14528, fields: { ...raw.core[0].fields, 'total case count': 'See Advisory' } }, 'fda_core', T1); assert.equal(o.cases, null); });
t('outbreak count: absurd numbers rejected', () => { const o = toOutbreak({ ...raw.core[0], fields: { ...raw.core[0].fields, 'total case count': '14528' } }, 'fda_core', T1); assert.equal(o.cases, null); });
t('outbreak count: header-labeled numeric wins', () => { const o = toOutbreak(raw.core[0], 'fda_core', T1); assert.equal(o.cases, 44); });
await ta('freshness lines localize', async () => {
  const { freshnessLines } = await import('../src/data/live.js');
  const { t: makeT } = await import('../src/i18n.js');
  const st = { snapshot: { ok: true }, sources: { fda_enforcement: { dataThroughDate: '2026-08-19' }, fsis_recall: { fetchedAt: new Date(Date.now() - 3 * 60000).toISOString() } } };
  const ko = freshnessLines(st, makeT('ko'), new Date());
  assert.equal(ko[0].label, 'FDA (기타 전체)'); assert.match(ko[0].detail, /까지 데이터/);
  assert.match(ko.find((l) => l.id === 'usda').detail, /스냅샷 기준 3분 전/);
  const es = freshnessLines(st, makeT('es'), new Date());
  assert.match(es.find((l) => l.id === 'usda').detail, /hace 3 min/);
});
t('outbreak keeps FDA ref and columns', () => { const o = toOutbreak(raw.core[0], 'fda_core', T1); assert.equal(o.id, 'fda_core:1210'); assert.equal(o.fields['recall'], 'Initiated'); });
await ta('page date: "content current as of"', async () => { const { pageDate } = await import('../build/scrape.js'); assert.equal(pageDate('<footer>Content current as of: 08/20/2026</footer>'), '2026-08-20'); assert.equal(pageDate('<p>nothing</p>'), null); });

console.log('multilingual');
const { tokenizeMultilingual } = await import('../src/data/foodwords.js');
t('spanish word expands to english token', () => { const r = tokenizeMultilingual('espinaca fresca'); assert.ok(r.tokens.includes('spinach')); assert.equal(r.origin.spinach, 'espinaca'); });
t('korean word expands', () => assert.ok(tokenizeMultilingual('시금치').tokens.includes('spinach')));
t('chinese word inside a longer run expands', () => assert.ok(tokenizeMultilingual('有机菠菜').tokens.includes('spinach')));
t('spanish query matches an english notice', () => { const m = evaluate(spinach, byId, { query: 'espinaca' }); assert.equal(m.matchBasis, 'nationwide_and_product'); });
t('korean query matches an english notice', () => { const m = evaluate(spinach, byId, { query: '시금치' }); assert.equal(m.matchBasis, 'nationwide_and_product'); });
t('chinese cucumber query matches the cucumber incident', () => { const m = evaluate(cukes, byId, { state: 'NJ', query: '黄瓜' }); assert.equal(m.matchBasis, 'state_and_product'); });
t('lot code: normalized equality is a likely match', () => { const inc = incs.find((i) => i.recallIds.includes('fda:F-1101-2026')); const r = byId.get('fda:F-1101-2026'); assert.ok(r.product.lotCodes.length, 'fixture has lot codes'); const typed = r.product.lotCodes[0].toLowerCase().replace(/(\w)/, ' $1 '); const m = evaluate(inc, byId, { lot: r.product.lotCodes[0].toLowerCase() }); assert.equal(m.matchBasis, 'lot'); assert.equal(m.confidence, 'likely'); });
t('lot code: no lots listed → no lot match', () => { const inc = incs.find((i) => i.recallIds.includes('fda:F-1101-2026')); const m = evaluate(inc, byId, { lot: 'ZZZZ9999' }); assert.notEqual(m.matchBasis, 'lot'); });
t('match echoes the typed word, not the expansion', () => { const m = evaluate(cukes, byId, { query: 'pepino salada' }); assert.equal(m.matchBasis, 'product_guess'); assert.equal(m.evidence.token, 'pepino'); });
await ta('guidance has all four languages per hazard', async () => {
  const g = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../build/hazard-guidance.json', import.meta.url), 'utf8'));
  for (const [k, b] of Object.entries(g)) { if (k.startsWith('_')) continue; for (const l of ['en', 'es', 'ko', 'zh']) { assert.ok(b.langs[l]?.who && b.langs[l]?.lines?.length, `${k}.${l}`); assert.ok(Array.isArray(b.langs[l].checks), `${k}.${l}.checks`); } }
});
await ta('i18n coverage: every language has every key', async () => {
  const { i18nCoverage } = await import('../src/i18n.js');
  for (const [lang, missing] of Object.entries(i18nCoverage())) assert.deepEqual(missing, [], `${lang} missing: ${missing.join(', ')}`);
});
await ta('i18n falls back to english', async () => { const { t } = await import('../src/i18n.js'); const T = t('ko'); assert.equal(T.sev_class_1[0], '1등급'); assert.equal(t('es').disp_discard, 'Tírelo a la basura.'); assert.equal(t('en').notMatchingFold(5), 'Not matching what you entered (5)'); });

console.log('drift detection');
const { computeParseHealth, checkDrift } = await import('../build/health.js');
t('health computes per-source rates', () => { const h = computeParseHealth(day1.recalls); assert.ok(h.fda.n > 0); assert.ok(h.fda.hazardPct >= 0 && h.fda.hazardPct <= 100); });
t('drift: floor violation flagged at n>=40', () => { const bad = { fda: { n: 100, hazardPct: 30, statesPct: 80, codesPct: 50 }, fsis: { n: 10 }, rss: { n: 0 } }; const v = checkDrift(bad, null); assert.equal(v.length, 1); assert.match(v[0], /fda.hazardPct/); });
t('drift: sharp drop flagged even above floor', () => { const prev = { fda: { n: 100, hazardPct: 90, statesPct: 80, codesPct: 50 } }; const cur = { fda: { n: 100, hazardPct: 65, statesPct: 80, codesPct: 50 }, fsis: { n: 0 }, rss: { n: 0 } }; const v = checkDrift(cur, prev); assert.equal(v.length, 1); assert.match(v[0], /dropped 90% → 65%/); });
t('drift: small samples never trigger', () => { const cur = { fda: { n: 12, hazardPct: 0, statesPct: 0, codesPct: 0 }, fsis: { n: 5 }, rss: { n: 0 } }; assert.equal(checkDrift(cur, null).length, 0); });
t('drift: healthy data passes', () => { const h = { fda: { n: 2000, hazardPct: 85, statesPct: 70, codesPct: 45 }, fsis: { n: 200, hazardPct: 90, statesPct: 88, instructionPct: 85 }, rss: { n: 60, titlePct: 100 } }; assert.equal(checkDrift(h, h).length, 0); });

console.log('scrapers');
const { scrapeCdcCounts, parseRss } = await import('../build/scrape.js');
t('cdc counts: current page shape', () => {
  const html = `<h2>Investigations</h2><p>Active investigations by germ</p><ul><li><strong><em>Campylobacter</em>:</strong> 2</li><li><strong><em>E. coli:</em></strong> 5</li><li><strong><em>Listeria</em></strong>: 7</li><li><strong><em>Salmonella</em></strong>: 23</li></ul><p>Last updated: 8/19/2026</p>`;
  const c = scrapeCdcCounts(html);
  assert.deepEqual(c.byAgent, { campylobacter: 2, e_coli: 5, listeria: 7, salmonella: 23 });
  assert.equal(c.lastUpdated, '2026-08-19');
});
t('cdc counts: unrecognized page throws (never silently zero)', () => assert.throws(() => scrapeCdcCounts('<p>Nothing here</p>')));
t('rss: parses items with CDATA', () => {
  const xml = `<rss><channel><item><title><![CDATA[Acme Recalls Widgets]]></title><link>https://x/y</link><guid>abc</guid><pubDate>Sun, 23 Aug 2026 15:00:00 EST</pubDate><description><![CDATA[Acme of Fresno is recalling widgets.]]></description></item></channel></rss>`;
  const items = parseRss(xml); assert.equal(items.length, 1); assert.equal(items[0].title, 'Acme Recalls Widgets'); assert.equal(items[0].guid, 'abc');
});

console.log(`\n${n} checks passed`);
