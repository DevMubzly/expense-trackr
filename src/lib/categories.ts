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

export type Category = {
  id: string;
  label: string;
  icon: IconSvgElement;
  /** Works in both themes: used for chart fills and chip tints. */
  color: string;
  kind: CategoryKind;
};

export const EXPENSE_CATEGORIES: Category[] = [
  { id: "food", label: "Food", icon: RiceBowl01Icon, color: "oklch(0.74 0.16 62)", kind: "expense" },
  { id: "transport", label: "Transport", icon: Car01Icon, color: "oklch(0.72 0.13 215)", kind: "expense" },
  { id: "bills", label: "Bills", icon: Invoice01Icon, color: "oklch(0.7 0.16 295)", kind: "expense" },
  { id: "fun", label: "Fun", icon: GameController01Icon, color: "oklch(0.73 0.18 350)", kind: "expense" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag01Icon, color: "oklch(0.76 0.16 150)", kind: "expense" },
  { id: "health", label: "Health", icon: Medicine01Icon, color: "oklch(0.78 0.12 190)", kind: "expense" },
  { id: "other", label: "Other", icon: Package01Icon, color: "oklch(0.64 0.02 275)", kind: "expense" },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "salary", label: "Salary", icon: Wallet02Icon, color: "oklch(0.7 0.15 155)", kind: "income" },
  { id: "freelance", label: "Freelance", icon: Briefcase01Icon, color: "oklch(0.7 0.13 220)", kind: "income" },
  { id: "forex", label: "Forex", icon: ArrowLeftRightIcon, color: "oklch(0.68 0.15 295)", kind: "income" },
  { id: "side-hustle", label: "Side hustle", icon: Store01Icon, color: "oklch(0.74 0.15 62)", kind: "income" },
  { id: "gift", label: "Gift", icon: GiftIcon, color: "oklch(0.72 0.16 350)", kind: "income" },
  { id: "other-income", label: "Other income", icon: Package01Icon, color: "oklch(0.7 0.05 160)", kind: "income" },
];

/** Expense categories. Kept as the default list for existing spending charts. */
export const CATEGORIES = EXPENSE_CATEGORIES;

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const CATEGORY_BY_ID = new Map(ALL_CATEGORIES.map((category) => [category.id, category]));

export function categoriesFor(kind: CategoryKind): Category[] {
  return kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function categoryOf(id: string): Category {
  return CATEGORY_BY_ID.get(id) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

export function isCategoryOfKind(id: string, kind: CategoryKind): boolean {
  return categoryOf(id).kind === kind;
}
