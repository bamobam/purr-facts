import { useEffect, useState } from "react";
import type { DatasetMeta } from "../../src/data/buildDataset";
import type { AlternativesResult } from "../../src/metrics/alternatives";
import type { BenchmarkMetric, BenchmarkResult } from "../../src/metrics/benchmarks";
import type { EvidenceTier, Incident } from "../../src/models/Incident";
import type { Product } from "../../src/models/Product";

export type { BenchmarkMetric, BenchmarkResult, DatasetMeta, EvidenceTier, Incident, Product };

export interface ProductDetail {
  product: Product;
  benchmarks: Record<BenchmarkMetric, BenchmarkResult>;
  incidents: Incident[];
  brandIncidents: Incident[];
  incidentStatus: { checkedOn?: string; scope: string; tiers: Record<EvidenceTier, string> };
}

export type AlternativesResponse = AlternativesResult & { includeAllStages: boolean };

export interface ApiState<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

/** GET a JSON path from the API. Pass null to skip. Refetches when the path changes. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ loading: path !== null });

  useEffect(() => {
    if (path === null) {
      setState({ loading: false });
      return;
    }
    const controller = new AbortController();
    setState((previous) => ({ data: previous.data, loading: true }));
    fetch(path, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        return res.json() as Promise<T>;
      })
      .then((data) => setState({ data, loading: false }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({ error: err instanceof Error ? err.message : "Something went wrong", loading: false });
      });
    return () => controller.abort();
  }, [path]);

  return state;
}
