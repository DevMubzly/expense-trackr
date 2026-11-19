"use client";

import { BankIcon, Cash01Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
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
import type { Account, AccountType } from "@/lib/types";

export function accountIcon(type: AccountType): IconSvgElement {
  if (type === "cash") return Cash01Icon;
  if (type === "bank") return BankIcon;
  return SmartPhone01Icon;
}

export function AccountSelect({
  label,
  value,
  accounts,
  onValueChange,
  compact = false,
  hideLabel = false,
}: {
  label: string;
  value: string;
  accounts: Account[];
  onValueChange: (value: string) => void;
  compact?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <div>
      {!compact && !hideLabel ? (
        <p className="mb-1 text-[13px] text-muted-foreground">{label}</p>
      ) : null}
      <Combobox value={value} onValueChange={onValueChange}>
        <ComboboxTrigger
          className={
            compact
              ? "h-9 min-w-0 rounded-full px-2 text-[12px]"
              : "h-10 min-w-0 rounded-full px-3"
          }
        >
          <ComboboxInput
            aria-label={label}
            placeholder="Choose account"
            showIcon={false}
          />
        </ComboboxTrigger>
        <ComboboxContent className="w-56 rounded-2xl">
          <ComboboxList ariaLabel={label} className="p-2">
            <ComboboxEmpty>No accounts.</ComboboxEmpty>
            {accounts.map((account) => (
              <ComboboxItem key={account.id} value={account.id} textValue={account.name}>
                <span className="flex items-center gap-2">
                  <Icon icon={accountIcon(account.type)} className="size-4" />
                  <span className="min-w-0 flex-1 truncate">{account.name}</span>
                </span>
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
