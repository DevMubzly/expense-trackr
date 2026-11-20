"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { CURRENCY_META } from "@/lib/currencies";
import { useApi } from "@/lib/use-api";
import type { Currency, Settings } from "@/lib/types";

type CurrencyContextValue = {
  currency: Currency;
  unit: string;
  formatValue: (value: number) => string;
  formatMoney: (value: number) => string;
  refresh: () => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data, refresh } = useApi<Settings>("/api/settings");
  const currency: Currency = data?.defaultCurrency ?? "UGX";
  const meta = CURRENCY_META[currency];

  const value = useMemo<CurrencyContextValue>(() => {
    const formatValue = (amount: number) =>
      amount.toLocaleString("en-US", {
        minimumFractionDigits: meta.decimals,
        maximumFractionDigits: meta.decimals,
      });

    return {
      currency,
      unit: meta.symbol,
      formatValue,
      formatMoney: (amount: number) =>
        `${meta.symbol} ${formatValue(amount)}`,
      refresh,
    };
  }, [currency, meta, refresh]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used inside CurrencyProvider");
  }
  return context;
}
