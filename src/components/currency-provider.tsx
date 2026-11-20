"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { formatNumber } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { Currency, Settings } from "@/lib/types";

type CurrencyContextValue = {
  currency: Currency;
  usdRate: number;
  unit: "UGX" | "$";
  convert: (ugx: number) => number;
  formatValue: (ugx: number) => string;
  formatMoney: (ugx: number) => string;
  refresh: () => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data, refresh } = useApi<Settings>("/api/settings");
  const currency: Currency = data?.defaultCurrency ?? "UGX";
  const usdRate = data?.usdRate && data.usdRate > 0 ? data.usdRate : 1;

  const convert = useCallback(
    (ugx: number) => (currency === "USD" ? ugx / usdRate : ugx),
    [currency, usdRate],
  );

  const formatValue = useCallback(
    (ugx: number) => {
      if (currency === "USD") {
        return convert(ugx).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      return formatNumber(Math.round(ugx));
    },
    [convert, currency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      usdRate,
      unit: currency === "USD" ? "$" : "UGX",
      convert,
      formatValue,
      formatMoney: (ugx: number) =>
        `${currency === "USD" ? "$" : "UGX"} ${formatValue(ugx)}`,
      refresh,
    }),
    [convert, currency, formatValue, refresh, usdRate],
  );

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
