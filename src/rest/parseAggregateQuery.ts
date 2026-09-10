import {
  AggregateFunction,
  AggregateRequest,
  GroupableField,
  HavingFilter,
  NumericField,
  SortOrder,
  SortTarget,
} from "../queryEngine/aggregateProducts";
import { parseEnumParam, parseStringParam } from "./queryParamParsing";

const GROUPABLE_FIELDS: GroupableField[] = ["brand", "variant", "foodType", "lifeStage"];
const NUMERIC_FIELDS: NumericField[] = ["proteinPct", "fatPct", "fiberPct", "moisturePct", "calorieDensity", "price"];
const AGGREGATE_FUNCTIONS: AggregateFunction[] = ["avg", "min", "max", "sum", "count"];
const HAVING_FILTERS: HavingFilter[] = ["above-average", "below-average"];
const SORT_TARGETS: SortTarget[] = ["group", "metric"];
const SORT_ORDERS: SortOrder[] = ["asc", "desc"];

const KNOWN_PARAMS = ["groupBy", "metric", "having", "sort", "order"] as const;

export type ParseAggregateQueryResult = { ok: true; request: AggregateRequest } | { ok: false; error: string };

export function parseAggregateQuery(query: Record<string, unknown>): ParseAggregateQueryResult {
  for (const key of Object.keys(query)) {
    if (!(KNOWN_PARAMS as readonly string[]).includes(key)) {
      return { ok: false, error: `Unknown query parameter: ${key}` };
    }
  }

  const groupByRaw = parseStringParam("groupBy", query.groupBy);
  if (!groupByRaw.ok) {
    return groupByRaw;
  }
  if (groupByRaw.value === undefined || groupByRaw.value.trim() === "") {
    return { ok: false, error: "Missing required query parameter: groupBy" };
  }
  const groupBy = groupByRaw.value.split(",").map((field) => field.trim());
  for (const field of groupBy) {
    if (!GROUPABLE_FIELDS.includes(field as GroupableField)) {
      return { ok: false, error: `Invalid query parameter: groupBy field "${field}" must be one of ${GROUPABLE_FIELDS.join(", ")}` };
    }
  }

  const metricRaw = parseStringParam("metric", query.metric);
  if (!metricRaw.ok) {
    return metricRaw;
  }
  if (metricRaw.value === undefined || metricRaw.value.trim() === "") {
    return { ok: false, error: "Missing required query parameter: metric" };
  }
  const [fn, field] = metricRaw.value.split(":").map((part) => part.trim());
  if (!AGGREGATE_FUNCTIONS.includes(fn as AggregateFunction)) {
    return { ok: false, error: `Invalid query parameter: metric function must be one of ${AGGREGATE_FUNCTIONS.join(", ")}` };
  }
  if (fn !== "count") {
    if (!field) {
      return { ok: false, error: "Invalid query parameter: metric must be of the form <function>:<field> unless the function is count" };
    }
    if (!NUMERIC_FIELDS.includes(field as NumericField)) {
      return { ok: false, error: `Invalid query parameter: metric field must be one of ${NUMERIC_FIELDS.join(", ")}` };
    }
  }

  const request: AggregateRequest = {
    groupBy: groupBy as GroupableField[],
    function: fn as AggregateFunction,
    field: fn === "count" ? undefined : (field as NumericField),
  };

  const having = parseEnumParam("having", query.having, HAVING_FILTERS);
  if (!having.ok) {
    return having;
  }
  if (having.value !== undefined) {
    request.having = having.value;
  }

  const sort = parseEnumParam("sort", query.sort, SORT_TARGETS);
  if (!sort.ok) {
    return sort;
  }

  const order = parseEnumParam("order", query.order, SORT_ORDERS);
  if (!order.ok) {
    return order;
  }

  if (order.value !== undefined && sort.value === undefined) {
    return { ok: false, error: "Invalid query parameters: order requires sort to also be specified" };
  }

  if (sort.value !== undefined) {
    request.sort = sort.value;
  }
  if (order.value !== undefined) {
    request.order = order.value;
  }

  return { ok: true, request };
}
