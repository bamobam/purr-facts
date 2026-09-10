import express, { Express, Request, Response } from "express";
import path from "path";
import { fixtureProducts } from "../data/fixtureProducts";
import { filterProducts } from "../queryEngine/filterProducts";

export function createApp(): Express {
  const app = express();

  app.use(express.static(path.resolve(process.cwd(), "public")));

  app.get("/products", (req: Request, res: Response) => {
    const brand = typeof req.query.brand === "string" ? req.query.brand : undefined;
    const results = filterProducts(fixtureProducts, { brand });
    res.json(results);
  });

  return app;
}
