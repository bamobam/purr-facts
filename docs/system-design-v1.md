# Purr Facts v1: system design

Companion to [spec-v1.md](./spec-v1.md). The spec says *what*; this says *how*. Where the two disagree, fix the spec.

## 1. Requirements

**Functional** (from the spec)
- Browse and filter ~100 products; sort on as-fed, dry-matter and per-1000-kcal metrics.
- Product detail: metrics with basis, source, last-verified date, incident flags, benchmark line, alternatives.
- Alternatives: same-cohort products that beat the current food on a chosen goal, with deltas.
- Compare 2 to 4 products.
- Incident flags (formal CFIA and FDA actions only, each tagged with its jurisdiction) linked to specific products.

**Non-functional**
| Concern | Target | Why it's easy or hard |
|---|---|---|
| Scale | ~100 products, ≤1k visitors/day | Whole dataset is ~100-200 KB; everything fits in memory |
| Latency | API p95 < 50 ms, first paint < 2 s | In-memory; the risk is Render free-tier cold start (30-60 s), not code |
| Availability | Best effort, single instance | Read-only, no user data |
| Cost | $0 | Render free tier, GitHub Actions |
| **Data correctness** | Every number traceable to a source and a date | **This is the hard requirement.** Most design effort goes here, not into scale |
| Maintainability | One person, ~4 weeks part-time | Favors few moving parts |

**Constraints:** existing TypeScript/Express/mocha code and CI; Render deploy; hand-curated CSV as source of truth; no retailer scraping; read-only public API (no auth, no PII).

## 2. High-level design

```
 data/curated-products.csv ─┐
 data/prices.csv ───────────┤
 data/incidents.csv ────────┤   npm run build:data  (CI + local)
                            ▼
                   ┌──────────────────┐   fail build on any validation error
                   │ 1 parse + validate│──────────────────────────────┐
                   │ 2 deriveMetrics   │                              ▼
                   │ 3 link incidents  │                      CI red, nothing ships
                   │ 4 write artifacts │
                   └────────┬─────────┘
                            ▼
           data/products.json  data/incidents.json  data/meta.json
                            │  baked into Docker image (copy data/ — see ADR / README crash-loop note)
                            ▼
 ┌──────────────────────────────────────────────────────────┐
 │ Express (single process, all data in memory)             │
 │  startup: load → build indexes (byId, cohort benchmarks) │
 │  /products  /products/:id  /products/:id/alternatives    │
 │  /products/aggregate  /incidents  /meta  /health         │
 │  static: web/dist (Vite build)                           │
 └───────────────┬──────────────────────────────────────────┘
                 ▼
 Browser: React SPA  ── routes: /  ·  /p/:id  ·  /compare?ids=a,b,c
          state lives in the URL (shareable, back-button safe)
```

**Data flow principle:** all computation that can happen at build time does, so the runtime is a read-only lookup service and the build is where bad data is stopped.

### Storage choice
CSV in git, compiled to JSON, held in memory.

- CSV is human-editable, diffable, and reviewable in PRs. Git history doubles as the dataset's change log, which also gives reformulation detection (v2) for free: diff nutrition columns between commits.
- No database until a trigger in section 6 fires.

## 3. Deep dive

### 3.1 Data model

Product (extends current `src/models/Product.ts`). Keep optionality honest: a missing value is `undefined`, never `0`.

```ts
type Basis = "guaranteed-min" | "guaranteed-max" | "typical";
interface Nutrient { value: number; basis: Basis }

interface Product {
  id: string;
  brand: string; parentCompany: string;
  productName: string; variant: string;
  foodType: "dry" | "wet";            // treat removed from v1
  adequacyStandard: "aafco" | "fediaf" | "none";   // which profile the label cites; shown as a badge
  adequacyStage: "adult-maintenance" | "all-life-stages" | "not-stated";  // the claimed stage; replaces lifeStage
                                      // ("kitten"/"senior" are marketing terms, not profiles)
  protein?: Nutrient; fat?: Nutrient; fiber?: Nutrient; moisture?: Nutrient;
  kcalPerKg?: number; kcalPerPackage?: number;
  packageSizeG?: number;              // TOTAL grams in the package (a 12-pack of 85 g cans = 1020)
  packageUnits?: number;              // informational: cans or pouches per package
  sourceUrl: string; lastVerified: string;      // required (nutrition source)
  reformulatedOn?: string; reformulationSourceUrl?: string;
  derived?: DerivedMetrics;           // written by the build, never hand-entered
}

interface DerivedMetrics {
  dmProtein?: number; dmFat?: number;              // % dry matter
  proteinGPer1000kcal?: number; fatGPer1000kcal?: number;
  proteinKcalPct?: number; fatKcalPct?: number;    // % of calories
  pricePerLb?: number; pricePer1000kcal?: number;  // from the median of recent price observations
  priceObservationCount: number; priceRange?: [number, number];  // $/lb across stores
  completeness: number;                            // 0..1, fraction of tier-1 fields present
}

// one row per (product, retailer, date); lives in data/prices.csv, not on Product
interface PriceObservation {
  productId: string; retailer: string;             // e.g. Chewy, PetSmart, Walmart, Pet Valu, Loblaws
  price: number;                                   // CAD for ONE package as sold at that retailer
  packageSizeG: number;                            // TOTAL grams of that listing (sizes differ per retailer)
  asOf: string; url: string;                       // ISO date; listing URL
}

interface Incident {
  id: string; productIds: string[];
  date: string; type: "recall" | "market-withdrawal" | "safety-alert" | "investigation";
  evidenceTier: "regulator" | "company-or-trade" | "report";
  reason: string; recallClass?: string; jurisdiction: "CA" | "US"; sourceUrl: string;  // the notice or announcement URL
}
```

**Formulas** (pure functions in `src/metrics/deriveMetrics.ts`, unit-tested):

| Metric | Formula |
|---|---|
| dmX | `x / (100 - moisture) * 100` |
| xGPer1000kcal | `x_pct * 10000 / kcalPerKg` |
| xKcalPct | `xGPer1000kcal * kcalPerG / 10` (protein 3.5, fat 8.5) |
| pricePerLb / pricePerKg (per observation) | `price / packageSizeG * 453.592` / `price / packageSizeG * 1000` |
| pricePer1000kcal (per observation) | `price / (kcal in package / 1000)`, with kcal in package = `kcalPerKg * packageSizeG / 1000`; undefined if `kcalPerKg` is missing |
| Product-level price metrics | **Median** of the per-observation values from the last 90 days, shown with the range and the number of stores. Never "lowest", so a one-off sale doesn't set the ranking |

Hand check on the two existing rows: wet Fancy Feast Classic (10% protein, 1080 kcal/kg) gives 92.6 g protein per 1000 kcal, 32% of calories; dry Fancy Feast Kitten (35%, 3948 kcal/kg) gives 88.7 g, 31%. Plausible and close together, which is exactly the insight as-fed percentages hide (10% vs 35%).

**Validation rules** (run in `build:data`, fail the build):
1. Required fields present: `sourceUrl`, `lastVerified`, bases for every nutrient given, `priceAsOf` if `price` given.
2. Ranges: protein/fat 0-100, moisture 0-95, protein + fat + fiber + moisture ≤ 100, kcal/kg within 500-6000.
3. **Atwater plausibility:** estimate kcal/kg from protein, fat, moisture with ash assumed at 7% of dry matter and carbs by difference, using 3.5/8.5/3.5 kcal/g. Its purpose is to catch data-entry mistakes (wrong column, dropped digit), not to second-guess the label. Worked by hand on the two rows above: wet is off by about 12%, dry by about 4%, and both are correct rows. Calibrated on the 23 non-treat rows of the original 30 (deviation measured relative to the estimate): **dry foods landed between -2.1% and +5.8%, wet foods between +11.8% and +24.9%**. A single 20% limit would have flagged 3 correct wet rows, so the bands are per food type: **dry -10% to +10%, wet -10% to +40%** (observed range plus headroom; widened from +30% on 2026-10-06 when 21 wet rows ranged from -2.5% to +31.5%). Wet runs high because label minimums for protein and fat make the estimate run low. These are **warnings**, not build failures; they are exported as `KCAL_DEVIATION_BANDS` in `src/etl/validateProducts.ts`. Promote them to errors once the dataset is larger and the bands have held.
4. Unique ids; every `Incident.productIds` entry exists; no duplicate (brand, productName, packageSize).
5. Freshness is a *warning* here and a scheduled check elsewhere (section 4).

### 3.2 Cohorts, peers and benchmarks

**Decided:** peers are defined by the label's claimed `adequacyStage`; the `adequacyStandard` (AAFCO or FEDIAF) is a badge and does not split groups. "All life stages" means formulated to the stricter growth-and-reproduction profile, and tends to be richer in calories, protein and fat, so it is not silently mixed with adult-maintenance foods. Each product shows its statement as a badge.

`isPeer(a, b, includeAllStages) = a.foodType === b.foodType && (a.adequacyStage === b.adequacyStage || includeAllStages)`

- **Default:** compare within the same statement and food type.
- **Toggle "include all-life-stages foods":** off by default for adult-maintenance products and available in the benchmark and alternatives views. When on, results show the badge, and an all-life-stages alternative to an adult food carries a note that it is typically more calorie-dense.
- For an all-life-stages product the default cohort is its own statement, which is naturally smaller; the benchmark minimum-size rule below handles that.

Benchmark line ("higher than 80% of adult-maintenance wet foods"): percentile = share of the cohort with a strictly lower value for that metric, computed over cohort members that *have* the metric. Suppress the line when the cohort has fewer than 8 such members ("not enough peers to benchmark"). Precompute per (cohort, metric, toggle state) at server startup; it's a few hundred numbers.

### 3.3 Alternatives

`findAlternatives(products, current, goal)` is a pure function in `src/alternatives/`:

1. Candidates = peers of `current` (per `isPeer`, honoring the `includeAllStages` query param), excluding itself and products missing the goal metric.
2. Keep candidates that beat `current` on the goal (higher for protein per 1000 kcal, lower for price per 100 kcal).
3. Sort by goal, best first. Return each with `delta` against `current` on the goal and on the other two headline metrics, so a "cheaper" result that halves the protein is visible.
4. No composite score, no weighting. If `current` lacks the goal metric, respond 422 with a reason, not an empty list.

Goals in v1: `protein-per-kcal`, `price-per-100kcal`. (`lower-carbs` is v2.)

### 3.4 API

Resource-oriented, as in ADR 0004. Existing routes keep their shape.

| Route | Purpose | Notes |
|---|---|---|
| `GET /products` | Filter, sort, list | Existing filters plus `ids=`, `parentCompany=`, ranges on derived fields (`minProteinGPer1000kcal`), `sort=` and `order=`; returns `derived` and `completeness`. Add `limit`/`offset` now; cheap and avoids a breaking change later |
| `GET /products/:id` | Detail | Product + its incidents + benchmark per headline metric |
| `GET /products/:id/alternatives?goal=` | Alternatives | Section 3.3 |
| `GET /products/aggregate` | Existing | Fixes below |
| `GET /incidents?productId=` | Incidents | Rarely needed; detail already embeds them |
| `GET /meta` | Provenance | Dataset build date, product count, incident scope text, incident check date, oldest `lastVerified`. Powers every "as of" label and the disclaimer so copy lives in one place |
| `GET /health` | Liveness | 200 only if the dataset loaded and count > 0 |

Compare needs no endpoint: the SPA calls `GET /products?ids=a,b,c`.

Errors: 400 `{error}` for bad params (existing pattern), 404 for unknown id, 422 for an alternatives request the data can't answer. Never return a fabricated default for missing data.

**Fixes to the existing aggregate engine** (in scope because the benchmark and any UI summary depend on it):
- Return `n` (values actually averaged) next to `count`; suppress groups with `n` below a threshold on request.
- Define `having=above-average` as above the **product-weighted mean of the field across the filtered set**, not the unweighted mean of group metrics. Document and test it.
- Align ADR 0004's `protein_pct` with the code's `proteinPct`.

### 3.5 Frontend

Vite + React + TypeScript (ADR 0007). Kept deliberately small:
- Routes: `/` browse, `/p/:id` detail, `/compare?ids=`. Filter, sort, basis toggle and selected ids all live in the query string, so every view is shareable and back-button safe.
- A typed API client mirroring the server types (share a `types.ts` package-internal; no codegen at this size).
- `fetch` plus a tiny `useQuery`-style hook; add TanStack Query only if caching bites.
- Basis toggle (calorie / dry matter / as-fed) is pure presentation over `derived` fields the API already returns.
- Always render a value's basis ("≥ 9%"), `lastVerified`, and the incident-scope disclaimer from `/meta`.
- Accessibility: tables with real headers, no color-only meaning (incident flags carry text), keyboard-operable compare picker.

### 3.6 Incident curation process

Manual by design. A scheduled/manual script `npm run incidents:candidates` pulls the CFIA recalls and safety alerts feed (inspection.canada.ca) and the FDA Pet Food Recalls dataset, filters to the last 10 years, fuzzy-matches brand and product names against the catalog, and writes **candidates to a review file**. A human links them into `data/incidents.csv`. Nothing is published automatically, because a wrong automatic link would attach a recall to the wrong product. Every product's `lastVerified` is updated when its incidents were last checked, which is what powers "No incidents found as of <date>".

## 4. Scale, reliability, operations

**Load:** 100 products × ~1.5 KB ≈ 150 KB. At 1k visitors/day this is noise; a single Node process serves it from memory. No cache layer; set `Cache-Control: public, max-age=300` plus an `ETag` on read endpoints and let the browser and CDN do it.

**The real reliability risks, in order:**
1. **Silent bad deploy.** This already bit once (the `data/` copy bug and Render's fall-back to the last good container). CI boots the built Docker image and asserts `/health` is 200 and `/products?limit=1` returns data; the deploy only counts as green if that passes.
2. **Stale data presented as current.** A scheduled GitHub Action (weekly) fails or opens an issue when any `lastVerified` is older than 180 days or any `priceAsOf` older than 90 days. The UI also shows the oldest verified date from `/meta`.
3. **Cold start.** Render free tier sleeps. Mitigate by keeping the first paint static-friendly and by an uptime ping (which also gives availability monitoring). Accept it otherwise.
4. **Bad data entry.** Stopped at build time by section 3.1's validation, not at runtime.

**Failover/redundancy:** none needed; revisit only if it gets real traffic.

**Monitoring:** `/health`, the uptime ping, and CI. No metrics stack. Log request errors to stdout.

**Security:** read-only, no auth, no cookies, no user data. Keep the existing strict query parsing (it already rejects unknown/invalid params). Add `express-rate-limit` (cheap) and `helmet`. Same-origin only, so no CORS.

## 5. Trade-off analysis

| Decision | Chosen | Alternative | Why / cost |
|---|---|---|---|
| Derived metrics | Precompute at build, store in JSON | Compute per request | Lets the API filter and sort derived fields with no special cases and lets validation assert on them. Cost: a formula change needs a rebuild (it's one command) |
| Backend | Keep Express API | Static site, compute everything client-side | **A static site would honestly suffice at this size** (ship the 150 KB JSON, do it all in the browser). The API stays because the portfolio value (REST design, filter/aggregate engine, tests) depends on it. Be upfront about this in the README |
| Storage | CSV + in-memory | SQLite/Postgres | Zero ops, reviewable diffs. Cost: no ad-hoc querying beyond the engine; fine under ~5k rows |
| Incidents | Separate entity, manual link | Flat flag on product, or auto-match | Recalls span products and lots; manual link avoids false attribution. Cost: curation effort each quarter |
| Alternatives | Server-side pure function | Client-side | Testable in isolation and reusable by the API. Cost: one more endpoint |
| Peer definition | Include `all` life stage with adult | Strict equality | Avoids a stranded cohort. Cost: slightly looser definition of "peer", documented |
| Frontend | Vite + React + TS | Single HTML file | Routing and shared state; matches PurfectPlay. Cost: build step and bundle |
| Ranking | Per 1000 kcal, DM alongside | DM only | Fairer comparison. Cost: more to explain, so the UI needs a short "why" tooltip |

## 6. What to revisit as it grows

| Trigger | Change |
|---|---|
| > ~1-5k products or ad-hoc queries | SQLite (still single-file), then Postgres; add pagination in the UI |
| Saved cats, favorites, accounts | A real database, auth, and a privacy review; this design assumes none of it |
| Incident curation becomes a chore | Semi-automate matching with a review UI; keep the human in the loop |
| Reformulation detection | Diff nutrition and ingredient columns across git history in a scheduled job |
| Community contributions | Submission flow with required source URL; the validation script becomes the gatekeeper |
| Kitten, senior, prescription, treats | Cohort model needs more than foodType and lifeStage; revisit `isPeer` |
| Real traffic | CDN in front, drop cold-start dependence, add metrics |
| Carb estimate (tier 3) | Needs an ash model; store as an explicit `estimated` metric class distinct from label-derived ones |

## 7. Mapping to existing code

| Area | Change |
|---|---|
| `src/models/Product.ts` | New fields above; `Nutrient` with basis; drop `treat`; replace `lifeStage` with `adequacyStandard` and `adequacyStage` and drop growth-only (kitten) rows for v1 |
| `src/etl/*`, `src/data/fixtureProducts.ts` | Remove Open Pet Food Facts mapper and fixtures (ADR 0005); `run.ts` becomes `build:data` |
| new `src/metrics/deriveMetrics.ts` | Pure formulas, unit-tested |
| new `src/metrics/validateProducts.ts` | Rules in 3.1; used by build and CI |
| new `src/alternatives/findAlternatives.ts`, `src/metrics/benchmarks.ts` | Sections 3.2-3.3 |
| `src/queryEngine/filterProducts.ts` | `ids`, `parentCompany`, derived-field ranges, sort |
| `src/queryEngine/aggregateProducts.ts` | `n`, product-weighted `having` |
| `src/rest/app.ts` | New routes, `/meta`, `/health`, rate limit, caching headers |
| `public/` → `web/` | Vite app; Express serves `web/dist` |
| `.github/workflows/ci.yml` | Add data validation, Docker smoke test; separate scheduled freshness workflow |

## 8. Assumptions and open decisions

1. **Atwater tolerance:** done. Per-food-type bands (dry ±10%, wet -10% to +40%), recalibrated on 33 rows; warnings only. Revisit when the dataset passes ~60 rows. The 7%-of-dry-matter ash assumption held for dry foods and is the likely reason wet foods run high.
2. **Existing `price` column** is price per ounce (per the commit that added it), but the file doesn't say so. Migrate it into `prices.csv` as observations with a retailer, size and date. Rows lacking a retailer must be re-sourced.
3. **Peer rule:** decided (section 3.2): peers by `adequacyStage`, the standard badged, with an include-all-life-stages toggle. Existing rows needed their `lifeStage` mapped to a stage from the label; rows labeled kitten-only (growth) are out of v1 scope, and "senior" rows need their actual statement looked up.
4. **Retailers:** use 3 to 4 of the most popular Canadian ones (candidates: Chewy, PetSmart, Walmart, Pet Valu, Loblaws), manual entry only, prices in CAD. Target at least 1 price per product and 2 where available.
5. **Benchmark minimum cohort** of 8 is a guess; adjust once the real cohort sizes are known.
6. **Staleness thresholds** (180 days verified, 90 days price) are defaults to tune.

## 9. Milestone 2 as built (2026-10-07)

- **Derived metrics** are computed at build time (`src/metrics/deriveMetrics.ts`) and stored on each product in `data/products.json`. Price metrics use the median of observations from the last 90 days and report the count and the range per kg. A metric with a missing input is left out, never zero.
- **Peers** (`src/metrics/peers.ts`): same food type and same `adequacyStage`; the standard is a badge, not a splitter; a food with no stated stage only matches other unstated foods, even with the all-life-stages toggle.
- **Benchmarks** (`src/metrics/benchmarks.ts`): the share of the *other* peers with a strictly lower value; hidden when fewer than 8 other peers have the metric. They are computed per request, not precomputed at startup: with a few dozen products it is microseconds, and it keeps the toggle free. Precompute if the catalog grows past a few thousand.
- **Observed on the 33-product dataset:** adult-maintenance wet (11) and dry (10) foods get benchmarks; all-life-stages foods and unstated foods are suppressed by default (cohorts of 2 to 6), and the all-life-stages toggle brings a wet all-life-stages food to a cohort of 14.
- **API added:** `GET /products/:id` (product, derived metrics, benchmarks; `includeAllStages=true|false`), `GET /meta` (build date, price coverage, oldest verified and price dates), `GET /health` (503 when the dataset is empty).

## 10. Milestone 3 as built (2026-10-07)

- **Incident** has a `brand`, a `productIds` list that may be empty, a `jurisdiction`, an `evidenceTier` and an `affects` field that says in plain words what the notice covers and rules out. An incident with no `productIds` is brand-level context: it is returned with a product as `brandIncidents` and counted in `derived.brandIncidentCount`, but never in `derived.incidentCount`.
- **Evidence tiers** (ADR 0009): `regulator` and `company-or-trade` entries count as incidents; `report` entries (type `investigation`) are shown apart and counted in `reportCount` and `brandReportCount`. The validator enforces that `report` goes with `investigation` and nothing else does.
- **IncidentCheck** records each source searched, its tier, the date and how far back it reached; `company-or-trade` checks name the brand. `meta.incidentsCheckedOn` is the oldest of the latest check per regulator and per brand. The validator refuses a build with no regulator check for Canada or the US, or with a catalog brand that has no company-or-trade check, so a brand cannot be added to the catalog without someone searching for its recalls.
- **Scope** is 10 years (`INCIDENT_SCOPE_DAYS`); older notices load but are excluded from counts and warned about. The scope text and tier wording live in `src/data/incidentScope.ts` and are served in `/meta` and in each product's `incidentStatus`.
- **Matching by brand name** (normalized, case-insensitive), not by parent company: a Pedigree recall does not mark IAMS or Royal Canin just because Mars makes all three. The source lists are matched by brand and by company name, since a recall can be filed under a sub-brand.
- **API:** `GET /products/:id` returns `incidents` (linked), `brandIncidents` (same brand, not linked), and `incidentStatus` (`checkedOn`, `scope`, `tiers`); each incident carries its `evidenceTier`. `GET /incidents` filters by `productId`, `brand`, `jurisdiction` and `evidenceTier`, newest first.

## 11. Milestone 4 as built (2026-10-07)

- **Alternatives:** `GET /products/:id/alternatives?goal=protein|price[&includeAllStages=true|false][&limit=1..50]` (`src/metrics/alternatives.ts`). Peers follow `isPeer`; only peers that strictly beat the food on the one chosen goal are returned, best first, each with `value`, `delta` and `deltaPct`. A food with no value for the goal returns an empty list **with a `reason`**, so "no data" is never read as "nothing better". There is no composite score.
- **Frontend** (`web/`, Vite + React + TypeScript, hash routing so Express needs no fallback): Browse (client-side search, filters, basis toggle, sortable columns, compare ticks), Product (label figures with basis and source, per-calorie and price figures, benchmark sentences, alternatives, incidents with tier labels and "what was checked"), Compare (2 to 4 foods, "highest"/"lowest" markers, not-like-for-like warning). The whole catalog (33 foods) is loaded once; sorting and derived-field filters run in the browser. Revisit if the catalog passes a few hundred rows.
- **Copy rules:** every nutrient shows its basis ("≥ 9%"); "None found" is always paired with the check date and "not a safety rating"; "highest"/"lowest" mark extremes, not recommendations; foods with no stated life stage say why they have no peers.
- **Build:** `npm run web:build` writes `web/dist`; `npm run build` runs `tsc` then the web build; the Dockerfile builds and copies `web/dist`. The old `public/index.html` was removed.
- **Tooling:** `npm run typecheck` checks both `src` and `web`. `npm run web:dev` starts Vite on 5173 with a proxy to the API on 3000.
- **Not done:** component tests, the aggregate fixes. (The CI smoke test of the Docker image and deployment were added in section 12.)

## 12. Release and operations (2026-10-07)

- **Image:** the build stage copies `data/` and runs `npm run build:data` before compiling, so a data error fails the build and the shipped JSON is always regenerated from the CSVs (derived prices depend on the build date). The runtime stage copies only the three generated JSON files.
- **CI:** typecheck, `validate:data`, tests and build, then a `docker-smoke` job that builds the image, boots it and checks `/health`, the frontend, `/meta` and the alternatives endpoint. It exists because an earlier release crash-looped when `data/` was missing from the image and the host silently kept serving an older container.
- **Freshness:** a monthly `data-freshness` workflow runs `npm run validate:data:strict` (fails on any warning). Re-run the recall searches and refresh prices when it goes red.
- **Hosting:** a single container behind `PORT`, with `/health` as the health check. Deploy by merging to `main`.
- **Not verified here:** the Docker build and the new CI jobs have not been run (no Docker on the development machine); they run for the first time on GitHub.

