import Link from "next/link";
import {
  ArrowRight01Icon,
  ChartIncreaseIcon,
  Invoice02Icon,
  Money03Icon,
  Search01Icon,
  Target02Icon,
  Tick02Icon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";
import { LandingFooter } from "@/components/landing-footer";
import { cn } from "@/lib/utils";

const BARS = [34, 54, 42, 68, 51, 83, 63, 76, 58, 91, 72, 86];

const ACCOUNTS = [
  { name: "Cash wallet", detail: "Everyday spending", value: "420,000", share: 28 },
  { name: "Bank account", detail: "Salary lands here", value: "1,840,000", share: 62 },
  { name: "Mobile money", detail: "Bills and top-ups", value: "310,000", share: 10 },
];

const CATEGORIES = [
  { label: "Food", value: 38, color: "oklch(0.74 0.16 62)" },
  { label: "Bills", value: 26, color: "oklch(0.7 0.16 295)" },
  { label: "Transport", value: 18, color: "oklch(0.72 0.13 215)" },
  { label: "Other", value: 18, color: "oklch(0.76 0.16 150)" },
];

const STEPS = [
  { title: "Add your accounts", body: "Cash, bank and mobile money wallets." },
  { title: "Set your defaults", body: "Budget, payday, currency and income sources." },
  { title: "Watch the pages agree", body: "Every view reads the same ledger." },
];

export default function LandingPage() {
  return (
    <div className="theme-light min-h-dvh bg-muted/40 text-foreground">
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

          <nav className="hidden items-center gap-7 text-[13px] text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <Link href="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
          </nav>

          <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
            Open App
            <Icon icon={ArrowRight01Icon} className="size-3.5" />
          </Link>
        </div>
      </header>

      <main className="px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
        <section className="w-full overflow-hidden rounded-[32px] border border-foreground/10 bg-card">
          <div className="relative px-6 pb-10 pt-14 sm:px-10 sm:pt-20 lg:px-16">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-muted/60 to-transparent" />
            <div className="relative mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background px-3 py-1.5 text-[11px] text-muted-foreground">
                <Icon icon={Tick02Icon} className="size-3" />
                A calmer way to run your money
              </span>
              <h1 className="mt-6 font-display text-4xl leading-[0.98] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                Every shilling
                <span className="block text-muted-foreground/60">has a job.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                Expenses, income, budgets, goals and debts in one desktop
                workspace. Set your defaults once and let every page tell the
                same story.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                  Open App
                  <Icon icon={ArrowRight01Icon} className="size-4" />
                </Link>
                <Link
                  href="/pricing"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  View pricing
                </Link>
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">
                No bank connection. Any email and password opens the demo.
              </p>
            </div>

            <div id="preview" className="relative mx-auto mt-12 max-w-4xl">
              <div className="rounded-[26px] border border-foreground/10 bg-background p-2 shadow-2xl shadow-foreground/5">
                <div className="overflow-hidden rounded-[20px] border border-foreground/10">
                  <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-foreground/15" />
                      <span className="size-2 rounded-full bg-foreground/15" />
                      <span className="size-2 rounded-full bg-foreground/15" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      expense-trackr / dashboard
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] text-muted-foreground">
                      Live mock
                    </span>
                  </div>

                  <div className="grid gap-3 p-3 sm:grid-cols-[1.1fr_0.9fr] sm:p-4">
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between rounded-xl border border-foreground/10 bg-muted/20 px-4 py-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Spent this month</p>
                          <p className="tnum mt-1 text-xl font-semibold tracking-[-0.02em]">
                            1,320,400 <span className="text-[10px] font-medium text-muted-foreground">UGX</span>
                          </p>
                        </div>
                        <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[9px] text-muted-foreground">
                          44% of budget
                        </span>
                      </div>

                      <div className="rounded-xl border border-foreground/10 p-3">
                        <div className="flex h-24 items-end gap-1.5">
                          {BARS.map((bar, index) => (
                            <span
                              key={index}
                              className="flex-1 rounded-sm bg-foreground/80"
                              style={{ height: `${bar}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-foreground/10 p-3">
                        <p className="text-[10px] text-muted-foreground">Accounts</p>
                        <div className="mt-2 space-y-2">
                          {ACCOUNTS.map((account) => (
                            <div key={account.name} className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">{account.name}</span>
                              <span className="tnum font-medium">{account.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-foreground/10 p-3">
                        <p className="text-[10px] text-muted-foreground">Top categories</p>
                        <div className="mt-2 flex h-2 overflow-hidden rounded-full">
                          {CATEGORIES.map((category) => (
                            <span
                              key={category.label}
                              style={{ width: `${category.value}%`, background: category.color }}
                            />
                          ))}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          {CATEGORIES.map((category) => (
                            <span key={category.label} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                              <span className="size-1.5 rounded-full" style={{ background: category.color }} />
                              {category.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-4 w-full">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Tile className="md:col-span-2 lg:row-span-2">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <Icon icon={Money03Icon} className="size-5 text-muted-foreground" />
                  <h2 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em]">
                    One money picture.
                  </h2>
                  <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                    Accounts, earnings, budgets and plan items all read from the
                    same ledger, so you never reconcile two versions of the
                    truth.
                  </p>
                </div>
                <div className="mt-8 space-y-2">
                  {ACCOUNTS.map((account) => (
                    <div key={account.name} className="rounded-xl border border-foreground/10 px-3 py-2.5">
                      <div className="flex items-center justify-between text-[12px]">
                        <span>{account.name}</span>
                        <span className="tnum font-medium">
                          {account.value}
                          <span className="ml-1 text-[9px] font-normal text-muted-foreground">UGX</span>
                        </span>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-foreground/70" style={{ width: `${account.share}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Tile>

            <Tile>
              <Icon icon={ChartIncreaseIcon} className="size-5 text-muted-foreground" />
              <h3 className="mt-4 text-sm font-medium">Daily flow</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                Pace, heat and category splits without spreadsheets.
              </p>
              <div className="mt-4 flex h-16 items-end gap-1">
                {BARS.map((bar, index) => (
                  <span key={index} className="flex-1 rounded-sm bg-foreground/25" style={{ height: `${bar}%` }} />
                ))}
              </div>
            </Tile>

            <Tile>
              <Icon icon={Target02Icon} className="size-5 text-muted-foreground" />
              <h3 className="mt-4 text-sm font-medium">Goals with progress</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                Contribute, withdraw and watch savings climb.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  ["Emergency fund", 78],
                  ["New laptop", 52],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{label}</span>
                      <span>{value}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-foreground/70" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Tile>

            <Tile className="lg:col-span-2">
              <div className="flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <Icon icon={Invoice02Icon} className="size-5 text-muted-foreground" />
                  <h3 className="mt-4 text-sm font-medium">Recurring on autopilot</h3>
                  <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                    Bills, salary and wallet top-ups stay visible before they
                    surprise you.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {["Rent", "Internet", "Salary"].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-foreground/10 px-3 py-1.5 text-[11px] text-muted-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </Tile>

            <Tile className="lg:col-span-2">
              <div className="flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <Icon icon={Wallet02Icon} className="size-5 text-muted-foreground" />
                  <h3 className="mt-4 text-sm font-medium">Debts in both directions</h3>
                  <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                    Track what you owe and what you lent, with payments and due
                    dates in one place.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <span className="rounded-full border border-foreground/10 px-3 py-1.5 text-[11px] text-muted-foreground">
                    Owed to you
                  </span>
                  <span className="rounded-full border border-foreground/10 px-3 py-1.5 text-[11px] text-muted-foreground">
                    You owe
                  </span>
                </div>
              </div>
            </Tile>

            <Tile className="lg:col-span-4">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Icon icon={Search01Icon} className="size-5 text-muted-foreground" />
                  <h3 className="mt-4 text-sm font-medium">Set the defaults once</h3>
                  <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-muted-foreground">
                    Currency, payday, income sources and default accounts travel
                    everywhere. No duplicate setup.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:max-w-xl lg:flex-1">
                  {STEPS.map((step, index) => (
                    <div key={step.title} className="rounded-xl border border-foreground/10 p-3">
                      <span className="text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                      <p className="mt-2 text-[12px] font-medium">{step.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{step.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Tile>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-foreground/10 bg-card p-6 transition-colors hover:border-foreground/20",
        className,
      )}
    >
      {children}
    </div>
  );
}
