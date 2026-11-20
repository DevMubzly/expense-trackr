"use client";

import { useEffect, useId } from "react";
import {
  Cancel01Icon,
  Invoice01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/huge-icon";

const FEATURES = [
  "Cash, bank and mobile money accounts",
  "Expenses, income and transfers",
  "Budgets with pace and category splits",
  "Goals with contributions and deadlines",
  "Debts in both directions",
  "Recurring bills and salary",
  "UGX, USD, KES, RWF and TZS",
  "Heatmaps, trends and daily flow",
  "Household sharing",
  "Export and import your data",
];

export function PricingDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dark relative z-10 text-foreground max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-foreground/10 bg-card p-1 shadow-2xl"
      >
        <div className="flex items-center gap-2 px-3.5 pb-2 pt-2">
          <Icon icon={Invoice01Icon} className="size-3.5 shrink-0 text-muted-foreground" />
          <p id={titleId} className="truncate text-[15px]">
            Pricing
          </p>
          <button
            type="button"
            aria-label="Close pricing"
            onClick={onClose}
            className="ml-auto grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon icon={Cancel01Icon} className="size-4" />
          </button>
        </div>

        <div className="px-3.5 pb-3">
          <h2 className="font-display text-2xl leading-tight tracking-[-0.03em]">
            One plan. Everything in.
          </h2>
          <p className="mt-1.5 max-w-lg text-[12px] leading-relaxed text-muted-foreground">
            No tiers, no feature gates, no seat maths. One workspace that covers
            the whole month.
          </p>
        </div>

        <div className="grid gap-1 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col justify-center gap-3 rounded-xl border border-foreground/10 bg-muted/15 p-3.5 px-4">
            <p className="text-[11px] text-muted-foreground">Expense Trackr Pro</p>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-medium text-muted-foreground">$</span>
              <span className="font-display text-4xl leading-none tracking-[-0.04em]">
                6
              </span>
              <span className="text-[11px] text-muted-foreground">per month</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Billed monthly. Cancel whenever. Your ledger stays exportable
              either way.
            </p>
          </div>

          <div className="rounded-xl border border-foreground/10 bg-muted/15 p-3.5 px-4">
            <p className="text-[11px] text-muted-foreground">What you get</p>
            <ul className="mt-3 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[12px]">
                  <Icon
                    icon={Tick02Icon}
                    className="mt-0.5 size-3 shrink-0 text-muted-foreground"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
