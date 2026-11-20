"use client";

import Link from "next/link";
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  ChartIncreaseIcon,
  Invoice02Icon,
  Money03Icon,
  Search01Icon,
  Settings01Icon,
  SparklesIcon,
  Target02Icon,
  Tick02Icon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Money03Icon,
    title: "One money picture",
    body: "Accounts, earnings, budgets and plan items all read from the same ledger.",
  },
  {
    icon: ChartIncreaseIcon,
    title: "Spending that makes sense",
    body: "Daily flow, category splits, pace and heatmaps without spreadsheet gymnastics.",
  },
  {
    icon: Target02Icon,
    title: "Goals with real progress",
    body: "Contribute, withdraw and watch savings grow against a target and deadline.",
  },
  {
    icon: Wallet02Icon,
    title: "Debts in both directions",
    body: "Track what you owe and what you lent, with payments and due dates in one place.",
  },
  {
    icon: Invoice02Icon,
    title: "Recurring on autopilot",
    body: "Bills, salary and wallet top-ups stay visible before they surprise you.",
  },
  {
    icon: Settings01Icon,
    title: "Defaults you set once",
    body: "Currency formatting, payday, income sources and default accounts travel everywhere.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Add your accounts",
    body: "Cash, bank and mobile money wallets. Opening balances become your starting point.",
  },
  {
    number: "02",
    title: "Set your money defaults",
    body: "Monthly budget, payday, income sources and the account new entries should use.",
  },
  {
    number: "03",
    title: "Let the pages agree",
    body: "Home, Expenses, Stats, Plan and Settings all read the same numbers.",
  },
];

const BARS = [34, 54, 42, 68, 51, 83, 63, 76, 58, 91, 72, 86];

export default function LandingPage() {
  const { user } = useAuth();
  const primaryHref = user ? "/dashboard" : "/login";

  return (
    <div className="theme-light min-h-dvh bg-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-40 bg-gradient-to-b from-background to-transparent" />

      <header className="relative z-50 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-foreground text-background">
            <Icon icon={Wallet02Icon} className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-[-0.02em]">
            Expense Trackr
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#preview" className="transition-colors hover:text-foreground">
            Preview
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {!user ? (
            <Link
              href="/login"
              className="hidden px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Sign in
            </Link>
          ) : null}
          <Link
            href={primaryHref}
            className={buttonVariants({ size: "sm" })}
          >
            {user ? "Open dashboard" : "Get started"}
            <Icon icon={ArrowRight01Icon} className="size-3.5" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto w-full max-w-6xl px-6 pb-20 pt-12 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
              <Icon icon={SparklesIcon} className="size-3.5" />
              A calmer way to run your money
            </span>
            <h1 className="mt-6 font-display text-4xl leading-[0.98] tracking-[-0.05em] sm:text-5xl md:text-6xl">
              Every shilling
              <span className="block text-muted-foreground/70">
                has a job.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Expenses, income sources, budgets, goals and debts in one desktop
              workspace. Set your defaults once and let every page tell the same
              story.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={primaryHref}
                className={buttonVariants({ size: "lg" })}
              >
                {user ? "Open your dashboard" : "Try the mock app"}
                <Icon icon={ArrowRight01Icon} className="size-4" />
              </Link>
              <a
                href="#preview"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                See the preview
              </a>
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              No real bank connection. Any email and password works in the demo.
            </p>
          </div>

          <div id="preview" className="relative mx-auto mt-14 max-w-5xl">
            <div className="absolute -inset-x-10 -top-8 -z-10 h-56 rounded-full bg-gradient-to-r from-emerald-400/10 via-sky-400/10 to-violet-400/10 blur-3xl" />
            <div className="rounded-[28px] border border-foreground/10 bg-card/70 p-2 shadow-2xl shadow-foreground/5 backdrop-blur">
              <div className="overflow-hidden rounded-[22px] border border-foreground/10 bg-background">
                <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-400/70" />
                    <span className="size-2 rounded-full bg-amber-400/70" />
                    <span className="size-2 rounded-full bg-emerald-400/70" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    expense-trackr / dashboard
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1 text-[9px] text-muted-foreground">
                    Live mock
                  </span>
                </div>

                <div className="grid gap-3 p-3 sm:p-5 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        ["Spent", "UGX 1.32M", "text-orange-500"],
                        ["Income", "UGX 2.80M", "text-emerald-500"],
                        ["Net", "UGX 1.48M", "text-sky-500"],
                      ].map(([label, value, color]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-foreground/10 bg-muted/10 p-3"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={cn("size-1.5 rounded-full bg-current", color)} />
                            <p className="text-[9px] text-muted-foreground">
                              {label}
                            </p>
                          </div>
                          <p className="mt-2 truncate text-[11px] font-semibold sm:text-sm">
                            {value}
                          </p>
                          <div className="mt-3 flex h-6 items-end gap-0.5">
                            {[30, 55, 40, 70, 48, 82, 60, 76].map((height, index) => (
                              <span
                                key={index}
                                className="flex-1 rounded-t bg-foreground/15"
                                style={{ height: `${height}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-foreground/10 bg-muted/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-medium">Daily flow</p>
                          <p className="text-[9px] text-muted-foreground">
                            Last 30 days, stacked by category
                          </p>
                        </div>
                        <span className="rounded-full bg-muted px-2 py-1 text-[9px] text-muted-foreground">
                          30 days
                        </span>
                      </div>
                      <div className="mt-5 flex h-32 items-end gap-1.5">
                        {BARS.map((height, index) => (
                          <div
                            key={index}
                            className="flex-1 rounded-t bg-gradient-to-t from-emerald-500/25 via-sky-500/45 to-violet-500/70"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-foreground/10 bg-muted/10 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-medium">Monthly budget</p>
                        <span className="text-[9px] text-muted-foreground">
                          66% used
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-2/3 rounded-full bg-foreground" />
                      </div>
                      <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
                        <span>UGX 1.32M spent</span>
                        <span>UGX 0.68M left</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-foreground/10 bg-muted/10 p-4">
                      <p className="text-[11px] font-medium">Goals</p>
                      {[
                        ["Emergency fund", "78%", "bg-emerald-500"],
                        ["New laptop", "52%", "bg-sky-500"],
                        ["Zanzibar trip", "34%", "bg-violet-500"],
                      ].map(([name, pct, color]) => (
                        <div key={name} className="mt-3">
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-muted-foreground">{name}</span>
                            <span>{pct}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full", color)}
                              style={{ width: pct }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-foreground/10 bg-muted/10 p-4">
                      <p className="text-[11px] font-medium">Accounts</p>
                      {[
                        ["Stanbic Bank", "UGX 3.20M", "text-sky-500"],
                        ["MTN MoMo", "UGX 0.84M", "text-amber-500"],
                        ["Cash", "UGX 0.19M", "text-emerald-500"],
                      ].map(([name, value, color]) => (
                        <div
                          key={name}
                          className="mt-2 flex items-center justify-between text-[10px]"
                        >
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className={cn("size-1.5 rounded-full bg-current", color)} />
                            {name}
                          </span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="border-y border-foreground/10 bg-muted/10"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                One workspace
              </p>
              <h2 className="mt-3 font-display text-3xl leading-tight tracking-[-0.04em] sm:text-4xl">
                Built for the whole month, not just the receipt.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The small decisions add up. Expense Trackr keeps the big picture
                close enough to act on.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-foreground/10 bg-background/60 p-5"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-muted/40">
                    <Icon icon={feature.icon} className="size-4" />
                  </span>
                  <h3 className="mt-4 text-sm font-medium">{feature.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto w-full max-w-6xl px-6 py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                How it works
              </p>
              <h2 className="mt-3 font-display text-3xl leading-tight tracking-[-0.04em] sm:text-4xl">
                Set the defaults once.
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Every page reads the same accounts, income sources and budget
                rules. No duplicate spreadsheets, no competing totals.
              </p>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "mt-6",
                )}
              >
                Try the demo
                <Icon icon={ArrowUpRight01Icon} className="size-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {STEPS.map((step) => (
                <div
                  key={step.number}
                  className="flex gap-5 rounded-2xl border border-foreground/10 bg-muted/10 p-5"
                >
                  <span className="font-display text-2xl text-muted-foreground/50">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium">{step.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-foreground/10 bg-foreground px-6 py-12 text-background sm:px-10">
            <div className="absolute -right-20 -top-24 size-72 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute -bottom-24 right-24 size-64 rounded-full bg-sky-400/15 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div className="max-w-xl">
                <p className="text-[11px] uppercase tracking-[0.18em] text-background/50">
                  Ready when you are
                </p>
                <h2 className="mt-3 font-display text-3xl leading-tight tracking-[-0.04em] sm:text-4xl">
                  Give your money a plan.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-background/60">
                  Mock login, real workflows. Use any email and password to step
                  into the workspace.
                </p>
              </div>
              <Link
                href={primaryHref}
                className={buttonVariants({
                  size: "lg",
                  className:
                    "bg-[var(--chart-positive)] text-emerald-950 hover:bg-[color-mix(in_oklab,var(--chart-positive),white_8%)]",
                })}
              >
                {user ? "Open dashboard" : "Enter the demo"}
                <Icon icon={ArrowRight01Icon} className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-[11px] text-muted-foreground lg:px-8">
          <span>Expense Trackr · Mock money, clear picture.</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Icon icon={Tick02Icon} className="size-3" />
              Local mock data
            </span>
            <span className="flex items-center gap-1.5">
              <Icon icon={Search01Icon} className="size-3" />
              No bank connection
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
