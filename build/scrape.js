// scrape.js — dependency-free RSS and HTML scrapers used by the build step. Kept separate so they can be tested without running a build.
import { stripHtml } from '../src/data/parse.js';

// ---------- RSS (no dependency; the FDA feed is plain RSS 2.0) ----------
export function parseRss(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const tag = (t) => { const r = block.match(new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${t}>`, 'i')); return r ? r[1].trim() : null; };
    items.push({ title: tag('title'), link: tag('link'), guid: tag('guid') || tag('link'), pubDate: tag('pubDate'), description: tag('description') || '' });
  }
  return items;
}

// ---------- HTML scrapers: best-effort, loud on failure ----------
// These parse table rows into { title, pathogen, product, states, cases, status, url, updated }.
// The page structures are not under our control; a scrape that yields zero rows is recorded
// as a failure (not as "no outbreaks") so the UI never mistakes a broken selector for calm.
export function scrapeTable(html, baseUrl) {
  const rows = [];
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  for (const table of tables) {
    const headers = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => stripHtml(m[1]).toLowerCase());
    if (!headers.length) continue;
    const idx = (re) => headers.findIndex((h) => re.test(h));
    const ci = { date: idx(/date|updated|posted/), pathogen: idx(/pathogen|organism|agent|illness/), product: idx(/product|food|source|vehicle/), cases: idx(/case|ill|sick/), hosp: idx(/hospital/), deaths: idx(/death/), states: idx(/state/), status: idx(/status|outcome|stage/), title: idx(/title|investigation|outbreak/) };
    if (ci.pathogen < 0 && ci.title < 0 && ci.product < 0) continue;
    for (const tr of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cellsRaw = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
      if (!cellsRaw.length) continue;
      const cells = cellsRaw.map((c) => stripHtml(c));
      // Rows link the pathogen name to FDA's general pathogen page (/foodborne-pathogens/listeria-...).
      // The investigation's own page, when it exists, sits in the product/title cell. Prefer that;
      // never fall back to a pathogen explainer.
      const isExplainer = (h) => /\/foodborne-pathogens\/(?!investigations)/i.test(h) || /\/(listeria|salmonella|e-coli|escherichia|botulism|norovirus|hepatitis)[a-z-]*$/i.test(h);
      const hrefsIn = (html) => [...(html || '').matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
      const preferred = [ci.product, ci.title].filter((i) => i >= 0).flatMap((i) => hrefsIn(cellsRaw[i])).find((h) => !isExplainer(h))
        || hrefsIn(tr[1]).find((h) => /outbreak|investigation|advisory|advisories/i.test(h) && !isExplainer(h))
        || null;
      const link = preferred;
      const num = (i) => (i >= 0 && cells[i] ? Number(String(cells[i]).replace(/[^\d]/g, '')) || null : null);
      const pick = (i) => (i >= 0 ? cells[i] || null : null);
      const fields = {};
      headers.forEach((h, i) => { if (cells[i]) fields[h] = cells[i]; });
      rows.push({
        fields,
        ref: (() => { const i = headers.findIndex((h) => /ref|reference|id\b/.test(h)); return i >= 0 ? cells[i] || null : null; })(),
        id: `${pick(ci.pathogen) || ''}-${pick(ci.product) || pick(ci.title) || ''}-${pick(ci.date) || ''}`,
        title: pick(ci.title) || `${pick(ci.pathogen) || ''} ${pick(ci.product) || ''}`.trim(),
        pathogen: pick(ci.pathogen), product: pick(ci.product), states: pick(ci.states),
        cases: num(ci.cases), hospitalizations: num(ci.hosp), deaths: num(ci.deaths),
        status: pick(ci.status) || 'active', updated: pick(ci.date),
        url: link ? new URL(link, baseUrl).href : baseUrl,
      });
    }
  }
  return rows;
}
/**
 * CDC "Current Outbreaks" page: no per-outbreak table anymore, just active-investigation counts
 * per germ and a last-updated date. Returns { lastUpdated, byAgent: { listeria: 7, ... } }.
 */
export function scrapeCdcCounts(html) {
  const text = stripHtml(html);
  const byAgent = {};
  const map = { campylobacter: 'campylobacter', 'e. coli': 'e_coli', 'e.coli': 'e_coli', 'e coli': 'e_coli', listeria: 'listeria', salmonella: 'salmonella' };
  for (const [label, agent] of Object.entries(map)) {
    const m = text.match(new RegExp(`${label.replace('.', '\\.')}\\s*:?\\s*(\\d{1,3})\\b`, 'i'));
    if (m) byAgent[agent] = Number(m[1]);
  }
  const upd = text.match(/last\s+updated:?\s*(\d{1,2}\/\d{1,2}\/\d{4}|[A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/i);
  if (!Object.keys(byAgent).length) throw new Error('no per-germ counts found — page structure may have changed');
  return { lastUpdated: upd ? (new Date(upd[1]).toISOString().slice(0, 10)) : null, byAgent };
}

/** FDA pages print "Content current as of: MM/DD/YYYY" near the footer. Returns ISO date or null. */
export function pageDate(html) {
  const text = stripHtml(html);
  const m = text.match(/content\s+current\s+as\s+of:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i)
    || text.match(/last\s+updated:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}
