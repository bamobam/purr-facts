import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { DatasetMeta, Product, useApi } from "./api";

export const MAX_COMPARE = 4;

interface AppData {
  products: Product[];
  meta?: DatasetMeta;
  loading: boolean;
  error?: string;
  selected: string[];
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
}

const Context = createContext<AppData | null>(null);

/** Loads the whole catalog and dataset metadata once (a few dozen products), and holds the compare selection. */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const productsState = useApi<Product[]>("/products");
  const metaState = useApi<DatasetMeta>("/meta");
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelected = useCallback((id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : current.length >= MAX_COMPARE ? current : [...current, id]));
  }, []);
  const clearSelected = useCallback(() => setSelected([]), []);

  const value = useMemo<AppData>(
    () => ({
      products: productsState.data ?? [],
      meta: metaState.data,
      loading: productsState.loading,
      error: productsState.error,
      selected,
      toggleSelected,
      clearSelected,
    }),
    [productsState.data, productsState.loading, productsState.error, metaState.data, selected, toggleSelected, clearSelected]
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppData(): AppData {
  const value = useContext(Context);
  if (value === null) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }
  return value;
}
