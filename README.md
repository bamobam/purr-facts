# Purr Facts

A clean-room query engine and REST API over a cat food/treats product catalog, with a simple web frontend for filtering and aggregate stats. See [`CONTEXT.md`](./CONTEXT.md) for domain vocabulary and [`docs/adr/`](./docs/adr/) for architectural decisions.

**Live**: https://purr-facts.onrender.com

## Definition of done (v1)

Per [issue #1](https://github.com/bamobam/purr-facts/issues/1):

- [x] **Deployed and reachable** — serving the real 58-product dataset and the full filter/aggregate frontend as of 2026-09-11. (Every deploy since the ETL commit had been crash-looping on boot — the Docker runtime stage never copied `data/` into the image, so `loadDataset()` hit `ENOENT` and Render kept silently falling back to the last container that booted, a pre-ETL walking-skeleton build. Fixed in `e738801`.)
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
