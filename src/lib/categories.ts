import {
  GameController01Icon,
  Invoice01Icon,
  Medicine01Icon,
  Package01Icon,
  RiceBowl01Icon,
  ShoppingBag01Icon,
  Car01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type Category = {
  id: string;
  label: string;
  icon: IconSvgElement;
  /** Works in both themes: used for chart fills and chip tints. */
  color: string;
};

export const CATEGORIES: Category[] = [
  { id: "food", label: "Food", icon: RiceBowl01Icon, color: "oklch(0.74 0.16 62)" },
  { id: "transport", label: "Transport", icon: Car01Icon, color: "oklch(0.72 0.13 215)" },
  { id: "bills", label: "Bills", icon: Invoice01Icon, color: "oklch(0.7 0.16 295)" },
  { id: "fun", label: "Fun", icon: GameController01Icon, color: "oklch(0.73 0.18 350)" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag01Icon, color: "oklch(0.76 0.16 150)" },
  { id: "health", label: "Health", icon: Medicine01Icon, color: "oklch(0.78 0.12 190)" },
  { id: "other", label: "Other", icon: Package01Icon, color: "oklch(0.64 0.02 275)" },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryOf(id: string): Category {
  return CATEGORY_BY_ID.get(id) ?? CATEGORIES[CATEGORIES.length - 1];
}
