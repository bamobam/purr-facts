# Pet Food / Nutrition Dataset Research for InsightUBC-style Cat Food Query Engine

Research date: 2026-09-03. Compiled for Grace's CPSC 310 portfolio repurpose (query engine supporting: (a) aggregation, (b) nested aggregation + HAVING, (c) relational-algebra "division", (d) multi-table joins), themed around cat food / treats / nutrition.

---

## 1. Executive summary & recommendation

**There is a viable existing-dataset path, but it requires combining two open datasets, not one.** No single source is both (a) richly populated with per-product guaranteed-analysis nutrition fields and (b) cleanly joinable to a second table. The realistic path is:

- **Primary/base table: [Open Pet Food Facts](https://world.openpetfoodfacts.org/)** (sister project of Open Food Facts). It is genuinely open (ODbL + Database Contents License, CC-BY-SA for images), has a real bulk CSV export I downloaded and verified directly (15,136 product rows, 210 columns including `brands`, `product_name`, `categories_en`, `ingredients_text`, `proteins_100g`, `fat_100g`, `fiber_100g`, `taurine_100g`, `code` (barcode/UPC)). **Caveat, verified by direct inspection, not assumption:** nutrition-macro fields are very sparsely populated (only 241 of 15,136 rows — ~1.6% — have `proteins_100g`/`fat_100g` filled in), because it's crowd-sourced like Open Food Facts. Brand and product-name fields are much better populated (6,822 and 12,153 rows respectively), and several brands have plenty of repeated child rows (Purina: 533 worldwide / 40 in the US-filtered subset; Royal Canin: 221; Pedigree: 159; Fancy Feast: 12 in the US subset) — enough for a meaningful "division" query over flavor/product variants, using `product_name` text (which contains flavor/format terms like "Chicken," "Pâté," "Gravy") as the child attribute even where numeric macros are missing.
- **Second/joinable table: [openFDA Food Enforcement (recalls) API](https://open.fda.gov/apis/food/enforcement/)** — confirmed via a live API query to include pet food recalls (e.g., a Freshpet dog food recall record), CC0/public-domain licensed, JSON, updated weekly, back to 2004. It joins to the first table on **brand name** (fuzzy, not on a structured UPC field — `openfda.upc` was empty in the recall records I pulled; UPCs sometimes appear only as free text inside `product_description`).

**Gaps that will need manual/synthetic augmentation regardless of which base dataset is chosen:**
- Guaranteed-analysis nutrition data (protein %, fat %, fiber %, moisture %, kcal/kg) is **not available anywhere in bulk, structured, and free-to-reuse form** — not from AAFCO (paywalled), not from any state feed-control agency I could find (see §2–3), not from USDA (out of scope — human food only), and only sparsely from Open Pet Food Facts. A realistic project will need to either (a) restrict itself to the ~240 OPFF rows that do have real macros, (b) manually/programmatically backfill guaranteed-analysis numbers for a curated subset of ~30–60 popular US products by transcribing from manufacturer websites/labels (this is what most hobbyist pet-nutrition tools end up doing — see KibbleLab, a commercial product built exactly this way), or (c) synthesize plausible values for demo purposes and clearly label them as such in the README.
- No dataset combination gives a *clean, structured* UPC-to-UPC join out of the box. Plan on a brand-name (and possibly fuzzy product-name) join key, normalized for case/whitespace (I found real-world inconsistency like `"Purina"` / `"purina"` / `"PURINA"` in Open Pet Food Facts brand values).

This is enough to build all four query types, but the project's README/data-provenance section should be explicit that guaranteed-analysis numbers are sourced from a sparse open dataset supplemented by manual curation, not a single authoritative government feed.

---

## 2. AAFCO (Association of American Feed Control Officials)

**Source:** [aafco.org](https://www.aafco.org/), specifically [Nutritional Labeling](https://www.aafco.org/resources/startups/nutritional-labeling/) and [Online Database of Ingredients](https://www.aafco.org/resources/regulatory/online-database-of-ingredients/).

**Finding: AAFCO does NOT publish bulk/structured guaranteed-analysis data for free.**
- The Nutritional Labeling page describes guaranteed analysis as a *label requirement* pet food makers must calculate and disclose — it does not host a compiled database of what individual products actually guarantee.
- AAFCO's "Online Database of Ingredients" (ODI) exists, but per AAFCO's own publications page, access is bundled with the paid **AAFCO Official Publication Package**: **Members/Academic Partners $200, Non-Members $300/year**, or a **14-day digital trial for $20**. (Source: [AAFCO Publications](https://www.aafco.org/resources/publications-copy/), corroborated via [PetfoodIndustry.com's announcement of the ODI](https://petfoodindustry.com/articles/7939-aafco-introduces-the-online-database-of-ingredients).)
- Even if purchased, this is a **paid, licensed, non-redistributable** resource — unsuitable for a dataset that must be republished/committed to a public GitHub repo.

**Verdict: Rejected as a data source** for the public portfolio project — not free, not bulk-downloadable, and any reuse would violate AAFCO's commercial terms.

---

## 3. State feed-control agency registries

Checked the two most commonly cited state programs (Texas, Ohio) as representative examples of state-level pet food registration systems.

### Texas Feed and Fertilizer Control Service / Office of the Texas State Chemist (OTSC)
**Source:** [otsc.tamu.edu](https://otsc.tamu.edu/)

I fetched the live homepage directly (working around an ASP.NET cookie-redirect loop with a cookie jar). Findings:
- The site enforces **Texas Administrative Code Title 4, Chapter 63 (Pet Food Rules)**, requiring registration of any pet food sold in packages ≤5 lb before distribution. (See [Pet Food Rules PDF](https://otscweb.tamu.edu/Laws/PDF/PetFoodRules.pdf).)
- The homepage does display a **recall table** (`ContentPlaceHolder1_grdRecall`), but on inspection this is **just a mirror/pointer to FDA recall announcements** (e.g., linking out to `fda.gov/safety/recalls-market-withdrawals-safety-alerts/...`), not an independent structured dataset with guaranteed-analysis fields.
- No public "registered products search" or bulk-download tool with guaranteed-analysis data was found on the site. Texas registers products for regulatory/compliance purposes, but does not appear to expose that registry as a public, structured, downloadable database.

**Verdict: Rejected** — no bulk structured guaranteed-analysis data found; the site's "database" content is just an FDA recall re-post.

### Ohio Department of Agriculture
**Source:** [agri.ohio.gov Feed Registrant Search](https://agri.ohio.gov/divisions/plant-health/grain-warehouse-feed-and-seed/online/feed-search)

- Ohio does maintain a **searchable list of registered commercial feed/pet food registrants** (companies, not necessarily individual product guaranteed-analysis records), requiring a $50 annual registration fee per registrant.
- I was not able to confirm (within this research pass) that this tool exposes per-product guaranteed-analysis fields (protein %, fat %, etc.) or offers a bulk export/API — the page appears to be an interactive registrant-name search tool, not a downloadable dataset. This should be treated as **unverified/likely not usable** rather than confirmed-useless; a follow-up session could manually query the tool if a state-registry angle is still wanted, but I would not build a pipeline around it without first confirming export capability by hand.

**Verdict: Not adopted** — plausible registrant list exists, but no confirmed structured/bulk guaranteed-analysis export; lower priority than the two datasets recommended in §1.

**General conclusion for §3:** No state feed-control agency I checked publishes the kind of structured, bulk, per-product guaranteed-analysis dataset the project needs. This matches the general pattern across US states — feed-control registries exist for regulatory compliance (proof a product is registered/fee-paid), not as open data products.

---

## 4. Open pet-food/nutrition datasets on Kaggle, data.gov, USDA

### 4a. Open Pet Food Facts (RECOMMENDED — see §1)
**Source:** [world.openpetfoodfacts.org](https://world.openpetfoodfacts.org/), data portal at [world.openpetfoodfacts.org/data](https://world.openpetfoodfacts.org/data), bulk files at `static.openpetfoodfacts.org`.

Not found via Kaggle/data.gov search directly — surfaced via a "You may also like" cross-link from an Open Food Facts Kaggle mirror, then verified against the project's own site. This is a collaborative, non-profit, crowd-sourced sister project to the well-known Open Food Facts (used by nutrition/food apps worldwide), specifically for pet food.

**Schema (verified by downloading and parsing the actual CSV, not from marketing copy):**
- File: `https://static.openpetfoodfacts.org/data/en.openpetfoodfacts.org.products.csv.gz` — **confirmed via direct download: 3.29 MB compressed**, decompresses to a **15,136-row × 210-column tab-separated file** (field list at `static.openpetfoodfacts.org/data/data-fields.txt`).
- Key columns: `code` (barcode — usable join key), `product_name`, `brands`/`brands_tags`, `categories`/`categories_en`, `countries_en`, `ingredients_text`, `allergens`, `traces`, `nutriscore_grade`, `nova_group`, and per-100g nutrient columns: `energy-kcal_100g`, `fat_100g`, `saturated-fat_100g`, `carbohydrates_100g`, `sugars_100g`, `fiber_100g`, `proteins_100g`, `salt_100g`, `sodium_100g`, plus **`taurine_100g`** (cat-specific essential nutrient — nice thematic fit) and dozens of vitamin/mineral columns.
- **Measured completeness** (I computed this directly from the downloaded file, not estimated): `brands` populated in 6,822/15,136 rows (45%); `product_name` in 12,153 (80%); `proteins_100g`/`fat_100g` in only 241/15,136 (~1.6%); `ingredients_text` in 2,825 (18.7%); `code`/barcode in 100% (15,136) since it's the primary key.
- Products tagged with a "cat" category: **2,393 rows**.
- Brand repetition (computed after lowercasing/normalizing brand strings): worldwide, Purina 533 products, Carrefour 372, Whiskas 315, Royal Canin 221, Pedigree 159; **US-filtered subset (943 rows where `countries_en` contains "United States")**: Purina 40, Pedigree 19, Fancy Feast 12, Cesar 10, Milk-Bone 7, Friskies 5, Instinct 5, Blue Buffalo 5, Beneful 4, Iams 4, Hill's 4, Meow Mix 4. **This is enough repeated child rows per brand to support a genuine division query** ("brands with variants across all X flavor/format categories"), especially if you also mine flavor keywords out of `product_name` for brands lacking clean `categories` tags.

**License (quoted directly from `world.openpetfoodfacts.org/legal`, an Open Food Facts affiliate site sharing OFF's legal terms):** *"The Open Food Facts database is available under the Open Database License [ODbL]... The individual contents of the database are available under the Database Contents License [DbCL]... The product photos are available under the Creative Commons Attribution ShareAlike licence."* This explicitly **permits redistribution and reuse, including commercial**, with attribution — appropriate for a public GitHub portfolio project (cite "Open Pet Food Facts contributors, ODbL").

**Last updated / freshness:** The CSV I downloaded had a `Last-Modified` HTTP header of the day of this research (2026-09-03), confirming it's an actively regenerated live export, not a stale snapshot.

**Division query fit:** Good, via brand → repeated product/flavor-variant rows (see brand counts above). Numeric-macro completeness is the weak point; a division query like "which brands guarantee ≥X% protein across every product they sell" would only be meaningful over the ~241 rows with real protein data, so plan to either restrict scope to that subset or use a non-numeric "for all" condition (e.g., "brands whose every product lists chicken as a named ingredient") that only needs `ingredients_text`/`product_name`, which are better populated.

**Join query fit:** Good — has a `code` (barcode) field for a clean join to any other barcode-keyed source, and `brands` for a fuzzy brand-name join to non-barcode sources like FDA recalls (§5).

### 4b. Kaggle: Amazon India Cat Food Products Dataset
**Source:** [kaggle.com/datasets/herambsawant/amazon-india-cat-food-products-dataset](https://www.kaggle.com/datasets/herambsawant/amazon-india-cat-food-products-dataset)

Verified live via browser render (not just meta tags). Columns: original product-name string, company, price, weight, star rating, total comments, category tags, price-per-100g. **License: CC0: Public Domain** (fully free to reuse/redistribute). Usability score 7.06, updated ~4 years ago, only a Jupyter notebook (2.22 MB) is bundled rather than a clean CSV — the underlying scraped data would need to be extracted from the notebook. **No guaranteed-analysis fields** (protein/fat/fiber) — just commercial listing metadata. India-only marketplace, not US-labeled AAFCO-style data.

**Verdict: Possible supplementary source for price/rating data, but not for nutrition; license is fine but schema is thin and requires extracting data from a notebook rather than a ready CSV.**

### 4c. Kaggle: Chewy products dataset (crawlfeeds)
**Source:** [kaggle.com/datasets/crawlfeeds/chewy-data](https://www.kaggle.com/datasets/crawlfeeds/chewy-data)

Verified live. **License: CC0: Public Domain.** Sample CSV (`chewy_scraper_sample.csv`, 239.56 kB) with 21 columns (only 10 shown in the Kaggle column browser): `url`, `name`, `sku`, `gtin12` (**a real UPC-style join key**), `breadcrumb`/`category_1-3`, `brand`, `Price`. Only "170+ records" per the dataset description, and it's a broad pets-category scrape (food, toys, medicine, grooming) — **only ~4–7% of sampled rows are actually pet food** based on the category breakdown shown (`Dog>Food>Wet Food>Adult` 4%, `Cat>Food>Wet Food` 3%). No nutrition fields at all. The full (non-sample) dataset is only available by contacting Crawl Feeds directly — this Kaggle copy is explicitly a sample.

**Verdict: Too small and too sparse in the food category to be a primary source, but useful as a concrete illustration that Chewy-scraped data does carry a GTIN12 (UPC) field, validating the join-key concept.**

### 4d. Kaggle: Chewy Cat Dry Food Products (ahrnishpdahal)
**Source:** [kaggle.com/datasets/ahrnishpdahal/chewy-cat-products](https://www.kaggle.com/datasets/ahrnishpdahal/chewy-cat-products)

Verified live, including full row-level content (185 rows visible in the on-page table preview). **License: Apache 2.0** (permissive, redistribution explicitly fine). Columns: `brand`, `title` (full product title, e.g. "Friskies Seafood Sensations Salmon Tuna & Shrimp Dry Cat Food, 30-lb bag" — flavor is embedded in this text), `price`, `in_stock`, `price_per_unit`, `page_num`, `position`. File: `chewy_products_clean.csv`, 23.22 kB, updated ~1 year ago, "Expected update frequency: Never" (static snapshot).
- Brand repetition confirmed directly from the visible rows: Friskies, Meow Mix, Cat Chow, Iams, Blue Buffalo, Purina ONE, Hill's Science Diet, Fancy Feast, Temptations, 9 Lives, Royal Canin Veterinary Diet, Nutrish, I and Love and You each appear multiple times with distinct flavor/recipe variants in the `title` text (e.g., Meow Mix appears as "Original Choice," "Gravy Bursts Savory Chicken," "Tender Centers Salmon & White Meat Chicken," "Seafood Medley," "Tender Centers Basted Bites Beef & Salmon" — 5 flavor variants for one brand right there).
- **No guaranteed-analysis nutrition fields**, no barcode/UPC.

**Verdict: Small but genuinely useful for the division query specifically** — it's dry cat food only, US retail (Chewy.com), permissively licensed, and its `title` field is rich enough to parse flavor/format tokens per brand. Good candidate to combine with or cross-check against Open Pet Food Facts brand names. Would need manual/regex flavor extraction from `title`, and would need macro nutrition added separately.

### 4e. Kaggle: "Hackathon Dog Food Data public" (yaozzz)
**Source:** [kaggle.com/datasets/yaozzz/dog-food-data-public](https://www.kaggle.com/datasets/yaozzz/dog-food-data-public)

Verified live: 8,894 rows × 21 columns in an Excel file, but **"No description available," License: Unknown**, zero usability score, no visible schema/column names surfaced on the page.

**Verdict: Rejected** — unlicensed (cannot be legally redistributed in a public repo without contacting the uploader) and undocumented; not worth the risk or reverse-engineering effort given better-licensed alternatives exist.

### 4f. Kaggle: Food Ingredient Lists (Datafiniti)
**Source:** [kaggle.com/datasets/datafiniti/food-ingredient-lists](https://www.kaggle.com/datasets/datafiniti/food-ingredient-lists)

Verified live: 10,000 rows, columns `id`, `asins`, `brand`, `categories`, `dateAdded`, `dateUpdated`, `ean`, `features.key/value`, `manufacturer`. Sampled row content is **all human grocery items** (Goya, McCormick, Kellogg's, Frito-Lay, etc.) — **no pet food products observed in the sample**. **License: CC BY-NC-SA 4.0** — non-commercial share-alike, which is a meaningful restriction (though likely fine for a portfolio/non-commercial GitHub project, it's more restrictive than CC0/ODbL and forbids commercial reuse).

**Verdict: Rejected** — not pet-food data at all (general grocery), and it's explicitly a sample of Datafiniti's paid full dataset (full version requires a Datafiniti account/demo request).

### 4g. Kaggle general food/nutrition datasets (Food Nutrition Dataset, Daily Food & Nutrition Dataset, Global Food & Nutrition Database 2026, Nutrition Dataset, etc.)
**Sources:** e.g. [utsavdey1410/food-nutrition-dataset](https://www.kaggle.com/datasets/utsavdey1410/food-nutrition-dataset), [adilshamim8/daily-food-and-nutrition-dataset](https://www.kaggle.com/datasets/adilshamim8/daily-food-and-nutrition-dataset), [ahsanneural/global-food-and-nutrition-database-2026](https://www.kaggle.com/datasets/ahsanneural/global-food-and-nutrition-database-2026)

All confirmed (via search-result descriptions) to be **human food/diet-tracking datasets** (meals, calories consumed, human Nutri-Score) with no pet food angle whatsoever.

**Verdict: Rejected as off-topic** — flagging here only so a follow-up session doesn't re-discover and re-investigate them.

### 4h. USDA FoodData Central
**Source:** [fdc.nal.usda.gov](https://fdc.nal.usda.gov/)

Verified directly. FoodData Central's five data types (Foundation Foods, SR Legacy, Survey/FNDDS, Experimental Foods, Branded Foods) are **exclusively human food composition data** — no pet food, animal feed, or pet nutrition branch of any kind was found or referenced anywhere on the site.

**Verdict: Rejected — out of scope, confirmed irrelevant to this project.**

### 4i. data.gov catalog search
**Source:** [catalog.data.gov/?q=pet+food](https://catalog.data.gov/?q=pet+food)

The only pet-food-specific listing found is the **FDA Pet Food Recalls** dataset (see §5 — same underlying data as the FDA/openFDA sources, just an older static mirror). No USDA/state open-data pet-nutrition dataset appeared in the catalog search.

### 4j. KibbleLab (commercial, not open — flagged for context)
**Source:** [kibblelab.com/data](https://kibblelab.com/data)

Surfaced in Kaggle-adjacent search results as a commercial product built on exactly this kind of data: 7,925 products across 250 brands, 58,174 guaranteed-analysis records, AAFCO adequacy assessments, daily FDA recall sync, weekly reformulation tracking. This confirms the *shape* of what a "complete" version of this project's data would look like, and confirms via its own existence that no free equivalent is publicly available (otherwise there'd be no market for it). **Proprietary/commercial licensing** — REST API or bulk export (JSON/CSV) starting "in the low hundreds per month," bulk licensing quoted per engagement.

**Verdict: Not usable (paid, proprietary) — cited only as evidence that a comprehensive dataset like this doesn't exist for free, and as a possible reference for what fields/schema a "gold standard" version would have if Grace ever wants to manually curate a richer subset.**

---

## 5. FDA/CVM pet food recall & ingredient-safety datasets

### 5a. openFDA Food Enforcement API (RECOMMENDED as the join table — see §1)
**Source:** [open.fda.gov/apis/food/enforcement/](https://open.fda.gov/apis/food/enforcement/), live endpoint `https://api.fda.gov/food/enforcement.json`

**Confirmed by direct live API query** (not just documentation): the food/enforcement endpoint **does include animal/pet food recalls** — I queried `product_description:"dog food"` and got real records back, e.g. a 2019 Freshpet "REFRIGERATED DOG FOOD" recall (Class II, reason: improper cold-chain temperature) with fields `country`, `city`, `address_1/2`, `reason_for_recall`, `product_quantity`, `code_info`, `center_classification_date`, `distribution_pattern`, `state`, `product_description` (free text, sometimes contains a UPC inline, e.g. "UPC:2797501110" — not a separate structured field), `report_date`, `classification`, `recalling_firm`, `recall_number`, `product_type` (generic "Food," not "Animal Food" — there is no dedicated boolean/category field distinguishing human vs. pet food; you must filter by keyword search on `product_description`, e.g. "dog food," "cat food," or known pet-food brand names), `event_id`, `termination_date`, `recall_initiation_date`, `voluntary_mandated`, `status`.
- **There is no separate "animal food" enforcement endpoint** — I confirmed `animalandveterinary/event.json` exists but is for **adverse drug/feed *event* reports** (different data, different purpose: veterinarian/owner-submitted reactions, not recalls), documented at [open.fda.gov/apis/animalandveterinary/](https://open.fda.gov/apis/animalandveterinary/). Pet food recalls specifically live in the shared human+animal `food/enforcement` endpoint.
- **Format:** JSON via live REST API (`api.fda.gov`), or bulk zipped JSON downloads at [open.fda.gov/apis/food/enforcement/download/](https://open.fda.gov/apis/food/enforcement/download/). **Updated weekly**, covering 2004–present.
- **License (quoted directly from `open.fda.gov/license/`):** *"the content, data, documentation, code, and related materials on openFDA is public domain and made available with a Creative Commons CC0 1.0 Universal dedication."* Explicitly permits commercial use, modification, and redistribution with **no attribution required** (though the disclaimer asks you not to imply FDA endorsement).

**Join fit:** Joinable to a product/brand table via a **fuzzy brand-name match** against `recalling_firm` and free-text `product_description` (parse out brand tokens). Not a clean UPC join in practice — `openfda.upc` came back empty (`"openfda": {}`) in the records I pulled, and UPCs that do appear are embedded in unstructured text.

### 5b. FDA CVM "Recalls & Withdrawals" page (Animal & Veterinary)
**Source:** [fda.gov/animal-veterinary/safety-health/recalls-withdrawals](https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals)

Verified live, and I actually **downloaded and unzipped the site's own XLSX export** (`.../recalls-withdrawals/datatables-data/download?_format=xlsx`) rather than trusting the page description. Confirmed real, structured columns: **`Date`, `Brand-Names`, `Product-Description`, `Recall-Reason-Description`, `Company-Name`, `Terminated-Recall`**. The export I pulled contained 62 data rows (this is a CVM-specific curated list — smaller and more editorially curated than the full openFDA food/enforcement feed, and appears to only export what's currently rendered/paged on the page, e.g. it included entries like Blue Ridge Beef, Viva Raw, Hill's Science Diet, ADM Animal Nutrition, Sunseed Vita Prima, spanning 2019–2025). This is genuinely structured tabular data (unlike a plain HTML list) and downloadable directly as XLSX from a `.gov` page.

**License:** No explicit Creative Commons/data license statement was found on the page itself; as a U.S. federal government work it is presumptively public domain under U.S. copyright law (17 U.S.C. §105), though this project should note that no explicit CC0/public-domain badge was located on-page (only standard footer links to "Website Policies/Privacy" and "FOIA").

**Verdict: Good secondary/cross-check source for a curated, animal-specific recall list with a clean small schema**, but the openFDA `food/enforcement` API (§5a) is more complete, has an explicit CC0 license statement, and is easier to query/filter programmatically — recommend using openFDA as primary and this CVM export as a smaller cross-reference if desired.

### 5c. data.gov "FDA Pet Food Recalls" catalog listing
**Source:** [catalog.data.gov/dataset/fda-pet-food-recalls](https://catalog.data.gov/dataset/fda-pet-food-recalls)

Verified live. This is an **older, stale mirror**: format is legacy MS Excel (`.xls`), covering pet food recalls "since January 1, 2006," but the listed file (`PetFoodRecallProductsList2009.xls`) and catalog metadata show **last updated October 1, 2010** — 16 years stale as of this research. **License: Open Data Commons Open Database License (ODbL)**, cited at [opendefinition.org/licenses/odc-odbl](http://opendefinition.org/licenses/odc-odbl/).

**Verdict: Rejected as primary source (badly stale)**, but worth noting its license (ODbL) is fine if anyone later wants historical 2006–2009 recalls specifically; openFDA (§5a) supersedes it for anything current.

---

## 6. Datasets found but out of scope / rejected (quick reference so they aren't re-investigated)

| Source | Reason rejected |
|---|---|
| USDA FoodData Central (fdc.nal.usda.gov) | Human food only, confirmed no pet-food branch |
| AAFCO Online Database of Ingredients | Paywalled ($200–300/yr or $20/14-day trial), non-redistributable |
| Kaggle: Hackathon Dog Food Data public (yaozzz) | License "Unknown," no documented schema — legal risk |
| Kaggle: Food Ingredient Lists (Datafiniti) | Not pet food (human grocery sample); CC BY-NC-SA (non-commercial restriction); sample of a paid full dataset |
| Kaggle: general human-nutrition datasets (Food Nutrition Dataset, Daily Food & Nutrition Dataset, Global Food & Nutrition Database 2026, Nutrition Dataset) | Off-topic — human diet tracking, not pet food |
| data.gov "FDA Pet Food Recalls" (catalog.data.gov/dataset/fda-pet-food-recalls) | Stale since 2010; superseded by openFDA `food/enforcement` |
| KibbleLab (kibblelab.com) | Commercial/proprietary, not open, pricing "low hundreds/month" — cited only as a reference for target schema richness |
| Texas OTSC (otsc.tamu.edu) | No independent structured guaranteed-analysis database found; its "recall" table just links out to FDA |
| Ohio Dept. of Agriculture Feed Registrant Search | Registrant list only (not confirmed to include per-product guaranteed-analysis data or bulk export) — not adopted, but not conclusively ruled out either; would need manual follow-up if pursued |
| openFDA `animalandveterinary/event` endpoint | This is adverse-event data (drug/feed reactions), not recalls — don't confuse with `food/enforcement` |

---

## 7. Next steps

**Recommended combination for the four query types:**

1. **Base table — Open Pet Food Facts** (`en.openpetfoodfacts.org.products.csv.gz`, [static.openpetfoodfacts.org/data/](https://static.openpetfoodfacts.org/data/), ODbL/DbCL license): use `code` (barcode), `brands`, `product_name`, `categories_en`, `ingredients_text`, and the `*_100g` nutrient columns. Filter to cat-tagged rows (2,393 of them) and/or US rows (943) depending on desired scope.
   - **Aggregation (a):** AVG/COUNT/MAX/MIN/SUM protein, fat, fiber, calories grouped by brand or category — works directly on the ~241 rows with populated macros, or on ingredient-count/allergen-count aggregates which have much better coverage.
   - **Nested aggregation + HAVING (b):** e.g. "brands with average protein_100g > 30 AND product count ≥ 3" — same subset.
   - **Division (c):** "brands that offer a product in every flavor category {chicken, salmon, tuna, beef}" — better done over `product_name`/`categories_en` text tokens (well-populated) than over sparse numeric macros. Purina, Royal Canin, Pedigree, Fancy Feast, Whiskas all have enough repeated rows for this to be non-trivial.
   - **Join (d):** join to the recall table below on brand name (normalize case/whitespace first — I observed `"Purina"`/`"purina"`/`"PURINA"` variants in the raw data).

2. **Second table — openFDA Food Enforcement API** (`https://api.fda.gov/food/enforcement.json`, CC0 license, [open.fda.gov/apis/food/enforcement/](https://open.fda.gov/apis/food/enforcement/)): pull records where `product_description` matches pet-food keywords or known brand names; use `recalling_firm`/parsed brand tokens from `product_description` as the join key to Open Pet Food Facts' `brands`. This gives a genuine two-table join demonstrating "products by brands that have (or have not) had an FDA recall," "average protein of recalled vs. non-recalled brands," etc.

3. **Manual augmentation (planned, not optional):** because guaranteed-analysis numeric coverage in Open Pet Food Facts is only ~1.6%, budget time to hand-curate guaranteed-analysis values (protein/fat/fiber/moisture %, kcal/cup or kcal/kg) for a **curated shortlist of ~30–60 well-known US cat food products/brands** (e.g., Purina Fancy Feast, Friskies, Meow Mix, Blue Buffalo, Hill's Science Diet, Royal Canin, Iams, Wellness, Instinct — several of which already appear as repeated brands in both Open Pet Food Facts and the Kaggle Chewy Cat Dry Food dataset, §4d) by transcribing from manufacturer product pages/label images. This is standard practice for this kind of project (it's literally what the commercial KibbleLab product does at scale) and should be clearly documented in the repo's data-provenance/README as "manually compiled from publicly available product labels," with per-row source URLs where feasible, to keep the portfolio project's data honest and defensible.
   - If manual curation is done, also augment with a synthetic/derived `flavor` or `variant` column (parsed via regex from `product_name`/`title` fields, e.g. from the Kaggle Chewy Cat Dry Food dataset's `title` strings) so the division query has a clean categorical attribute rather than relying on free-text matching at query time.

4. **Optional smaller cross-checks:** the FDA CVM `recalls-withdrawals` XLSX export (§5b, small/curated, presumptively public domain) and the Kaggle Chewy Cat Dry Food Products dataset (§4d, Apache 2.0, brand+flavor text, no macros) are both small enough to use as spot-check/validation sources or to backfill flavor-variant text for brands sparse in Open Pet Food Facts.

**Bottom line:** a fully real, well-licensed, joinable two-table foundation exists (Open Pet Food Facts + openFDA Food Enforcement), but it will not by itself yield a rich enough guaranteed-analysis dataset for compelling aggregation/division demos without supplementing roughly 30-60 popular products with manually transcribed label data — plan for that as a deliberate, documented step rather than something to discover late.
