"use client";

import type { ReactNode } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/motion/combobox";
import { cn } from "@/lib/utils";

export type DropdownOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

export function DropdownSelect({
  value,
  onValueChange,
  options,
  ariaLabel,
  placeholder = "Choose",
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Combobox value={value} onValueChange={onValueChange} className={className}>
      <ComboboxTrigger
        className={cn(
          "h-9 min-w-0 justify-between rounded-full px-3 text-sm",
          !value && "text-muted-foreground",
        )}
      >
        <ComboboxInput
          aria-label={ariaLabel}
          placeholder={placeholder}
          showIcon={false}
        />
      </ComboboxTrigger>
      <ComboboxContent className="w-56 rounded-2xl">
        <ComboboxList ariaLabel={ariaLabel} className="p-2">
          <ComboboxEmpty>No options.</ComboboxEmpty>
          {options.map((option) => (
            <ComboboxItem
              key={option.value}
              value={option.value}
              textValue={option.label}
            >
              <span className="flex items-center gap-2">
                {option.icon}
                {option.label}
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
