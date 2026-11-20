import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";
import { OpenAppButton } from "@/components/open-app-button";

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

export default function PricingPage() {
  return (
    <div className="theme-light min-h-dvh bg-muted/40 text-foreground">
      <header className="sticky top-0 z-50 border-b border-foreground/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-[-0.02em]">
            Expense Trackr
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon icon={ArrowLeft01Icon} className="size-3.5" />
            Back home
          </Link>
        </div>
      </header>

      <main className="px-4 pb-4 pt-14 sm:px-6">
        <section className="mx-auto w-full max-w-3xl text-center">
          <p className="text-[13px] text-muted-foreground">Pricing</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.02] tracking-[-0.05em] sm:text-6xl">
            One plan. Everything in.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            No tiers, no feature gates, no seat maths. One workspace that covers
            the whole month.
          </p>
        </section>

        <section className="mx-auto mt-12 w-full max-w-4xl">
          <div className="grid overflow-hidden rounded-[28px] border border-foreground/10 bg-card shadow-[0_24px_60px_-40px_rgba(0,0,0,0.35)] lg:grid-cols-[0.85fr_1.15fr]">
            <div className="flex flex-col justify-between gap-10 border-b border-foreground/10 bg-muted/30 p-8 lg:border-b-0 lg:border-r lg:p-10">
              <div>
                <p className="text-[13px] text-muted-foreground">Expense Trackr Pro</p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-xl font-medium text-muted-foreground">$</span>
                  <span className="font-display text-6xl leading-none tracking-[-0.04em]">
                    6
                  </span>
                  <span className="text-[12px] text-muted-foreground">per month</span>
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                  Billed monthly. Cancel whenever. Your ledger stays exportable
                  either way.
                </p>
              </div>

              <div>
                <OpenAppButton
                  className={buttonVariants({
                    size: "lg",
                    className: "h-11 w-full",
                  })}
                >
                  Open App
                  <Icon icon={ArrowRight01Icon} className="size-4" />
                </OpenAppButton>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  No card required to look around.
                </p>
              </div>
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
        </section>
      </main>

      <section className="relative isolate mt-16 overflow-hidden bg-black">
        <Image
          src="/bg-hero.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover object-center"
        />
        <div className="relative px-6 py-20 text-center sm:py-24">
          <h2 className="font-display text-4xl leading-[1.02] tracking-[-0.04em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.45)] sm:text-5xl">
            Give your money a plan.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/75 [text-shadow:0_1px_18px_rgba(0,0,0,0.55)]">
            Open the workspace and pick up exactly where your month left off.
          </p>
          <div className="mt-8 flex justify-center">
            <OpenAppButton
              className={buttonVariants({
                size: "lg",
                className: "h-11 bg-white px-5 text-black hover:bg-white/90",
              })}
            >
              Open App
              <Icon icon={ArrowRight01Icon} className="size-4" />
            </OpenAppButton>
          </div>
        </div>

        <div className="relative border-t border-white/15 px-6 py-6">
          <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 text-[11px] text-white/60">
            <span className="text-white/80">Expense Trackr</span>
            <nav className="flex items-center gap-5">
              <Link href="/" className="transition-colors hover:text-white">
                Home
              </Link>
              <Link href="/pricing" className="transition-colors hover:text-white">
                Pricing
              </Link>
            </nav>
            <span>Bank connection never required</span>
          </div>
        </div>
      </section>
    </div>
  );
}
