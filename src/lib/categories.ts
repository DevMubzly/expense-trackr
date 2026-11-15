export type Category = {
  id: string;
  label: string;
  emoji: string;
  /** Works in both themes: used for chart fills and chip tints. */
  color: string;
};

export const CATEGORIES: Category[] = [
  { id: "food", label: "Food", emoji: "🍲", color: "oklch(0.74 0.16 62)" },
  { id: "transport", label: "Transport", emoji: "🛵", color: "oklch(0.72 0.13 215)" },
  { id: "bills", label: "Bills", emoji: "🧾", color: "oklch(0.7 0.16 295)" },
  { id: "fun", label: "Fun", emoji: "🎉", color: "oklch(0.73 0.18 350)" },
  { id: "shopping", label: "Shopping", emoji: "🛍️", color: "oklch(0.76 0.16 150)" },
  { id: "health", label: "Health", emoji: "💊", color: "oklch(0.78 0.12 190)" },
  { id: "other", label: "Other", emoji: "📦", color: "oklch(0.64 0.02 275)" },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryOf(id: string): Category {
  return CATEGORY_BY_ID.get(id) ?? CATEGORIES[CATEGORIES.length - 1];
}
