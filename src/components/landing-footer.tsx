import Link from "next/link";
import { ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";

export function LandingFooter() {
  return (
    <section className="px-4 pb-4 pt-16 sm:px-6">
      <div className="mx-auto w-full max-w-[1600px] overflow-hidden rounded-[32px] bg-foreground text-background">
        <div className="relative px-6 py-14 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-[13px] text-background/50">Ready when you are</p>
              <h2 className="mt-3 font-display text-4xl leading-[1.02] tracking-[-0.04em] sm:text-5xl">
                Give your money a plan.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-background/60">
                Mock login, real workflows. Any email and password opens the
                workspace with a full month of sample data.
              </p>
            </div>
            <Link
              href="/dashboard"
              className={buttonVariants({
                size: "lg",
                className:
                  "h-11 bg-background px-5 text-foreground hover:bg-background/85",
              })}
            >
              Open App
              <Icon icon={ArrowRight01Icon} className="size-4" />
            </Link>
          </div>
        </div>

        <div className="relative border-t border-background/10 px-6 py-6 sm:px-12">
          <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-background/55">
            <span className="text-background/70">Expense Trackr</span>
            <nav className="flex items-center gap-5">
              <Link href="/pricing" className="transition-colors hover:text-background">
                Pricing
              </Link>
            </nav>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Icon icon={Tick02Icon} className="size-3" />
                Local mock data
              </span>
              <span>No bank connection</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
