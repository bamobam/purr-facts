# Purr Facts v1 spec

Status: agreed in design discussion, 2026-10-05. **Market: Canada** (decided 2026-10-05; see ADR 0008). Supersedes the "query engine over a catalog" framing in `CONTEXT.md`.

## Purpose

A free, browsable cat food database that ranks products on calorie-based metrics, shows cited recall flags per product, and finds alternatives to the food a cat already eats.

- **Market:** Canada. Canadian labels and `.ca` manufacturer pages, Canadian retailers, prices in CAD, recalls from the CFIA and the FDA.
- **Primary user:** a cat owner choosing or switching food. Built so a reviewer reading the repo can see the engineering quality (ADRs, validation, tests).
- **Core interaction:** "My cat eats X. What else is there?" — find alternatives to X, drill into a side-by-side compare.
- **Trust stance:** a data tool, not advice. No quality score, no "good for senior cats" claims. Numbers, their basis, their source, and their date.
- **Success:** portfolio piece first, usable by real people second, with a hard stop (see Definition of done).

## Why label data is vague, and how we handle it

Canadian and US labels both give a guaranteed analysis: *minimum* crude protein and fat, *maximum* fiber and moisture. These are floors and ceilings, not measured values. Calories (kcal ME/kg, and per can or cup) are the one precise figure most labels carry. Unlike the US, Canada has no mandatory nutritional adequacy statement: following a nutrient profile is voluntary, so many but not all labels carry one, and some brands cite the European FEDIAF profiles instead of AAFCO.

Every nutrient value therefore carries a `basis`, shown in the UI ("≥ 9%"), and comparisons say plainly that guaranteed minimums across brands are the best the data allows.

## Metrics

| Tier | Metric | Source |
|---|---|---|
| 1 (label) | protein, fat, fiber, moisture (as-fed); kcal/kg; kcal per can or cup; package size; price | Guaranteed analysis, calorie statement, retailer page |
| 2 (derived, v1) | dry-matter protein and fat = `as-fed / (100 - moisture) * 100` | Computed |
| | grams of protein and fat per 1000 kcal | Computed from kcal/kg |
| | % of calories from protein and fat (3.5 and 8.5 kcal/g) | Computed |
| | price per lb (headline), price per kg, and price per 1000 kcal (fair across wet and dry), all in CAD | Computed from the median of recent multi-retailer price observations |
| 3 (estimate, v2) | carbs as % of calories | Needs ash; estimate and label as estimate |
| 4 (partial, v2) | phosphorus, magnesium, taurine, ingredient list | Only where a brand publishes it |

Ranking basis: **grams per 1000 kcal**, with dry matter shown alongside. As-fed is a toggle.

Not included: subjective ratings, "grain-free"/"premium" labels, any quality score.

## Data model changes

Product (existing fields kept) gains:

| Field | Notes |
|---|---|
| `adequacyStandard` | `aafco` \| `fediaf` \| `none`: which nutrient profile the label cites. Shown as a **badge**; not used for peer groups. |
| `adequacyStage` | `adult-maintenance` \| `all-life-stages` \| `not-stated`: the stage the label claims, under that standard. Replaces `lifeStage`. `none` standard means `not-stated`, and a cited standard cannot be `not-stated`. |
| `parentCompany` | e.g. brand "Fancy Feast", parent "Purina". Filter/display by `brand`; group by either. |
| `packageSizeG`, `packageUnits` | Total grams in the package (Canadian labels are metric); needed for price per lb, per kg and per 1000 kcal. |
| `kcalPerKg`, `kcalPerPackage` | `calorieDensity` renamed/clarified; units documented. |
| `proteinBasis`, `fatBasis`, `fiberBasis`, `moistureBasis` | `guaranteed-min` \| `guaranteed-max` \| `typical` |
| *(prices moved out)* | Prices live in `data/prices.csv`: one row per product, retailer and date (`price` in CAD, `packageSizeG`, `asOf`, `url`), from 3 to 4 popular Canadian retailers (candidates: Chewy, PetSmart, Walmart, Pet Valu, Loblaws), manual entry. Product-level price metrics use the median of the last 90 days. |
| `lastVerified` | Date a human last checked the row against `sourceUrl`. |
| `reformulatedOn?`, `reformulationSourceUrl?` | Manual only, cited. Optional. |

New entity **Incident** (many products per incident):

| Field | Notes |
|---|---|
| `id`, `productIds[]` | Linked by hand to specific products; never brand-wide. |
| `evidenceTier` | `regulator` \| `company-or-trade` \| `report`: how well the entry is evidenced and how it is shown. |
| `date`, `type` | `recall` \| `market-withdrawal` \| `safety-alert` \| `investigation` (the last only in the `report` tier) |
| `reason`, `recallClass?` | The notice's hazard class where it gives one |
| `jurisdiction` | `CA` \| `US`. Shown on every flag. |
| `sourceUrl` | The CFIA notice (inspection.canada.ca) or the FDA notice / FDA Pet Food Recalls record |

Products with no incident show "No incidents found as of <lastVerified>", never "safe".

## Incident scope (shown to users)

Incidents are **recalls, market withdrawals and safety alerts from the last 10 years** (widened from 5 on 2026-10-07; ADR 0009), linked only where the notice names the product or line, and **only where the notice covers a cat food or everything at a facility; dog-only recalls are not recorded**, because dogs and cats have different nutrient needs and showing one against the other brand's cat foods would imply a link the science does not support. Three labelled tiers:

1. **Regulator:** published by the CFIA, Health Canada or the FDA.
2. **Company or trade:** a dated recall named in the manufacturer's announcement or reported by the trade or veterinary press. Counted as an incident.
3. **Report:** a regulator investigation that names a brand. Not a confirmed recall; shown apart and never counted as an incident.

Every incident shows its **jurisdiction**. An FDA notice means the product was recalled in the US; it does not mean the Canadian lot is affected, so the UI says to check the notice for lot numbers and whether it applies in Canada. Pet food recall reporting in Canada is largely voluntary and the CFIA list is thin, which is why the wider sources exist. Absence is still not proof a food was never recalled; the UI shows "No recall or safety alert found in the sources checked as of <date>", never "safe". Consumer complaints, social media posts and lawsuits are not included. This text appears wherever incidents are shown and in the README.

## Alternatives

Peers are products with the same `foodType` and the same `adequacyStage` (`adult-maintenance`, `all-life-stages` or `not-stated`, read from the label; foods with no statement form their own cohort and are left out of default benchmarks; "kitten" and "senior" are marketing terms, not profiles). The standard (AAFCO or FEDIAF) does not split peer groups: both define the same two stages, and mixing them is shown, not hidden, by a badge on each product. A toggle, off by default for adult-maintenance foods, includes all-life-stages foods; all-life-stages foods are noted as typically more calorie-dense. The user picks one goal (more protein per kcal, lower price per 100 kcal, [v2: lower carbs]); results are peers that beat the current food on that goal, with deltas against the current food shown. No composite score.

## Screens

1. **Browse and filter** — list with metric columns, basis toggle.
2. **Product detail** — metrics with basis, source link, last verified, incident flags, a benchmark line ("protein per 1000 kcal is higher than 80% of adult wet foods"), and the alternatives list.
3. **Compare** — 2 to 4 products side by side.

The generic aggregate endpoint remains API-only; the benchmark line uses it.

## Catalog scope

About 100 products from about 12 mainstream brands sold in Canada, **wet and dry foods labeled adult-maintenance or all-life-stages**. No treats, growth-only (kitten) or prescription diets in v1. Open Pet Food Facts rows are dropped (see ADR 0005).

## Data entry and validation

`data/curated-products.csv` is the source of truth. Every row requires `sourceUrl`, `lastVerified` and bases. Sources are Canadian manufacturer pages or label PDFs; a row verified only on a US page is not migrated, because formulas and figures differ between the markets. LLM-assisted extraction from product pages is allowed as a helper, always human-verified. No retailer scraping.

`npm run validate:data` (run in CI) fails on missing required fields, bad enums, nutrients without a basis, out-of-range values, duplicate ids or products, and invalid price rows. It **warns** when kcal/kg disagrees with the estimate from protein, fat and moisture by more than the per-food-type band (dry ±10%, wet -10% to +40%, calibrated on the 32 of 33 live rows that state kcal/kg).

## Stack

Express API unchanged in shape. Frontend moves from a single `public/index.html` to Vite + React + TypeScript (see ADR 0007).

## Definition of done (v1), hard stop at about 4 weeks part-time

- At least 60 products (100 is the stretch goal) from about 12 brands, all passing `validate:data` with every row's adequacy standard and stage read from the label.
- Price coverage of at least 70% of products (100% on 2026-10-07), from manual entry into `data/prices.csv`; products without prices stay in the dataset and are excluded from price comparisons. Coverage is shown in `/meta`.
- Derived metrics implemented and tested.
- Incidents checked for every product, including "none found".
- Browse, product detail with alternatives, and compare views, deployed.
- README states the positioning and the incident-scope disclaimer.

Explicitly v2: carb estimate, phosphorus/taurine, reformulation auto-detection, accounts, kitten/senior/prescription/treats.

## Build order

Vertical slice first, then grow the data:

1. Schema changes and CSV validation script, applied to the existing 30 products. **Done on branch `v1-schema-validation`:** 17 rows verified against Canadian sources and migrated from the original 30 (the rest are archived in `data/archive/`: treats, kitten and two US-only products), plus 16 new rows from Fromm (5), Orijen (8) and Tiki Cat (3), 33 live in total.
2. Derived metrics in the engine, with tests. **Done on `v1-schema-validation`:** `src/metrics/` (derived metrics, peers, benchmarks), `buildDataset` (attaches metrics, writes `data/meta.json`), and `GET /products/:id` (with benchmarks), `/meta` and `/health`. Alternatives were added with milestone 4 (`GET /products/:id/alternatives`). Not yet: the aggregate fixes (`n`, product-weighted `having`); sorting and filtering on derived fields happen in the frontend, not the API.
3. Incident entity, flags and evidence tiers. **Done on `v1-schema-validation` (2026-10-07):** `Incident` and `IncidentCheck` models, `data/incidents.csv` and `data/incident-checks.csv`, validation, `derived.incidentCount`, `brandIncidentCount`, `reportCount` and `brandReportCount`, incidents on `GET /products/:id`, `GET /incidents` (filter by tier too), and the scope text, tier wording and check dates in `/meta`. A first search of the regulator lists for 5 years found only one brand-level FDA notice; the follow-up the same day widened the window to 10 years and added brand pages and trade press, giving 4 incidents after dog-only recalls were left out, one of which names a catalog product (Meow Mix Original Choice, recalls in 2021 and 2025).
4. Frontend: product detail with alternatives, then browse, then compare. **Done on `v1-schema-validation` (2026-10-07):** Vite + React + TypeScript app in `web/` (browse, product detail, compare), served by Express from `web/dist`; `GET /products/:id/alternatives`; formatting and comparison helpers unit-tested, pages checked by hand in a browser (no component tests yet). Not deployed.
5. Grow the dataset to ~100 against the validation script.
6. README, disclaimers, deploy.

## Known fixes to the existing engine

- `count` in aggregate results is `members.length` even when the metric averages only products with a value. Return `n` (values actually used) alongside `count`.
- `having=above-average` compares to the mean of group metrics, not the mean across products. Pick one definition, document it, test it.
- ADR 0004 says `avg:protein_pct`; the code uses `proteinPct`.
- Existing `price` values are of unclear unit (e.g. 0.17 for a dry food, 0.33 for a can). Resolve when adding package size.
