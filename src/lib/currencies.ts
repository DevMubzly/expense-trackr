import type { Currency } from "./types";

export type CurrencyMeta = {
  code: Currency;
  label: string;
  symbol: string;
  decimals: number;
};

export const CURRENCY_META: Record<Currency, CurrencyMeta> = {
  UGX: {
    code: "UGX",
    label: "Ugandan shilling",
    symbol: "UGX",
    decimals: 0,
  },
  USD: {
    code: "USD",
    label: "US dollar",
    symbol: "$",
    decimals: 2,
  },
  KES: {
    code: "KES",
    label: "Kenyan shilling",
    symbol: "KSh",
    decimals: 2,
  },
  RWF: {
    code: "RWF",
    label: "Rwandan franc",
    symbol: "FRw",
    decimals: 0,
  },
  TZS: {
    code: "TZS",
    label: "Tanzanian shilling",
    symbol: "TSh",
    decimals: 0,
  },
};

export const CURRENCY_OPTIONS = (
  Object.keys(CURRENCY_META) as Currency[]
).map((code) => ({
  value: code,
  label: `${CURRENCY_META[code].symbol} · ${CURRENCY_META[code].label}`,
}));

export function formatCurrencyAmount(
  amount: number,
  currency: Currency,
): string {
  const meta = CURRENCY_META[currency];
  return `${meta.symbol} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  })}`;
}
