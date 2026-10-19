// outbreaks.js — how the Outbreaks page groups FDA's investigation table. Pure functions, no DOM.
//
// Two different questions hide in FDA's table: "is FDA still working on this?" (investigation
// status) and "are people still getting sick?" (outbreak/event status). A consumer page answers
// the second. So:
//   active  = investigation open AND outbreak not marked ended (null = unknown = treated as ongoing)
//   ended   = everything else, grouped by the year it was posted, newest first
// A row whose outbreak ended but whose investigation is still open is tagged, not dropped —
// it moves between tabs, it never disappears.
//
// Within a tab, rows group by germ; rows with no identified food fold into one line per germ.
// Nothing here is removed: every fold carries its count and can be opened.

const UNKNOWN_FOOD = /^\s*(not\s+(yet\s+)?identified|unknown|tbd|n\/?a)\s*\d*\s*$/i;
export const NEW_DAYS = 30;
export const AGENT_ORDER = ['salmonella', 'e_coli', 'listeria', 'cyclospora', 'hepatitis_a', 'botulism', 'cronobacter', 'norovirus', 'campylobacter', 'chemical'];

/** FDA writes "Not Yet\nIdentified", "Not Identified 2", etc. All mean the same thing. */
export function foodIdentified(o) {
  return !!(o.foodGuess && !UNKNOWN_FOOD.test(String(o.foodGuess).replace(/\s+/g, ' ')));
}

/** Single-line food name as published: newlines collapsed, nothing curated. */
export function foodText(o) {
  return String(o.foodGuess || '').replace(/\s+/g, ' ').trim();
}

/** The outbreak is still making people sick. Unknown status counts as ongoing (cautious). */
export function isOngoing(o) {
  return o.status === 'active' && o.eventStatus !== 'ended';
}

/** Investigation still open although the outbreak itself has ended — shown under Ended, tagged. */
export function investigationStillOpen(o) {
  return o.status === 'active' && o.eventStatus === 'ended';
}

export function isNew(o, now = new Date(), days = NEW_DAYS) {
  if (!o.lastUpdated) return false;
  return (now - new Date(o.lastUpdated + 'T12:00:00Z')) / 86400000 <= days;
}

/** Search query for "See recalled products": the food as published, minus FDA's parentheticals. */
export function searchQueryFor(o) {
  if (!foodIdentified(o)) return null;
  const q = foodText(o).replace(/\([^)]*\)/g, '').replace(/\b(multi-ingredient|suspect(ed)?)\b/gi, '').replace(/\s+/g, ' ').trim();
  return q || null;
}

/** 'FDA' | 'USDA' | null — who published the advisory, from its host. */
export function advisoryAgency(o) {
  if (!o.advisoryUrl) return null;
  return /fsis\.usda\.gov/i.test(o.advisoryUrl) ? 'USDA' : 'FDA';
}

const byDateDesc = (a, b) => String(b.lastUpdated || '').localeCompare(String(a.lastUpdated || '')) || (b.cases || 0) - (a.cases || 0);

/** Group one list of outbreaks by agent: [{ agent, n, named: [...], unknown: { n, cases, dates, items } }], germ order fixed. */
export function groupByAgent(list) {
  const map = new Map();
  for (const o of list) {
    const key = o.agent || 'other';
    if (!map.has(key)) map.set(key, { agent: key, n: 0, named: [], unknown: { n: 0, cases: 0, casesKnown: 0, dates: [], items: [] } });
    const g = map.get(key);
    g.n++;
    if (foodIdentified(o)) g.named.push(o);
    else { g.unknown.n++; g.unknown.items.push(o); if (o.cases != null) { g.unknown.cases += o.cases; g.unknown.casesKnown++; } if (o.lastUpdated) g.unknown.dates.push(o.lastUpdated); }
  }
  for (const g of map.values()) { g.named.sort(byDateDesc); g.unknown.items.sort(byDateDesc); g.unknown.dates.sort().reverse(); }
  const rank = (a) => { const i = AGENT_ORDER.indexOf(a); return i < 0 ? AGENT_ORDER.length : i; };
  return [...map.values()].sort((a, b) => rank(a.agent) - rank(b.agent) || b.n - a.n);
}

/**
 * The whole page in one call.
 * @returns {{ active: Group[], activeN, ended: { year, n, groups: Group[] }[], endedN, agentsActive: {agent,n}[], agentsEnded: {agent,n}[] }}
 */
export function splitOutbreaks(outbreaks, now = new Date()) {
  const list = (outbreaks || []).filter((o) => o.source === 'fda_core');
  const activeList = list.filter(isOngoing);
  const endedList = list.filter((o) => !isOngoing(o));
  const years = new Map();
  for (const o of endedList) {
    const y = (o.lastUpdated || '').slice(0, 4) || 'undated';
    if (!years.has(y)) years.set(y, []);
    years.get(y).push(o);
  }
  const ended = [...years.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([year, rows]) => ({ year, n: rows.length, groups: groupByAgent(rows) }));
  const countAgents = (rows) => { const c = {}; for (const o of rows) c[o.agent || 'other'] = (c[o.agent || 'other'] || 0) + 1; return groupByAgent(rows).map((g) => ({ agent: g.agent, n: g.n })); };
  return { active: groupByAgent(activeList), activeN: activeList.length, ended, endedN: endedList.length, agentsActive: countAgents(activeList), agentsEnded: countAgents(endedList), now };
}

/** Apply a germ chip to a split result. 'all' is identity. */
export function filterByAgent(split, agent) {
  if (!agent || agent === 'all') return split;
  const keep = (g) => g.agent === agent;
  return {
    ...split,
    active: split.active.filter(keep),
    activeN: split.active.filter(keep).reduce((s, g) => s + g.n, 0),
    ended: split.ended.map((y) => { const groups = y.groups.filter(keep); return { ...y, groups, n: groups.reduce((s, g) => s + g.n, 0) }; }).filter((y) => y.n > 0),
    endedN: split.ended.reduce((s, y) => s + y.groups.filter(keep).reduce((t, g) => t + g.n, 0), 0),
  };
}
