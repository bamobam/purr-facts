import { Product } from "../models/Product";

export type GroupableField = "brand" | "variant" | "foodType" | "lifeStage";
export type NumericField = "proteinPct" | "fatPct" | "fiberPct" | "moisturePct" | "calorieDensity" | "price";
export type AggregateFunction = "avg" | "min" | "max" | "sum" | "count";
export type HavingFilter = "above-average" | "below-average";
export type SortTarget = "group" | "metric";
export type SortOrder = "asc" | "desc";

export interface AggregateRequest {
  groupBy: GroupableField[];
  function: AggregateFunction;
  field?: NumericField;
  having?: HavingFilter;
  sort?: SortTarget;
  order?: SortOrder;
}

export type AggregateResultRow = Record<string, string | number>;

function groupKey(fieldValues: string[]): string {
  return JSON.stringify(fieldValues);
}

function computeMetric(values: number[], fn: Exclude<AggregateFunction, "count">): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  switch (fn) {
    case "avg":
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "sum":
      return values.reduce((sum, v) => sum + v, 0);
  }
}

export function aggregateProducts(products: Product[], request: AggregateRequest): AggregateResultRow[] {
  const groups = new Map<string, { groupValues: Record<string, string>; members: Product[] }>();

  for (const product of products) {
    const fieldValues = request.groupBy.map((field) => String(product[field]));
    const key = groupKey(fieldValues);
    let group = groups.get(key);
    if (!group) {
      const groupValues: Record<string, string> = {};
      request.groupBy.forEach((field, i) => {
        groupValues[field] = fieldValues[i];
      });
      group = { groupValues, members: [] };
      groups.set(key, group);
    }
    group.members.push(product);
  }

  let rows: AggregateResultRow[] = [];
  for (const { groupValues, members } of groups.values()) {
    let metric: number | undefined;
    if (request.function === "count") {
      metric = members.length;
    } else {
      const values = members
        .map((p) => (request.field ? p[request.field] : undefined))
        .filter((v): v is number => v !== undefined);
      metric = computeMetric(values, request.function);
    }
    if (metric === undefined) {
      continue;
    }

    rows.push({ ...groupValues, metric, count: members.length });
  }

  if (request.having !== undefined) {
    const overallAverage = rows.reduce((sum, r) => sum + (r.metric as number), 0) / rows.length;
    rows = rows.filter((r) =>
      request.having === "above-average" ? (r.metric as number) > overallAverage : (r.metric as number) < overallAverage
    );
  }

  if (request.sort !== undefined) {
    const direction = request.order === "desc" ? -1 : 1;
    const compositeKey = (row: AggregateResultRow) => groupKey(request.groupBy.map((field) => String(row[field])));
    const compareKeys = (a: AggregateResultRow, b: AggregateResultRow) => {
      const keyA = compositeKey(a);
      const keyB = compositeKey(b);
      return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
    };
    rows.sort((a, b) => {
      const primary = request.sort === "metric" ? (a.metric as number) - (b.metric as number) : compareKeys(a, b);
      if (primary !== 0) {
        return primary * direction;
      }
      return compareKeys(a, b);
    });
  }

  return rows;
}
