"use client";

import { Icon } from "@/components/huge-icon";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/motion/combobox";
import { categoriesFor, type Category, type CategoryKind } from "@/lib/categories";

export function CategorySelect({
  value,
  onValueChange,
  kind = "expense",
  categories,
  label = "Category",
  allLabel,
  compact = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  kind?: CategoryKind;
  categories?: Category[];
  label?: string;
  allLabel?: string;
  compact?: boolean;
}) {
  const options = categories ?? categoriesFor(kind);

  return (
    <Combobox value={value} onValueChange={onValueChange}>
      <ComboboxTrigger
        className={
          compact
            ? "h-9 min-w-0 rounded-md px-2 text-[12px]"
            : "h-10 min-w-0 rounded-md px-3"
        }
      >
        <ComboboxInput
          aria-label={label}
          placeholder={allLabel ?? label}
          showIcon={false}
        />
      </ComboboxTrigger>
      <ComboboxContent className="w-56 rounded-md">
        <ComboboxList ariaLabel={label} className="p-2">
          <ComboboxEmpty>No categories.</ComboboxEmpty>
          {allLabel ? (
            <ComboboxItem value="all" textValue={allLabel}>
              {allLabel}
            </ComboboxItem>
          ) : null}
          {options.map((category) => (
            <ComboboxItem key={category.id} value={category.id} textValue={category.label}>
              <span className="flex items-center gap-2">
                <Icon icon={category.icon} className="size-4" />
                {category.label}
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
