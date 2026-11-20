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
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-background">
      <button
        type="button"
        aria-label="Close pricing"
        onClick={onClose}
        className="fixed right-5 top-5 z-10 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Icon icon={Cancel01Icon} className="size-4" />
      </button>

      <div className="flex min-h-dvh items-center justify-center px-6 py-14">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="w-full max-w-4xl"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] text-muted-foreground">Pricing</p>
            <h2
              id={titleId}
              className="mt-3 font-display text-4xl leading-[1.02] tracking-[-0.04em] sm:text-5xl"
            >
              One plan. Everything in.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              No tiers, no feature gates, no seat maths. One workspace that
              covers the whole month.
            </p>
          </div>

          <div className="mt-10 grid overflow-hidden rounded-[28px] border border-foreground/10 bg-card shadow-[0_24px_60px_-40px_rgba(0,0,0,0.35)] lg:grid-cols-[0.85fr_1.15fr]">
            <div className="flex flex-col justify-center gap-6 border-b border-foreground/10 bg-muted/30 p-8 lg:border-b-0 lg:border-r lg:p-10">
              <p className="text-[13px] text-muted-foreground">Expense Trackr Pro</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-medium text-muted-foreground">$</span>
                <span className="font-display text-6xl leading-none tracking-[-0.04em]">
                  6
                </span>
                <span className="text-[12px] text-muted-foreground">per month</span>
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Billed monthly. Cancel whenever. Your ledger stays exportable
                either way.
              </p>
            </div>

            <div className="p-8 lg:p-10">
              <p className="text-[13px] text-muted-foreground">What you get</p>
              <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
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
    </div>
  );
}
