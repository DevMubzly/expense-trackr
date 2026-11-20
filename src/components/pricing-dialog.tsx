"use client";

import { useEffect, useId } from "react";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
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
      <button
        type="button"
        aria-label="Close pricing"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-foreground/50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-foreground/10 bg-card p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          aria-label="Close pricing"
          onClick={onClose}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon icon={Cancel01Icon} className="size-4" />
        </button>

        <div className="mx-auto max-w-xl text-center">
          <p className="text-[13px] text-muted-foreground">Pricing</p>
          <h2
            id={titleId}
            className="mt-2 font-display text-3xl leading-tight tracking-[-0.04em] sm:text-4xl"
          >
            One plan. Everything in.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            No tiers, no feature gates, no seat maths. One workspace that covers
            the whole month.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col justify-center gap-4 rounded-xl border border-foreground/10 bg-muted/30 p-6">
            <p className="text-[13px] text-muted-foreground">Expense Trackr Pro</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-medium text-muted-foreground">$</span>
              <span className="font-display text-5xl leading-none tracking-[-0.04em]">
                6
              </span>
              <span className="text-[12px] text-muted-foreground">per month</span>
            </div>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Billed monthly. Cancel whenever. Your ledger stays exportable
              either way.
            </p>
          </div>

          <div>
            <p className="text-[13px] text-muted-foreground">What you get</p>
            <ul className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[13px]">
                  <Icon
                    icon={Tick02Icon}
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
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
