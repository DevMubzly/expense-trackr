"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  DEFAULT_CATEGORY_RECORDS,
  toCategory,
  type Category,
  type CategoryKind,
  type CategoryRecord,
} from "@/lib/categories";
import { useApi } from "@/lib/use-api";

type CategoriesContextValue = {
  categories: Category[];
  expense: Category[];
  income: Category[];
  byId: Map<string, Category>;
  categoryOf: (id: string) => Category;
  categoriesFor: (kind: CategoryKind) => Category[];
  loading: boolean;
  refresh: () => void;
};

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { data, loading, refresh } = useApi<CategoryRecord[]>(
    `/api/categories`,
  );

  const value = useMemo<CategoriesContextValue>(() => {
    const records =
      data && data.length > 0 ? data : DEFAULT_CATEGORY_RECORDS;
    const categories = records.map(toCategory);
    const expense = categories.filter((category) => category.kind === "expense");
    const income = categories.filter((category) => category.kind === "income");
    const byId = new Map(categories.map((category) => [category.id, category]));
    const fallback = expense[expense.length - 1] ?? categories[0];

    return {
      categories,
      expense,
      income,
      byId,
      categoryOf: (id: string) => byId.get(id) ?? fallback,
      categoriesFor: (kind: CategoryKind) =>
        kind === "income" ? income : expense,
      loading,
      refresh,
    };
  }, [data, loading, refresh]);

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategories must be used inside CategoriesProvider");
  }
  return context;
}
