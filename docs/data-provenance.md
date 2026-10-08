# Data Provenance

`data/products.json` (the dataset the running app serves) is produced by `npm run build:data` from `data/curated-products.csv`. `npm run validate:data` runs the same checks without writing anything, and CI runs it on every push.

## Sources

### Curated products

`data/curated-products.csv` is hand-compiled from **Canadian** manufacturer pages and label PDFs (ADR 0008). Every row has:

- `sourceUrl`, the page its nutrition figures came from, and `lastVerified`, the date a human last checked the row against it.
- `adequacyStandard` (AAFCO, FEDIAF or none) and `adequacyStage` (adult maintenance, all life stages or not stated), read from the label. "Kitten" and "senior" are marketing terms, not profiles.
- A `basis` for every nutrient. Guaranteed analyses give minimums for protein and fat and maximums for fiber and moisture, not measured values, and the files say so.
- `kcalPerKg` from the label's calorie statement.

### Prices

`data/prices.csv` holds one row per product, retailer and date (`price` in CAD, `packageSizeG`, `asOf`, `url`). Rows are one observation per retailer per product, and the validator rejects duplicates for the same product, retailer and date. Prices older than 90 days produce a validation warning.

**Coverage, 2026-10-07: 33 of 33 products (100%).** Read in the in-app browser, one page at a time, stopping at any bot check:

- **Worked:** Amazon.ca, Homes Alive, PetSmart.ca, PetMax (Fromm wet), Perla Store (Meow Mix Indoor).
- **Pet Valu, from your screenshots:** Pet Valu blocks automated reading, so rows 34, 37 and 41 use prices you captured by hand (Tiki Silver 12 x 2.8 oz pouches $37.08; Luau Chicken & Egg 8 x 6 oz $39.92; Orijen Chunks & Shreds single 5.5 oz can $5.09, because the 12-pack price was not in the screenshot). Row 15 is the PetSmart.ca 3 oz Wilderness Senior can at $2.89 (the can says "for mature cats"); the can-per-gram price is not comparable with case prices. Perla's SKUs are Amazon ASINs, so it looks like a reseller and its price may be marked up.
- **Blocked or unusable, not retried:** Pet Valu (Cloudflare check), Walmart.ca (bot check), Safeway.ca (refused), Real Canadian Superstore (blank page), Instacart (no price until a store is chosen).
- **Size policy:** wet food is the case size; dry food is the larger bag listed. Fromm Four-Star wet pâtés (31, 45) were priced on PetMax's 12-can case, which was listed out of stock.
- **Caveats:** Royal Canin Indoor dry (22), Royal Canin Aging dry (24) and Meow Mix Original (7) were read from Amazon search results with the size in the title, not from the product page. IAMS Senior (28) uses the $19.77 for 3.18 kg you gave (Amazon showed $16.80 on 2026-10-06; the 1.59 kg bag is $13.97).
- **Row 4 (Fancy Feast Petites Ocean Whitefish with tomato)** is the Real Canadian Superstore listing you screenshotted: $1.29 for one 79.4 g tray, plus tax. That is a single tray, not a case. The page's "Offer expires" line is a PC Optimum points offer, not the price.
- **Still needed:** nothing; `data/prices-still-needed.csv` is empty.

### Recalls and safety alerts

`data/incidents.csv` holds recalls, market withdrawals and safety alerts from the last **10 years** (widened from 5 on 2026-10-07, ADR 0009). Each row has an `evidenceTier`, a jurisdiction (`CA` or `US`), a source link, and what the notice says is affected. `productIds` is filled by hand and may be empty: an empty list makes the incident **brand-level context**, shown on the brand's products but not counted against any of them. A US notice does not by itself mean a Canadian lot is affected.

The three tiers (the API serves their wording in `meta.incidentTiers`):

- **`regulator`**: a notice, list or enforcement record published by the CFIA, Health Canada or the FDA.
- **`company-or-trade`**: a dated recall that names a product or line, from the manufacturer's own announcement or reported by the trade or veterinary press. These count as incidents.
- **`report`**: a regulator's investigation or adverse-event summary that names a brand. Not a confirmed recall; counted apart (`reportCount`) and never as an incident. **No entries yet** (see below).

`data/incident-checks.csv` records every source searched, its tier, the date and how far back it reached. The build fails if Canada or the US has no regulator check, **or if any catalog brand has no `company-or-trade` check**, and warns when a check is over 90 days old, because "none found" ages.

**Searched 2026-10-07 for all 9 brands (Fancy Feast, Meow Mix, Blue Buffalo, Hill's Science Diet, Royal Canin, IAMS, Fromm, Orijen, Tiki Cat). Result: 4 incidents, 1 of which names a catalog product.**

**Dog-only recalls are not recorded.** Dogs and cats have different nutrient needs and sensitivities, so a dog food recall says nothing reliable about a brand's cat foods, and showing it would imply a link the science does not support. An incident is recorded only if the notice covers a cat food, or covers everything at a facility (the Gold Star recall). Found and left out under this rule: Fromm dog foods (2021-10-01, 2025-12-03 which was sold in Ontario, and 2026-08-21), Hill's canned dog food (2019, including its Canadian expansion) and Blue Buffalo dog food (2017). The brand checks in `incident-checks.csv` still record that these brands were searched.

- **FDA** animal and veterinary recalls and withdrawals list (63 notices in its spreadsheet export, 2019-01-31 to 2026-09-08), searched by **brand name and by company name**. The brand column alone misses a recall filed under a sub-brand: the 2025-12-03 Fromm recall is listed as brand "Bonnihill Farms" and company "Fromm Family Foods". The first pass of this search (earlier on 2026-10-07) matched only brands and missed it; it was found on the second pass, then left out as dog-only. The list does not go back before 2019, so **2016-10 to 2018 is covered only by site search and trade press**, which is weaker.
- **Health Canada and CFIA** open data (34,177 notices from 1991, all categories): no notice names any of the 9 brands or their parent companies in the whole file. Only about 8 pet food recalls appear since 2016-10 (raw foods, treats, and the 2021 Natural Balance dry cat food), none for these brands. **The September 2021 Canada-wide Whiskas dry cat food recall by Mars Petcare Canada is not in the file at all**, although it was reported by the trade press and covered the whole country. So the Canadian official list is known to miss at least one national cat food recall; that is the strongest reason this tier-1 source cannot stand alone. (Whiskas is not a catalog brand, so it is not recorded.)
- **Brand pages and trade press.** Findings that are not in the regulator lists: the **Meow Mix 2021-04-09** recall (in the FDA's notices; it is outside the FDA spreadsheet's date range, so found through the company announcement); the **Royal Canin 2023** prescription cat food recall; (the Fromm October 2021 dog food recall, also missing from the FDA spreadsheet, was found the same way). Brand pages for Blue Buffalo, Meow Mix, Royal Canin, IAMS, Orijen and Tiki Cat list no recall history at all, only a statement that nothing is active, so trade-press histories (Petful, Truth About Pet Food, Pet Food Industry, Pet Food Processing) carry most of this tier. Fancy Feast has no recall of its own.
- **Gold Star Distribution (2025-12-26).** A Minneapolis distributor recalled everything in its facility for rodent and bird contamination. The FDA's 44-page product list names Fancy Feast and Meow Mix items. The five Fancy Feast and Meow Mix catalog foods were checked against the list: only Meow Mix "Original" (dry) is named, and it is linked to Meow Mix Original Choice by name. This is a judgement; the list gives a UPC but the catalog does not store UPCs. Stores were in Minnesota, Indiana and North Dakota; the notice does not mention Canada.
- **Family Dollar (2022-02-18)** recalled all pet food and other FDA-regulated products from one warehouse without naming brands, so it is not recorded against any brand.
- **Not recorded, on purpose:** the FDA's DCM (heart disease) investigation names Fromm (24 reports), Blue Buffalo (31) and Orijen (12), but only for **dog** foods (515 of 524 reports; no cat food brands), and says report counts do not establish a cause. Showing it on cat foods would suggest a link the FDA does not make, so the `report` tier is empty. Blue Buffalo's February 2017 dog food recall and tray withdrawal were found through trade press and are dog-only anyway.
- **Not included:** consumer complaints, social media, lawsuits and forum posts. They cannot be verified here, and publishing them would name brands on allegations.
- **Not searched:** retailer notices (PetSmart, Pet Valu, Walmart) and Canadian manufacturer pages for brands whose site has no recall page.

### Dropped: Open Pet Food Facts and openFDA enforcement

The first version merged Open Pet Food Facts rows and joined openFDA enforcement records by brand. Both were removed (ADR 0005): the Open Pet Food Facts rows had almost no nutrition data, and the openFDA join matched nothing.

## Known data-quality notes

- **Fromm rows (31, 32)** come from frommfamily.com, a single North American site (its forms accept US or Canadian postal codes, and its prices are in USD). Canadian retailers sell the same lines, but a Canadian label was not compared. Fromm's AAFCO statements read "for All Life Stages".
- **Orijen rows (33, 38-44)** are from orijenpetfoods.com/en-CA (Champion Petfoods, Alberta). The five wet entrées cite the AAFCO profile for maintenance and give a normal min/max guaranteed analysis. The three dry foods (Original Cat; Guardian 8; Guardian 8 Senior) cite the European **FEDIAF** profiles instead (all life stages; adult maintenance; adult maintenance), so their `adequacyStandard` is `fediaf`, and they give "analytical constituents" with no min/max, so their bases are `typical`. Orijen Regional Red's label really does state 107 kcal for an 85 g can (1251 kcal/kg), 31.5% above the macro estimate; the wet kcal band was widened for it.
- **Tiki Cat rows (34, 35, 37)**: tikipets.com has no adequacy statement in its page text, so all four have standard `none` even though the physical label may carry one. The Born Carnivore can (originally row 36) was **removed on 2026-10-07**: it is a meal topper, not a complete food, and v1 covers complete foods only. Row 37 (Koolina Luau) gives calories only per can (69 kcal per 2.8 oz, 146 per 6 oz, 244 per 10 oz), so its 861 kcal/kg is **derived** from the 10 oz can (244 kcal / 283.5 g); the 2.8 oz can gives 869. Row 35's kcal/kg (823) comes from the PetSmart.ca listing, which quotes the manufacturer; Tiki's own page gives only per-can calories (128 kcal per 5.5 oz can). `parentCompany` "Whitebridge Pet Brands" is from general knowledge.
- **How the adequacy fields are decided:** `adequacyStage` is `adult-maintenance` or `all-life-stages` only when the label says it is formulated to meet a named profile (AAFCO or FEDIAF, recorded in `adequacyStandard`) for that stage, or says "complete and balanced for adult maintenance / all life stages". A claim like "complete and balanced adult cat food" with no profile or stage named counts as `not-stated`, as does a label with no statement at all.
- **Brand versus parent company:** `brand` is the label brand and `parentCompany` the owner. Parent companies were filled from general knowledge, not from a cited source; check them when adding rows.
- **Migration status:** 17 of the original 30 rows are migrated, plus 17 new rows from Fromm (31, 32, 45-47), Orijen (33, 38-44) and Tiki Cat (34-37); see `data/archive/README.md` for which were dropped and why.
- **Not verified independently:** figures were read from pages through a fetch tool that summarizes, then compared to the existing values; the 20% spot-check against live pages is still the review step for new rows.

## Regenerating

```bash
npm run build:data
```

This reads only the CSV files in `data/`; nothing is downloaded.
