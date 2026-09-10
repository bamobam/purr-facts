import fs from "fs";
import path from "path";
import zlib from "zlib";
import { parse } from "csv-parse/sync";
import { mapOpenPetFoodFactsRow, OpffRawRow } from "./mapOpenPetFoodFactsRow";
import { loadCuratedProducts } from "./loadCuratedProducts";
import { joinRecallsByBrand, OpenFdaRecallRecord } from "./joinRecallsByBrand";
import { normalizeBrand } from "../shared/normalizeBrand";
import { Product } from "../models/Product";

const OPFF_URL = "https://static.openpetfoodfacts.org/data/en.openpetfoodfacts.org.products.csv.gz";
const OPENFDA_URL = "https://api.fda.gov/food/enforcement.json";
const OPENFDA_QUERIES = ['product_description:"cat food"', 'product_description:"dog food"', 'product_description:"pet food"'];

async function fetchOpffProducts(): Promise<Product[]> {
  console.log("Downloading Open Pet Food Facts bulk export...");
  const res = await fetch(OPFF_URL);
  if (!res.ok) {
    throw new Error(`Failed to download Open Pet Food Facts data: HTTP ${res.status}`);
  }
  const gzipped = Buffer.from(await res.arrayBuffer());
  const decompressed = zlib.gunzipSync(gzipped).toString("utf-8");

  console.log("Parsing Open Pet Food Facts TSV...");
  const rows = parse(decompressed, {
    columns: true,
    delimiter: "\t",
    quote: false, // this is a raw TSV export, not RFC4180 CSV — literal quote characters in fields (e.g. French product names) aren't escape syntax
    skip_empty_lines: true,
    relax_column_count: true,
  }) as unknown as OpffRawRow[];
  console.log(`Parsed ${rows.length} raw Open Pet Food Facts rows`);

  const products = rows.map(mapOpenPetFoodFactsRow).filter((p): p is Product => p !== undefined);
  console.log(`Mapped ${products.length} US cat products with a determinable food type`);
  return products;
}

async function fetchOpenFdaRecalls(): Promise<OpenFdaRecallRecord[]> {
  const all: OpenFdaRecallRecord[] = [];
  for (const query of OPENFDA_QUERIES) {
    console.log(`Querying openFDA Food Enforcement: ${query}`);
    const url = `${OPENFDA_URL}?search=${encodeURIComponent(query)}&limit=100`;
    const res = await fetch(url);
    if (res.status === 404) {
      console.log(`No openFDA matches for: ${query}`);
      continue;
    }
    if (!res.ok) {
      console.warn(`openFDA query failed (HTTP ${res.status}), skipping: ${query}`);
      continue;
    }
    const data = (await res.json()) as { results?: Record<string, string>[] };
    for (const r of data.results ?? []) {
      all.push({
        recalling_firm: r.recalling_firm ?? "",
        product_description: r.product_description ?? "",
        reason_for_recall: r.reason_for_recall ?? "",
        recall_number: r.recall_number ?? "",
        classification: r.classification ?? "",
        recall_initiation_date: r.recall_initiation_date ?? "",
      });
    }
  }
  const byRecallNumber = new Map(all.map((r) => [r.recall_number, r]));
  const deduped = Array.from(byRecallNumber.values());
  console.log(`Fetched ${deduped.length} distinct openFDA recall records`);
  return deduped;
}

async function main(): Promise<void> {
  const dataDir = path.resolve(__dirname, "../../data");

  const curatedProducts = loadCuratedProducts(fs.readFileSync(path.join(dataDir, "curated-products.csv"), "utf-8"));
  console.log(`Loaded ${curatedProducts.length} curated products`);

  const opffProducts = await fetchOpffProducts();

  const allProducts: Product[] = [...curatedProducts, ...opffProducts];
  console.log(`Merged dataset: ${allProducts.length} products total`);

  const recalls = await fetchOpenFdaRecalls();
  const brands = Array.from(new Set(allProducts.map((p) => normalizeBrand(p.brand))));
  const recallsByBrand = joinRecallsByBrand(brands, recalls);
  console.log(`Joined recalls to ${Object.keys(recallsByBrand).length} of ${brands.length} distinct brands`);

  fs.writeFileSync(path.join(dataDir, "products.json"), JSON.stringify(allProducts, null, 2));
  fs.writeFileSync(path.join(dataDir, "recalls.json"), JSON.stringify(recallsByBrand, null, 2));
  console.log("Wrote data/products.json and data/recalls.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
