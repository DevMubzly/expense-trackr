import Link from "next/link";
import { ArrowLeft01Icon, ArrowRight01Icon, Tick02Icon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";
import { LandingFooter } from "@/components/landing-footer";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    detail: "One person, the whole month.",
    features: ["Accounts and wallets", "Expenses and income", "Budgets and categories", "Basic insights"],
    href: "/dashboard",
    cta: "Open App",
    featured: false,
  },
  {
    name: "Pro",
    price: "6",
    suffix: "USD / month",
    detail: "For people who plan further ahead.",
    features: [
      "Everything in Starter",
      "Goals and debts",
      "Recurring entries",
      "Multi-currency ledger",
      "Full heatmaps and trends",
    ],
    href: "/dashboard",
    cta: "Open App",
    featured: true,
  },
  {
    name: "Team",
    price: "14",
    suffix: "USD / month",
    detail: "Shared household or small team.",
    features: ["Everything in Pro", "Shared workspace", "Household members", "Export and import"],
    href: "/dashboard",
    cta: "Open App",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div className="theme-light min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-foreground/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-foreground text-background">
              <Icon icon={Wallet02Icon} className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-[-0.02em]">
              Expense Trackr
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            <Icon icon={ArrowLeft01Icon} className="size-3.5" />
            Back home
          </Link>
        </div>
      </header>

      <main className="px-4 pb-4 pt-10 sm:px-6">
        <section className="mx-auto w-full max-w-[1200px]">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] text-muted-foreground">Pricing</p>
            <h1 className="mt-3 font-display text-5xl leading-[1.02] tracking-[-0.05em] sm:text-6xl">
              Simple, like the money should be.
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Every plan uses the same workspace. Upgrade when you need goals,
              debts and shared accounts. This demo is open either way.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "flex flex-col rounded-3xl border p-6 sm:p-7",
                  plan.featured
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/10 bg-card",
                )}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium">{plan.name}</h2>
                  {plan.featured ? (
                    <span className="rounded-full bg-background/15 px-2.5 py-1 text-[10px] text-background/80">
                      Most popular
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  {plan.price === "Free" ? (
                    <span className="font-display text-4xl leading-none">Free</span>
                  ) : (
                    <>
                      <span className="text-lg font-medium opacity-70">$</span>
                      <span className="font-display text-5xl leading-none">{plan.price}</span>
                      <span
                        className={cn(
                          "text-[11px]",
                          plan.featured ? "text-background/55" : "text-muted-foreground",
                        )}
                      >
                        {plan.suffix}
                      </span>
                    </>
                  )}
                </div>

                <p
                  className={cn(
                    "mt-3 text-[13px]",
                    plan.featured ? "text-background/60" : "text-muted-foreground",
                  )}
                >
                  {plan.detail}
                </p>

                <ul className="mt-7 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13px]">
                      <Icon
                        icon={Tick02Icon}
                        className={cn(
                          "mt-0.5 size-3.5",
                          plan.featured ? "text-background/70" : "text-muted-foreground",
                        )}
                      />
                      <span className={plan.featured ? "text-background/85" : undefined}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={buttonVariants({
                    size: "lg",
                    variant: plan.featured ? "outline" : "default",
                    className: cn(
                      "mt-8 w-full",
                      plan.featured &&
                        "bg-background text-foreground hover:bg-background/85",
                    ),
                  })}
                >
                  {plan.cta}
                  <Icon icon={ArrowRight01Icon} className="size-4" />
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            Prices are illustrative for this demo. Nothing is charged and no
            payment details are collected.
          </p>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
