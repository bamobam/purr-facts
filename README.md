# Purr Facts

A clean-room query engine and REST API over a cat food/treats product catalog, with a simple web frontend for filtering and aggregate stats. See [`CONTEXT.md`](./CONTEXT.md) for domain vocabulary and [`docs/adr/`](./docs/adr/) for architectural decisions.

**Live**: https://purr-facts.onrender.com _(see caveat under Definition of Done below — the live deploy currently lags `main`)_

## Definition of done (v1)

Per [issue #1](https://github.com/bamobam/purr-facts/issues/1):

- [ ] **Deployed and reachable** — the Render service responds, but as of 2026-09-11 it's serving stale, pre-ETL walking-skeleton data (2 hardcoded Purina rows), not the real dataset described below. Auto-deploy from `main` appears to have stalled around commit `4751e91`; everything from the ETL pipeline (`06c8d1a`) onward, including the full frontend (#7), has not reached production. Needs investigation on the Render dashboard.
- [x] **≥30 products across ≥5 brands** — `data/products.json` has 58 products across 19 distinct brands (30 hand-curated, 28 from Open Pet Food Facts).
- [x] **Filtering** — `GET /products` filters by brand (case/whitespace-insensitive), variant, foodType, lifeStage, and numeric ranges (protein/fat/price), combinable with AND semantics. Exposed in the frontend as well as the API.
- [x] **≥3 documented example aggregate queries** — see below.
- [x] **Tests** — 87 tests across three seams (REST API, query engine, ETL), all passing (`npm test`).
- [x] **Green CI** — [latest run](https://github.com/bamobam/purr-facts/actions) on `main` passing.

## Example aggregate queries

Average protein % by brand:

```bash
curl "http://localhost:3000/products/aggregate?groupBy=brand&metric=avg:proteinPct"
# [{"brand":"Purina","metric":20.83,"count":12}, {"brand":"Meow Mix","metric":26.2,"count":5}, ...]
```

Count of products by food type:

```bash
curl "http://localhost:3000/products/aggregate?groupBy=foodType&metric=count"
# [{"foodType":"dry","count":23}, {"foodType":"wet","count":29}, {"foodType":"treat","count":6}]
```

Brands with above-average protein %, highest first:

```bash
curl "http://localhost:3000/products/aggregate?groupBy=brand&metric=avg:proteinPct&having=above-average&sort=metric&order=desc"
# [{"brand":"Hill's Science Diet","metric":30,"count":3}, {"brand":"Meow Mix","metric":26.2,"count":5}, ...]
```

## Development

```bash
npm install
npm run dev        # start the dev server on :3000 against the real dataset
npm test            # run the test suite
npm run typecheck
npm run build        # compile to dist/
```
