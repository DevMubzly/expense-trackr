import {
  ArrowLeftRightIcon,
  Briefcase01Icon,
  Car01Icon,
  GameController01Icon,
  GiftIcon,
  Invoice01Icon,
  Medicine01Icon,
  Package01Icon,
  RiceBowl01Icon,
  ShoppingBag01Icon,
  Store01Icon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type CategoryKind = "expense" | "income";

export type CategoryIconKey =
  | "food"
  | "transport"
  | "bills"
  | "fun"
  | "shopping"
  | "health"
  | "package"
  | "salary"
  | "freelance"
  | "forex"
  | "store"
  | "gift";

export type CategoryRecord = {
  id: string;
  label: string;
  color: string;
  kind: CategoryKind;
  iconKey: CategoryIconKey;
};

export type Category = CategoryRecord & {
  icon: IconSvgElement;
};

export const CATEGORY_ICONS: Record<CategoryIconKey, IconSvgElement> = {
  food: RiceBowl01Icon,
  transport: Car01Icon,
  bills: Invoice01Icon,
  fun: GameController01Icon,
  shopping: ShoppingBag01Icon,
  health: Medicine01Icon,
  package: Package01Icon,
  salary: Wallet02Icon,
  freelance: Briefcase01Icon,
  forex: ArrowLeftRightIcon,
  store: Store01Icon,
  gift: GiftIcon,
};

export const CATEGORY_ICON_OPTIONS: {
  key: CategoryIconKey;
  label: string;
}[] = [
  { key: "food", label: "Food" },
  { key: "transport", label: "Transport" },
  { key: "bills", label: "Bills" },
  { key: "fun", label: "Fun" },
  { key: "shopping", label: "Shopping" },
  { key: "health", label: "Health" },
  { key: "package", label: "General" },
  { key: "salary", label: "Salary" },
  { key: "freelance", label: "Work" },
  { key: "forex", label: "Exchange" },
  { key: "store", label: "Store" },
  { key: "gift", label: "Gift" },
];

export const CATEGORY_COLORS = [
  "oklch(0.74 0.16 62)",
  "oklch(0.72 0.13 215)",
  "oklch(0.7 0.16 295)",
  "oklch(0.73 0.18 350)",
  "oklch(0.76 0.16 150)",
  "oklch(0.78 0.12 190)",
  "oklch(0.7 0.15 155)",
  "oklch(0.7 0.13 220)",
  "oklch(0.74 0.15 62)",
  "oklch(0.64 0.02 275)",
];

export const DEFAULT_CATEGORY_RECORDS: CategoryRecord[] = [
  { id: "food", label: "Food", iconKey: "food", color: "oklch(0.74 0.16 62)", kind: "expense" },
  { id: "transport", label: "Transport", iconKey: "transport", color: "oklch(0.72 0.13 215)", kind: "expense" },
  { id: "bills", label: "Bills", iconKey: "bills", color: "oklch(0.7 0.16 295)", kind: "expense" },
  { id: "fun", label: "Fun", iconKey: "fun", color: "oklch(0.73 0.18 350)", kind: "expense" },
  { id: "shopping", label: "Shopping", iconKey: "shopping", color: "oklch(0.76 0.16 150)", kind: "expense" },
  { id: "health", label: "Health", iconKey: "health", color: "oklch(0.78 0.12 190)", kind: "expense" },
  { id: "other", label: "Other", iconKey: "package", color: "oklch(0.64 0.02 275)", kind: "expense" },
  { id: "salary", label: "Salary", iconKey: "salary", color: "oklch(0.7 0.15 155)", kind: "income" },
  { id: "freelance", label: "Freelance", iconKey: "freelance", color: "oklch(0.7 0.13 220)", kind: "income" },
  { id: "forex", label: "Forex", iconKey: "forex", color: "oklch(0.68 0.15 295)", kind: "income" },
  { id: "side-hustle", label: "Side hustle", iconKey: "store", color: "oklch(0.74 0.15 62)", kind: "income" },
  { id: "gift", label: "Gift", iconKey: "gift", color: "oklch(0.72 0.16 350)", kind: "income" },
  { id: "other-income", label: "Other income", iconKey: "package", color: "oklch(0.7 0.05 160)", kind: "income" },
];

export function toCategory(record: CategoryRecord): Category {
  return {
    ...record,
    icon: CATEGORY_ICONS[record.iconKey] ?? Package01Icon,
  };
}

/** Static defaults, kept as a fallback for server code and first paint. */
export const EXPENSE_CATEGORIES: Category[] = DEFAULT_CATEGORY_RECORDS.filter(
  (category) => category.kind === "expense",
).map(toCategory);

export const INCOME_CATEGORIES: Category[] = DEFAULT_CATEGORY_RECORDS.filter(
  (category) => category.kind === "income",
).map(toCategory);

export const CATEGORIES = EXPENSE_CATEGORIES;
export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
export const CATEGORY_BY_ID = new Map(
  ALL_CATEGORIES.map((category) => [category.id, category]),
);

export function categoriesFor(kind: CategoryKind): Category[] {
  return kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function categoryOf(id: string): Category {
  return CATEGORY_BY_ID.get(id) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

export function isCategoryOfKind(id: string, kind: CategoryKind): boolean {
  return categoryOf(id).kind === kind;
}
