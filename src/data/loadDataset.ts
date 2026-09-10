import fs from "fs";
import path from "path";
import { Product } from "../models/Product";

export function loadDataset(): Product[] {
  const datasetPath = path.resolve(process.cwd(), "data", "products.json");
  const raw = fs.readFileSync(datasetPath, "utf-8");
  return JSON.parse(raw) as Product[];
}
