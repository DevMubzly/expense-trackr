"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { AuthDialog } from "@/components/auth-dialog";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";

const FEATURES = [
  "Accounts and wallets",
  "Expenses and income",
  "Budgets and category splits",
  "Goals and debts",
  "Recurring entries",
  "Heatmaps and trends",
];

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    // Post-hydration only: the query string is not available during prerender.
    if (new URLSearchParams(window.location.search).get("auth") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthOpen(true);
    }
  }, []);

  return (
    <div className="theme-light flex h-dvh flex-col overflow-hidden bg-[oklch(0.165_0.008_285)] text-foreground">
      <header className="mx-auto flex w-full max-w-[1500px] items-center justify-center px-4 py-5 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-[-0.02em] text-white">
          Expense Trackr
        </Link>
      </header>

      <main className="min-h-0 flex-1 px-4 pb-4 sm:px-6">
        <div className="mx-auto grid h-full w-full max-w-[1500px] gap-4 lg:grid-cols-[1.55fr_1fr]">
          <section className="relative isolate overflow-hidden rounded-[32px] bg-black">
            <Image
              src="/bg-hero.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover object-center"
            />

            <div className="relative flex h-full flex-col px-6 pt-10 sm:px-10 lg:px-12">
              <div className="mt-auto max-w-2xl pb-4 text-center md:mx-auto">
                <h1 className="font-display text-2xl leading-tight tracking-[-0.03em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.45)] sm:text-3xl">
                  Know where
                  <span className="block text-white/70">every shilling goes.</span>
                </h1>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAuthOpen(true)}
                    className={buttonVariants({
                      size: "lg",
                      className:
                        "h-9 w-40 justify-center bg-white px-4 text-black hover:bg-white/90",
                    })}
                  >
                    Open App
                    <Icon icon={ArrowRight01Icon} className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-center overflow-hidden">
                <Image
                  src="/dash.png"
                  alt="Expense Trackr dashboard"
                  width={1920}
                  height={956}
                  priority
                  className="h-auto w-full max-w-6xl rounded-t-2xl border-x-[5px] border-t-[5px] border-white/45 shadow-2xl shadow-black/40"
                />
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-y-auto rounded-[32px] border border-white/10 bg-white/[0.035] p-6 lg:p-8">
            <p className="text-[13px] text-white/50">Pricing</p>
            <h2 className="mt-2 font-display text-2xl leading-tight tracking-[-0.03em] text-white">
              One plan. Everything in.
            </h2>

            <div className="mt-6 flex items-baseline gap-2 text-white">
              <span className="text-base font-medium text-white/60">$</span>
              <span className="font-display text-5xl leading-none tracking-[-0.04em]">6</span>
              <span className="text-[12px] text-white/50">per month</span>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-white/50">
              Billed monthly. Cancel whenever. Your ledger stays exportable
              either way.
            </p>

            <ul className="mt-6 space-y-2.5">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[13px] text-white/85">
                  <Icon icon={Tick02Icon} className="mt-0.5 size-3.5 shrink-0 text-white/45" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <p className="mt-auto pt-6 text-[11px] text-white/40">
              No tiers, no feature gates, no seat maths.
            </p>
          </aside>
        </div>
      </main>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
