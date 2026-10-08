import fs from "fs";
import path from "path";
import { Incident } from "../models/Incident";
import { Product } from "../models/Product";
import { DatasetMeta } from "./buildDataset";

export function loadDataset(): Product[] {
  const datasetPath = path.resolve(process.cwd(), "data", "products.json");
  const raw = fs.readFileSync(datasetPath, "utf-8");
  return JSON.parse(raw) as Product[];
}

export function loadIncidents(): Incident[] {
  const incidentsPath = path.resolve(process.cwd(), "data", "incidents.json");
  if (!fs.existsSync(incidentsPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(incidentsPath, "utf-8")) as Incident[];
}

export function loadMeta(): DatasetMeta | undefined {
  const metaPath = path.resolve(process.cwd(), "data", "meta.json");
  if (!fs.existsSync(metaPath)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(metaPath, "utf-8")) as DatasetMeta;
}
