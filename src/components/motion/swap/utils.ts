export function isValidAddress(v: string) {
  if (/^0x[0-9a-fA-F]{40}$/.test(v)) return true;
  if (/\.(eth|sol|bnb)$/.test(v) && v.length > 5) return true;
  return false;
}

export function truncateAddress(v: string) {
  if (v.startsWith("0x") && v.length === 42) {
    return `${v.slice(0, 6)}...${v.slice(-4)}`;
  }
  return v;
}

export function sanitizeAmount(v: string) {
  const cleaned = v.replace(/[^0-9.]/g, "");
  const [whole = "", ...rest] = cleaned.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimals = rest.join("").slice(0, 6);
  return rest.length > 0 ? `${grouped}.${decimals}` : grouped;
}

export function formatAmount(n: number, max = 6) {
  if (!Number.isFinite(n)) return "0";
  if (n === 0) return "0";
  if (n >= 1000) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
}
