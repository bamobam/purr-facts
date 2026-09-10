# Data Provenance

`data/products.json` (the dataset the running app serves) is produced by `npm run etl` (`src/etl/run.ts`), which merges two sources. Regenerating it re-downloads and re-fetches both live.

## Sources

### Open Pet Food Facts

[world.openpetfoodfacts.org](https://world.openpetfoodfacts.org/) — a crowd-sourced, non-profit sister project of Open Food Facts, specifically for pet food. The ETL downloads the bulk export (`static.openpetfoodfacts.org/data/en.openpetfoodfacts.org.products.csv.gz`), filters to rows tagged for the United States and specifically tagged as cat food (not merely a combined "dog and cat food" parent category — see [Known data-quality findings](#known-data-quality-findings) below), and maps the fields we use (`brand`, `product_name`, per-100g nutrient columns) onto the `Product` schema. Rows produced this way are marked `dataSource: "open-data"`.

**License:** the database is available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/); individual contents under the [Database Contents License](https://opendatacommons.org/licenses/dbcl/). Both explicitly permit redistribution and reuse, including commercial, with attribution — this project credits "Open Pet Food Facts contributors, ODbL."

### openFDA Food Enforcement

[open.fda.gov/apis/food/enforcement](https://open.fda.gov/apis/food/enforcement/) — the FDA's public recall/enforcement database. The ETL queries it for records whose `product_description` mentions "cat food," "dog food," or "pet food," then joins the results to our product brands by normalized (lowercased, trimmed) substring matching against `recalling_firm` and `product_description` — the same normalization `filterProducts` uses for brand filtering (`src/shared/normalizeBrand.ts`), so the join key is consistent with how the app matches brands elsewhere.

**License:** per [open.fda.gov/license](https://open.fda.gov/license/), openFDA content is public domain under a [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) dedication — no attribution required, though the disclaimer asks that use not imply FDA endorsement.

**Current state:** as of the last ETL run, targeted queries returned very few matching records overall, and none joined to any of our specific product brands. This is an honest finding, not a bug — recall records for these particular brands are apparently sparse or absent in openFDA's current data, and/or their legal `recalling_firm` names diverge substantially from consumer branding. The join mechanism itself is real, live-tested, and ready to surface matches as openFDA's dataset grows; `data/recalls.json` is committed as-produced (currently `{}`). Recall-joined queries aren't exposed through the API yet — that's an explicit v2/stretch feature (see `docs/adr/0001-clean-room-reimplementation.md`); this ETL step only prepares the join key.

### Curated products

`data/curated-products.csv` — 30 products across 6 US brands (Purina, Meow Mix, Blue Buffalo, Hill's Science Diet, Royal Canin, IAMS), hand-compiled from real manufacturer and retailer product pages, not synthesized. Every row cites the exact page its guaranteed-analysis figures and price came from (`sourceUrl` column). This exists because Open Pet Food Facts' own nutrition fields are populated in well under 2% of rows — see the `dataSource: "curated"` rows for the numeric backbone that makes aggregation queries meaningful. Full per-row citations live in the CSV itself; see the commit that introduced it (`git log --oneline -- data/curated-products.csv`) for the compilation methodology.

## Known data-quality findings

- **Combined-species category false positive (found and fixed during this ticket):** Open Pet Food Facts tags some dog-only products with a generic parent category like `"Dog and cat food"` alongside specific dog-only tags (`"Dry dog food"`, `"Dog biscuit"`) and no cat-specific tag at all. An early version of the ETL's species filter matched on any tag containing "cat," which let dog products like "Dentalife Daily Oral Care Dog Treats" through under the Purina brand. The filter now requires at least one individual category tag that mentions "cat" without also mentioning "dog" (`src/etl/mapOpenPetFoodFactsRow.ts`, `hasCatSpecificTag`). This cut the mapped Open Pet Food Facts product count from 62 to 28 — most of the difference was this false-positive class, not lost real cat products.
- **Crowd-sourced text quality:** some Open Pet Food Facts product names/brands carry inconsistent capitalization (e.g. a product named literally `"cat food"`, a brand entered as `"purina"` lowercase) or minimal detail (`"Duck Recipe"` with no brand-line context beyond the `brand` field). This is reported as-is rather than cleaned up, since inventing better names would violate the "not synthesized" principle this dataset is built on.
- **No cross-source deduplication:** the curated set and the Open Pet Food Facts set are merged by concatenation, not entity resolution. In principle the same real-world product could appear in both (e.g. a specific curated Fancy Feast SKU and an independently-crowd-sourced Open Pet Food Facts entry for a similar item) without being detected as a duplicate. Fuzzy product-matching across sources was judged out of scope for this ticket.
- **Brand-name divergence between sources:** the curated CSV uses parent-company brand names (e.g. `"Purina"` for all Fancy Feast products), while Open Pet Food Facts' crowd-sourced `brands` field sometimes uses the sub-brand instead (e.g. `"Fancy Feast"` as its own brand). Both are real, legitimate descriptions of the same company — no attempt is made to reconcile them, so brand-level aggregation queries will see `"Purina"` and `"Fancy Feast"` as distinct brands even where they overlap in reality.

## Regenerating the dataset

```bash
npm run etl
```

This re-downloads the current Open Pet Food Facts export and re-queries openFDA live, so output can change between runs as those sources update. `data/curated-products.csv` is not re-fetched (it's hand-authored) but is re-loaded and re-merged in.
