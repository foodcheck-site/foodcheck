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

## Deploying
It's a folder of static files. Push it to GitHub Pages, Netlify, Cloudflare Pages, or any web
server; nothing to configure because routing is hash-based. Keep the GitHub Action running so
data/snapshot.json and data/archive.json refresh every 4 hours.

## Layout
```
index.html              the app shell (fonts, Tailwind, React, Babel — no build step)
src/app.jsx             the UI: first paint, narrow-it-down, result language, incident screen
src/data/parse.js       free-text parsers (hazard, distribution, UPC/lot/date, instruction, disposal)
src/data/normalize.js   openFDA / FSIS / RSS / outbreak rows → one Recall shape
src/data/reconcile.js   RSS absorption, 4-layer grouping, first-seen ids, aliases, review queue
src/data/match.js       "does this affect me" evaluation + result-language table + ordering
src/data/live.js        browser loader: snapshot.json + openFDA delta (2 requests per load)
build/build-snapshot.mjs   scheduled job → data/snapshot.json
build/hazard-guidance.json at-risk copy with citations { title, url, checkedAt, lastReachableAt }
build/ingredient-tokens.json  layer-2 tokens; reviewQueue in the snapshot says when it's incomplete
```
Every `src/data/*.js` file is plain ESM with no dependencies and runs in both Node and the browser.
