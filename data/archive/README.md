# Archive

The original 30-row curated set, from before the v1 schema (see `docs/spec-v1.md`), is no longer kept as a file. It is in git history: `git show 495e54a:data/curated-products.csv`. Its `price` column was price per ounce with no retailer or date, and its `lifeStage` used marketing terms (`kitten`, `senior`, `all`, `adult`); both are superseded by `data/prices.csv` and the label's adequacy statement.

## What happened to each legacy row

The market is Canada (ADR 0008), so a row only goes into `curated-products.csv` once it has been read against a Canadian source. The original rows mixed US and Canadian figures.

| Rows | Outcome |
|---|---|
| `curated-12, 14, 15` (Blue Buffalo) | Migrated 2026-10-05 from the `bluebuffalo.com/en-ca` pages (the AAFCO statement sits in a collapsed tab). Guaranteed analysis matched. kcal/kg: row 12 is **3,832** on the Canadian page (the old CSV had the US figure, 3,835); rows 14 and 15 are **1,280** and **1,130**, the old CSV values. The US pages show 1,403 and 1,160 for the wet foods, so the legacy numbers for those two were Canadian. |
| `curated-17` (Hill's Multiple Benefit) | Migrated from hillspet.ca ("animal feeding tests ... maintenance of adult cats", 3295 kcal/kg). Moisture 10 / protein 29 / fat 8.7 / fiber 6.5 were read on the PetSmart listing, since hillspet.ca publishes dry-matter averages; min/max bases follow the guaranteed-analysis convention. |
| `curated-22, 23, 24, 25` (Royal Canin) | Migrated from `royalcanin.com/ca`. Rows 23, 24 and 25 matched the old values and carry "for maintenance". **Row 22's Canadian page says 7.5% maximum moisture (the old CSV had 8.0 from the US page) and gives no calorie statement, so `kcalPerKg` is blank**; it drops out of per-kcal metrics until a Canadian figure is found. |
| `curated-2` (Fancy Feast Classic Chicken) | Migrated using the Canadian label text you pasted (10/5/1.5/78, "for all life stages") and the Canadian retailer listing screenshot (1080 kcal/kg, 91 kcal/can). `sourceUrl` is still the US label PDF, which has the same figures; replace it with the purina.ca page when you have the link. |
| `curated-19` (Hill's Senior 11+) | Migrated 2026-10-06 from the hillspet.ca page ("animal feeding tests ... maintenance of adult cats", 4044 kcal/kg) and the Canadian guaranteed-analysis table you pasted (protein 27.9 min, fat 17.7 min, fiber 4.0 max; the old CSV had 28 / 18 / 3.5). The table has no moisture row, so moisture is **6.1%, derived from the as-fed vs dry-matter columns, with basis `typical`**. |
| `curated-26` (IAMS Adult) | Migrated 2026-10-06 from your Canadian label screenshots (32/15/3/10, 3746 kcal/kg, "100% Complete & Balanced for Adult Maintenance"). That wording is not the explicit AAFCO sentence, so the statement is inferred. The iams.ca page itself shows no text; the URL is the product page. |
| `curated-10` (Meow Mix Pâté in Gravy) | Migrated 2026-10-06 from the Amazon.ca listing (78 g, pack of 12) and its label images: 10 / **3.5** / 0.7 / 80, 998 kcal/kg (the US page said 4% fat). The label shows no AAFCO sentence, only "100% complete and balanced adult wet cat food", so the statement is `not-stated`. |
| `curated-28` (IAMS Senior) | Migrated 2026-10-06 with 34/17/3/10 and "100% Complete & Balanced for Adult Maintenance". The Walmart.ca page printed 1207 kcal/kg, which is the IAMS wet pâté figure and impossible for a dry food; the Safeway.ca label you found prints **3746 kcal ME/kg (399 per cup)**, which fits the macros, so that is used and Safeway.ca is the `sourceUrl` (3.18 kg listing). Safeway names the product "Senior 11+"; the row keeps the "Healthy Senior" name from the original set. |
| `curated-29` (IAMS Perfect Portions Pâté) | Migrated 2026-10-06 from the iams.ca page's label images: 9/5/1/78, 1207 kcal/kg. Neither the page text nor its images carry an AAFCO sentence, so `not-stated`. Listing is a 24 x 75 g tray pack (1800 g). |
| `curated-4` (Fancy Feast Petites Ocean Whitefish) | Migrated 2026-10-06 from the Canadian label text you pasted (10/2/1.5/82, "for maintenance of adult cats", Nestlé Purina PetCare Canada) and your Canadian label image (784 kcal/kg, 31 per serving). `sourceUrl` is the purina.ca product page, found by search; it was not opened here. |
| `curated-7` (Meow Mix Original Choice) | Migrated 2026-10-06 from your Canadian label text and image (30/11/4/12, 3470 kcal/kg) and the Real Canadian Superstore listing. You confirmed the label has no AAFCO statement, so `not-stated`. |
| `curated-9` (Meow Mix Indoor Health) | Migrated 2026-10-06 with **caveats**. The label evidence is a US-style "Pet Nutrition Facts" panel (protein 31 min, fat 11 min, moisture 12, "adult maintenance"; 308 kcal per 89 g cup, so `kcalPerKg` = 3461, computed). The panel lists dietary fiber, not crude fibre, so `fiberPct` is blank. `sourceUrl` is the Instacart.ca listing (3.15 lb = 1429 g, from the URL), which sells this pack in Canada. Replace the figures if a Canadian label turns up. |
| `curated-3, 5` (Fancy Feast Senior 7+, Fancy Feast dry Chicken & Turkey) | **Dropped, US-only.** Neither is sold in Canada (per you). A replacement brand is needed for those two slots. |
| `curated-6, 11, 16` | Treats. Out of v1 scope. |
| `curated-1, 8, 13, 18, 20, 21, 27, 30` | Kitten (growth-and-reproduction) foods. Out of v1 scope. |

## Still pending

Nothing from the original 30. The two slots left by rows 3 and 5 are being filled with a new brand: Fromm rows 31 and 32 were added on 2026-10-06 from frommfamily.com (Four-Star Chicken Pâté, wet, 10/6/1.2/78, 1038 kcal/kg; Four-Star Chicken À La Veg, dry, 32/19/5.5/10, 3849 kcal/kg; both "for All Life Stages").

## Calibration data

The kcal/kg plausibility bands in `src/etl/validateProducts.ts` were calibrated on all 30 legacy rows (23 non-treat). Estimated vs stated kcal/kg: dry foods -2.1% to +5.8%, wet foods +11.8% to +24.9%.
