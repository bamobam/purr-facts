import express, { Express, Request, Response } from "express";
import path from "path";
import { fixtureProducts } from "../data/fixtureProducts";
import { filterProducts } from "../queryEngine/filterProducts";
import { aggregateProducts } from "../queryEngine/aggregateProducts";
import { parseProductQuery } from "./parseProductQuery";
import { parseAggregateQuery } from "./parseAggregateQuery";

export function createApp(): Express {
  const app = express();

  app.use(express.static(path.resolve(process.cwd(), "public")));

  app.get("/products", (req: Request, res: Response) => {
    const parsed = parseProductQuery(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const results = filterProducts(fixtureProducts, parsed.filters);
    res.json(results);
  });

  app.get("/products/aggregate", (req: Request, res: Response) => {
    const parsed = parseAggregateQuery(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const results = aggregateProducts(fixtureProducts, parsed.request);
    res.json(results);
  });

  return app;
}
