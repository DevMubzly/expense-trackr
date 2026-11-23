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

export const PHONE_FORMATS: Record<
  Currency,
  { country: string; placeholder: string }
> = {
  UGX: { country: "Uganda", placeholder: "0772 123 456" },
  USD: { country: "United States", placeholder: "(555) 123-4567" },
  KES: { country: "Kenya", placeholder: "0712 345 678" },
  RWF: { country: "Rwanda", placeholder: "0788 123 456" },
  TZS: { country: "Tanzania", placeholder: "0712 345 678" },
};

export function formatPhoneNumber(
  value: string,
  currency: Currency,
): string {
  let digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const countryCodes: Partial<Record<Currency, string>> = {
    UGX: "256",
    KES: "254",
    RWF: "250",
    TZS: "255",
  };
  const countryCode = countryCodes[currency];
  if (countryCode && digits.startsWith(countryCode)) {
    digits = `0${digits.slice(countryCode.length)}`;
  }

  if (currency === "USD") {
    const local = digits.slice(0, 10);
    if (local.length <= 3) return `(${local}`;
    if (local.length <= 6) return `(${local.slice(0, 3)}) ${local.slice(3)}`;
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }

  const local = digits.slice(0, 10);
  return [local.slice(0, 4), local.slice(4, 7), local.slice(7, 10)]
    .filter(Boolean)
    .join(" ");
}

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
