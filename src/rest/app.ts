import express, { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { DatasetMeta } from "../data/buildDataset";
import { EVIDENCE_TIER_NOTES, INCIDENT_SCOPE_NOTE } from "../data/incidentScope";
import { DEFAULT_ALTERNATIVES_LIMIT, findAlternatives, GOALS, Goal } from "../metrics/alternatives";
import { computeBenchmarks } from "../metrics/benchmarks";
import { EVIDENCE_TIERS, Incident } from "../models/Incident";
import { normalizeBrand } from "../shared/normalizeBrand";
import { Product } from "../models/Product";
import { filterProducts } from "../queryEngine/filterProducts";
import { aggregateProducts } from "../queryEngine/aggregateProducts";
import { parseProductQuery } from "./parseProductQuery";
import { parseAggregateQuery } from "./parseAggregateQuery";

export interface AppOptions {
  meta?: DatasetMeta;
  incidents?: Incident[];
}

function newestFirst(list: Incident[]): Incident[] {
  return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function createApp(products: Product[], options: AppOptions = {}): Express {
  const app = express();
  const incidents = options.incidents ?? [];

  // The built Vite frontend (npm run web:build). Falls back to the old static page if it has not been built.
  const builtFrontend = path.resolve(process.cwd(), "web", "dist");
  app.use(express.static(fs.existsSync(builtFrontend) ? builtFrontend : path.resolve(process.cwd(), "public")));

  app.get("/products", (req: Request, res: Response) => {
    const parsed = parseProductQuery(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const results = filterProducts(products, parsed.filters);
    res.json(results);
  });

  app.get("/products/aggregate", (req: Request, res: Response) => {
    const parsed = parseAggregateQuery(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const results = aggregateProducts(products, parsed.request);
    res.json(results);
  });

  app.get("/products/:id", (req: Request, res: Response) => {
    for (const key of Object.keys(req.query)) {
      if (key !== "includeAllStages") {
        res.status(400).json({ error: `Unknown query parameter: ${key}` });
        return;
      }
    }
    const toggle = req.query.includeAllStages;
    if (toggle !== undefined && toggle !== "true" && toggle !== "false") {
      res.status(400).json({ error: "Invalid query parameter: includeAllStages must be true or false" });
      return;
    }
    const product = products.find((p) => p.id === req.params.id);
    if (product === undefined) {
      res.status(404).json({ error: `Unknown product id: ${req.params.id}` });
      return;
    }
    const linked = incidents.filter((i) => i.productIds.includes(product.id));
    const brandIncidents = incidents.filter(
      (i) => !i.productIds.includes(product.id) && normalizeBrand(i.brand) === normalizeBrand(product.brand)
    );
    res.json({
      product,
      benchmarks: computeBenchmarks(products, product, { includeAllStages: toggle === "true" }),
      incidents: newestFirst(linked),
      brandIncidents: newestFirst(brandIncidents),
      incidentStatus: {
        checkedOn: options.meta?.incidentsCheckedOn,
        scope: options.meta?.incidentScope ?? INCIDENT_SCOPE_NOTE,
        tiers: options.meta?.incidentTiers ?? EVIDENCE_TIER_NOTES,
      },
    });
  });

  app.get("/products/:id/alternatives", (req: Request, res: Response) => {
    const known = ["goal", "includeAllStages", "limit"];
    for (const key of Object.keys(req.query)) {
      if (!known.includes(key)) {
        res.status(400).json({ error: `Unknown query parameter: ${key}` });
        return;
      }
    }
    const { goal, includeAllStages, limit } = req.query;
    if (typeof goal !== "string" || !Object.prototype.hasOwnProperty.call(GOALS, goal)) {
      res.status(400).json({ error: `Invalid query parameter: goal is required and must be one of ${Object.keys(GOALS).join(", ")}` });
      return;
    }
    if (includeAllStages !== undefined && includeAllStages !== "true" && includeAllStages !== "false") {
      res.status(400).json({ error: "Invalid query parameter: includeAllStages must be true or false" });
      return;
    }
    let max = DEFAULT_ALTERNATIVES_LIMIT;
    if (limit !== undefined) {
      max = typeof limit === "string" && /^\d+$/.test(limit) ? Number(limit) : NaN;
      if (!(max >= 1 && max <= 50)) {
        res.status(400).json({ error: "Invalid query parameter: limit must be a whole number from 1 to 50" });
        return;
      }
    }
    const product = products.find((p) => p.id === req.params.id);
    if (product === undefined) {
      res.status(404).json({ error: `Unknown product id: ${req.params.id}` });
      return;
    }
    const all = includeAllStages === "true";
    res.json({ ...findAlternatives(products, product, goal as Goal, { includeAllStages: all, limit: max }), includeAllStages: all });
  });

  app.get("/incidents", (req: Request, res: Response) => {
    const known = ["productId", "brand", "jurisdiction", "evidenceTier"];
    for (const key of Object.keys(req.query)) {
      if (!known.includes(key)) {
        res.status(400).json({ error: `Unknown query parameter: ${key}` });
        return;
      }
    }
    const { productId, brand, jurisdiction, evidenceTier } = req.query;
    for (const [name, value] of Object.entries({ productId, brand, jurisdiction, evidenceTier })) {
      if (value !== undefined && typeof value !== "string") {
        res.status(400).json({ error: `Invalid query parameter: ${name} must be provided once` });
        return;
      }
    }
    if (jurisdiction !== undefined && jurisdiction !== "CA" && jurisdiction !== "US") {
      res.status(400).json({ error: "Invalid query parameter: jurisdiction must be one of CA, US" });
      return;
    }
    if (evidenceTier !== undefined && !(EVIDENCE_TIERS as readonly string[]).includes(evidenceTier as string)) {
      res.status(400).json({ error: `Invalid query parameter: evidenceTier must be one of ${EVIDENCE_TIERS.join(", ")}` });
      return;
    }
    const results = incidents.filter(
      (i) =>
        (evidenceTier === undefined || i.evidenceTier === evidenceTier) &&
        (productId === undefined || i.productIds.includes(productId as string)) &&
        (brand === undefined || normalizeBrand(i.brand) === normalizeBrand(brand as string)) &&
        (jurisdiction === undefined || i.jurisdiction === jurisdiction)
    );
    res.json(newestFirst(results));
  });

  app.get("/meta", (_req: Request, res: Response) => {
    res.json(options.meta ?? { productCount: products.length });
  });

  app.get("/health", (_req: Request, res: Response) => {
    if (products.length === 0) {
      res.status(503).json({ status: "unavailable", products: 0 });
      return;
    }
    res.json({ status: "ok", products: products.length });
  });

  return app;
}
