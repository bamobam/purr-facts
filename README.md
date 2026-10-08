# Purr Facts

A free, browsable database of Canadian cat foods. It compares foods on what the label says **per calorie**, shows cited recall and safety flags for each food, and finds alternatives to the food your cat already eats.

**Live:** https://purr-facts.onrender.com

## What it is, and what it is not

- **A data tool, not advice.** It reports numbers, their basis, their source and their date. It has no quality score, no "best cat food" list and no claims such as "good for senior cats". Higher protein per calorie is a fact about a label, not a recommendation: it suits some cats and not others. Talk to a vet about your cat.
- **Found a mistake?** Every food page and the About page have a "Report an error" button (see `REPORT_URL` under Deployment).
- **Built for a cat owner choosing or switching food:** "My cat eats X. What else is there?"
- **Honest about vague labels.** Labels give guaranteed *minimums* for protein and fat and *maximums* for fibre and moisture, not measured values. Every figure shows its basis ("≥ 9%"), and the real amount is at least the minimum.
- **Small on purpose.** 33 complete foods from 9 brands sold in Canada, as of 2026-10-07 (the v1 goal is 60 or more). Kitten, prescription and treat products are out of scope.

## Screens

1. **Browse:** search and filter, sort on any column, switch protein and fat between per 1000 kcal, dry matter and as fed, tick up to four foods to compare.
2. **Food page:** label figures with basis, source link and last-checked date; per-calorie and price figures; where the food sits among similar foods; alternatives; recalls with a "what was checked" section.
3. **Compare:** two to four foods side by side. "Highest" and "lowest" mark the extreme in a row; they are not recommendations.
4. **About this data:** the methods, sources, limits and freshness, in plain language.

## Recall and safety flags: scope and disclaimer

Entries are recalls, market withdrawals and safety alerts from the last 10 years, in three labelled kinds:

- **Regulator notices:** from the CFIA or Health Canada, or from the FDA.
- **Company or trade reports:** a dated recall named in the manufacturer's own announcement or reported by the trade or veterinary press.
- **Regulator investigations:** shown separately and never counted as recalls.

Every entry shows its region. A US notice does not by itself mean a Canadian lot was affected, so check the notice for lot numbers. Dog-only recalls are not listed, because dogs and cats have different nutrient needs. Consumer complaints, social media posts and lawsuits are not included.

Pet food recall reporting in Canada is largely voluntary, and the official Canadian list is known to miss at least one national cat food recall (the 2021 Whiskas recall), so **a food with no entry has not necessarily never been recalled.** The site says "No recall or safety alert names this food in the sources we checked, as of <date>", never "safe". Which sources were searched, and when, is recorded in `data/incident-checks.csv` and shown on the site.

## How the numbers are worked out

| Measure | How |
|---|---|
| Grams per 1000 kcal | grams of protein or fat in the amount of food that supplies 1000 kcal; puts wet and dry on the same footing |
| Dry matter | as-fed % ÷ (100 − moisture) × 100 |
| Share of calories | protein 3.5 kcal/g, fat 8.5 kcal/g |
| Price (CAD) | median of retailer listings from the last 90 days, per lb, per kg and per 1000 kcal; foods with no recent listing are left out of price comparisons |
| Peers | same food type and same label life stage (adult maintenance, all life stages, or not stated); the AAFCO or FEDIAF standard is a badge, not a grouping |
| Position among peers | share of the other peers with a lower value; hidden unless at least 8 other peers have the value |
| Alternatives | peers that beat the food on **one** chosen measure; there is no combined score |

The full source notes for every row, what was dropped and why, and the data-quality caveats are in [`docs/data-provenance.md`](./docs/data-provenance.md). The spec is in [`docs/spec-v1.md`](./docs/spec-v1.md) and the design in [`docs/system-design-v1.md`](./docs/system-design-v1.md).

## Status against the v1 goals

| Goal | Status |
|---|---|
| At least 60 foods from about 12 brands, every row verified against a source | **Not met:** 33 foods, 9 brands, all validated |
| Price coverage of at least 70% | Met: 100% (33 of 33), mixed manual and automated |
| Derived metrics, tested | Met |
| Recalls checked for every food, including "none found" | Met, with the limits above |
| Browse, food page with alternatives, compare, deployed | Built; deployed when `main` is released |
| README states the positioning and the recall scope | This file |

## The data pipeline

CSV files in git are the source of truth. A build step validates them, computes the derived metrics and writes JSON that the server loads into memory at startup.

```
data/curated-products.csv   data/prices.csv   data/incidents.csv   data/incident-checks.csv
                     │
              npm run build:data   (validate, derive, write)
                     │
        data/products.json   data/meta.json   data/incidents.json
                     │
              Express API  ──►  Vite + React frontend (web/)
```

`npm run validate:data` fails on missing fields, bad enums, nutrients with no basis, out-of-range values, duplicates, bad price rows, an unknown product in an incident, or a catalog brand whose recall pages were never searched. It **warns** on a label calorie figure that disagrees with an estimate from protein, fat and moisture, and on prices or recall searches older than 90 days.

## API

| Endpoint | Returns |
|---|---|
| `GET /products` | Foods, filtered by `brand`, `variant`, `foodType`, `adequacyStandard`, `adequacyStage`, `proteinPctMin/Max`, `fatPctMin/Max` |
| `GET /products/:id` | Food, derived metrics, benchmarks (`includeAllStages=true\|false`), linked and brand-level incidents, and what was checked and when |
| `GET /products/:id/alternatives?goal=protein\|price` | Peers that beat the food on that goal, with the difference; `includeAllStages`, `limit` |
| `GET /products/aggregate` | Group and aggregate: `groupBy`, `metric` (`count`, `avg:proteinPct`, …), `having`, `sort`, `order` |
| `GET /incidents` | Incidents, filtered by `productId`, `brand`, `jurisdiction`, `evidenceTier`; newest first |
| `GET /config` | The report-an-error link, if `REPORT_URL` is set |
| `GET /meta` | Build date, price coverage, oldest verified dates, recall scope text, sources checked |
| `GET /health` | 200 with the product count; 503 if the dataset is empty |

```bash
# Alternatives to IAMS Proactive Health Healthy Adult that cost less per 1000 kcal
curl "http://localhost:3000/products/curated-26/alternatives?goal=price&limit=3"

# Average as-fed protein by food type and label life stage (compare like with like; averaging wet with dry is misleading)
curl "http://localhost:3000/products/aggregate?groupBy=foodType,adequacyStage&metric=avg:proteinPct"
# [{"foodType":"wet","adequacyStage":"adult-maintenance","metric":10.2,"count":11}, {"foodType":"dry","adequacyStage":"adult-maintenance","metric":32.9,"count":10}, ...]

# Brands by average protein, above-average only
curl "http://localhost:3000/products/aggregate?groupBy=brand&metric=avg:proteinPct&having=above-average&sort=metric&order=desc"
```

## Development

```bash
npm install
npm run dev              # API on :3000 (serves web/dist if it has been built)
npm run web:dev          # Vite dev server on :5173, proxying the API on :3000
npm run web:build        # build the frontend into web/dist
npm run validate:data    # check data/*.csv (also runs in CI)
npm run build:data       # validate, then regenerate the JSON the server loads
npm test                 # unit and API tests
npm run typecheck        # server and frontend
npm run build            # compile the server and build the frontend
```

Adding a food: add a row to `data/curated-products.csv` with its source URL and `lastVerified` date, add price rows to `data/prices.csv`, run `npm run build:data`, then search for recalls for any new brand and record the check in `data/incident-checks.csv` (the build refuses a brand with no recorded search).

## Deployment

The app ships as one Docker image: the build stage validates the CSVs (a data error fails the build), regenerates the JSON, compiles the server and builds the frontend; the runtime stage runs `node dist/rest/server.js` on `PORT` (default 3000). Use `/health` as the platform's health check. CI builds the image and boots it, then checks that the health endpoint, the frontend, the metadata and the alternatives endpoint respond, because an earlier release crash-looped when the data files were missing from the image and the platform quietly kept serving an older container.

Set `REPORT_URL` (a runtime environment variable, no rebuild needed) to the page where error reports should go, for example a Google Form. `{food}` in the URL is replaced with the food's name and id, so a form field can be prefilled (Google Forms: use the form's "Get pre-filled link" and put `{food}` where the sample answer is). With no `REPORT_URL` the button is hidden. `GET /config` serves it to the frontend.

A monthly workflow (`data-freshness`) runs `npm run validate:data:strict`, which fails on any warning, so stale prices or out-of-date recall searches show up as a red run.

## Known limitations

- Prices are point-in-time listings, some entered by hand; retailers change them often.
- Fromm's figures come from its North American site, not a Canadian label.
- Foods with no stated life stage have no peers to compare with.
- The aggregate endpoint averages over foods that have the value but reports the full group size as `count`, and its `having` filter compares group averages, not product averages. Both are known and not yet fixed.
- Sorting and filtering on derived values run in the browser, which is fine at this catalog size.
