# FoodCheck — data layer

## Run
```
node test/run.mjs                        # 57 checks, no network
node build/build-snapshot.mjs --fixture  # writes data/snapshot.json from test/fixtures/raw.json
node build/build-snapshot.mjs            # real fetch; ~30 openFDA requests keyless, fine for a first run
OPENFDA_API_KEY=... node build/build-snapshot.mjs   # same, keyed (needed on a schedule)
```
Open `build/probe-cors.html` in a browser to test which sources allow browser fetch. Report the table
before trusting any source in the live lane. Probe result 2026-08-25: openFDA yes, FSIS yes, FDA RSS no, FDA CORE no. `src/data/live.js` fetches only openFDA from the browser (2 requests per load). FSIS allows browser fetch but its only endpoint is the full 13 MB archive, so USDA is snapshot-only.

## See the page
```
node serve.mjs          # then open http://localhost:8000 in a browser
```
Double-clicking index.html won't work: browsers refuse to load data files from file://.

## Routes and sharing
Hash routes work on any static host with no configuration: `#/` home, `#/active`, `#/outbreaks`,
`#/about`, `#/incident/{id}`, `#/review` (maintainer view of the grouping queue). Inputs travel in
the URL (`#/?state=ohio&q=spinach&upc=041220334568`) — full state names, never two-letter codes —
so a texted link opens exactly what the sender saw. The Share button on an incident uses the
system share sheet on phones and copies the link elsewhere.

## Languages
The UI (headings, inputs, severity meanings, result language, disposal verbs, at-risk medical
blocks) is built in English, Spanish, Korean, and Simplified Chinese — switch in the header;
the choice travels in the URL (`?lang=es`) so shared links open in the sender's language.
Searches work across languages: espinaca / 시금치 / 菠菜 all find spinach (src/data/foodwords.js).
Agency notice text stays as published (marked lang="en" so browser translation and screen
readers handle it), except USDA recalls, where the official USDA Spanish notice is shown to
Spanish users. The es/ko/zh at-risk medical blocks each carry their own checks[] in
build/hazard-guidance.json and display as unverified — in that language — until a person who
reads it confirms them against the cited source. Barcodes, lot codes, and recall numbers are
marked translate="no" so machine translation can never alter them.

## Optional: USDA establishment list (FSIS_MPI_URL)
The build logs `USDA establishment list · skipped` unless configured. This source is the FSIS
Meat, Poultry and Egg Product Inspection Directory — a monthly list of every USDA-inspected
establishment. It is OPTIONAL and low-value here: it only backfills company names on the rare
USDA notice that lacks one. To enable it anyway:
1. Open https://www.fsis.usda.gov/inspection/establishments/meat-poultry-and-egg-product-inspection-directory
2. Under the downloadable files, right-click the CSV (preferred) or JSON link and copy its address.
   The address changes monthly — the page always links the current one. (The Excel/PDF versions
   aren't supported by the build.)
3. Locally: run `FSIS_MPI_URL="<that address>" node build/build-snapshot.mjs`.
   On GitHub: repo Settings → Secrets and variables → Actions → Variables → New variable,
   name FSIS_MPI_URL, value = the address. The workflow picks it up on the next run.
If the file format turns out to be Excel-only that month, leave it skipped — the site loses
nothing users can see.

## Drift detection
FDA and FSIS change formats without notice; parsers then extract less without erroring. Every
build computes extraction rates per source (`health` lines in the log; also on #/review) and
compares them to the previous snapshot. If a rate falls below an absolute floor or drops more
than 18 points, the build **keeps the previous snapshot, prints what moved, and exits non-zero**
— on GitHub the Action turns red and emails you. If the change is expected, rerun with
`node build/build-snapshot.mjs --force`. Rules and floors live in build/health.js.

## Languages
All seven (English, Español, 한국어, 中文, Tiếng Việt, Tagalog, Kreyòl Ayisyen) now cover every
page: home, search, cards, incident, About, Outbreaks, All active, and the stamp. A test
(i18nCoverage) fails the suite if any language is ever missing any string key. The #/review
maintainer page stays English by design, and agency notice text renders as published (marked for
browser translation). The at-risk medical translations still need per-language human sign-off in
build/hazard-guidance.json checks[] — Haitian Creole most urgently.

## Screen layout (October 2026 UX pass)
Home is one question and one box: "What's in your kitchen?", Search, Scan. Barcode and lot-code
typed entry sit behind "More ways to search". The state is a single row above the list whose
select is also the change control; it and the language are remembered in localStorage (the only
browser storage the site uses; a URL param always wins so shared links open as sent). The
freshness stamp and blind-spot bar moved from the masthead to directly above the list they
describe. Cards lead with the food (the product line when one notice names it briefly, else the
food categories), then hazard · where sold; severity is a short chip; the plain sentence and full
title are behind Details. The main list shows six at a time with a counted "Show N more"; a
chosen state folds other-state recalls as "Sold only in other states (N)". The incident page
puts What to do first, then "Is this yours?" with one card per notice (company, product line,
that notice's codes), then where sold, illness reports, and notices. The tile map was removed;
it is in git history if wanted back.

## Outbreaks page (October 2026 redesign)
Grouped by germ, two tabs (Active / Ended) with counts, germ chips with counts. "Active" means
the outbreak is still making people sick — FDA's *outbreak/event status* column, now parsed as
`eventStatus` in normalize.js — not merely that FDA's investigation file is open. A row whose
outbreak ended while the investigation stays open sits under Ended tagged "Investigation still
open"; it moves tabs, it never disappears. Rows with no identified food fold to one line per germ
(summed cases, posted dates) that opens to the individual rows. Ended is grouped by year, newest
first, current year open. Each named entry shows the current count (plus "up from N on date"
when history.json has seen a change), posted date, the agency's advisory link, and "See recalled
products", which is a FoodCheck search for that food (the old per-outbreak linked-recall lists
were the loose matcher's output and overlinked). Stage fields and the full count history are
behind Details. Germ summaries live in build/hazard-guidance.json (`summary` per language with
`summaryChecks[]`) and show "Not yet checked by a person" until signed. The CDC-vs-FDA comparison
moved to About; the CDC outbreak-list link stays in the page footer. Grouping rules are pure
functions in src/data/outbreaks.js with tests.

## Outbreak count history
The snapshot only ever holds today's case count per FDA CORE investigation. `data/history.json`
keeps what the table said on each date we checked, so an incident or Outbreaks entry can show
"12 on Jan 3 → 34 on Jan 19 → 41 on Feb 2" instead of one number. Rules, all enforced in
build/history.js and its tests: a row is appended only when a count or status changes (hourly
runs that see nothing new add nothing); no row is ever written on a run where FDA CORE failed
(those outbreaks are carried copies, and "seen today" would be a fabricated observation); a
decrease is recorded as-is because agencies revise counts; fixture builds never touch the file.
The SPA fetches it lazily (src/data/live.js `loadHistory`) the first time an incident with linked
outbreaks or the Outbreaks page opens, and shows one line per observation with the agency's own
posted date where it moved, else the day we saw the change. The same file records parse-health
once per day (`health`), so drift can be read as a series, not just against one baseline.

## Deploying
It's a folder of static files. Push it to GitHub Pages, Netlify, Cloudflare Pages, or any web
server; nothing to configure because routing is hash-based. Keep the GitHub Action running so
data/snapshot.json, data/archive.json, and data/history.json refresh every hour.

## Layout
```
index.html              the app shell (fonts, Tailwind, React, Babel — no build step)
src/app.jsx             the UI: first paint, narrow-it-down, result language, incident screen
src/data/parse.js       free-text parsers (hazard, distribution, UPC/lot/date, instruction, disposal)
src/data/normalize.js   openFDA / FSIS / RSS / outbreak rows → one Recall shape
src/data/reconcile.js   RSS absorption, 4-layer grouping, first-seen ids, aliases, review queue
src/data/match.js       "does this affect me" evaluation + result-language table + ordering
src/data/live.js        browser loader: snapshot.json + openFDA delta (2 requests per load)
src/data/outbreaks.js   Outbreaks page grouping: active/ended rule, germ groups, unknown folds, year folds
build/build-snapshot.mjs   scheduled job → data/snapshot.json
build/history.js        per-outbreak count observations → data/history.json (append-only-on-change)
build/hazard-guidance.json at-risk copy with citations { title, url, checkedAt, lastReachableAt }
build/ingredient-tokens.json  layer-2 tokens; reviewQueue in the snapshot says when it's incomplete
```
Every `src/data/*.js` file is plain ESM with no dependencies and runs in both Node and the browser.
