"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { AuthDialog } from "@/components/auth-dialog";
import { PricingDialog } from "@/components/pricing-dialog";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  useEffect(() => {
    // Post-hydration only: the query string is not available during prerender.
    if (new URLSearchParams(window.location.search).get("auth") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthOpen(true);
    }
  }, []);

  return (
    <div className="theme-light flex h-dvh flex-col overflow-hidden bg-[oklch(0.165_0.008_285)] text-foreground">
      <header className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-[-0.02em] text-white">
          Expense Trackr
        </Link>

        <nav className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setPricingOpen(true)}
            className="text-[13px] text-white/75 transition-colors hover:text-white"
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className={buttonVariants({
              size: "sm",
              className: "bg-white text-black hover:bg-white/90",
            })}
          >
            Open App
            <Icon icon={ArrowRight01Icon} className="size-3.5" />
          </button>
        </nav>
      </header>

      <main className="min-h-0 flex-1 px-4 pb-4 sm:px-6">
        <section className="relative isolate mx-auto h-full w-full max-w-[1500px] overflow-hidden rounded-[32px] bg-black">
          <Image
            src="/bg-hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover object-center"
          />

          <div className="relative flex h-full flex-col px-6 pt-10 sm:px-10 lg:px-14 lg:pt-14">
            <div className="max-w-3xl text-center md:mx-auto">
              <h1 className="font-display text-4xl leading-[1.02] tracking-[-0.045em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">
                Know where
                <span className="block text-white/70">every shilling goes.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-white/80 [text-shadow:0_1px_18px_rgba(0,0,0,0.55)] sm:text-base">
                Accounts, spending, budgets, goals and debts in one desktop
                workspace. Set your defaults once and the month adds up without
                a spreadsheet.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className={buttonVariants({
                    size: "lg",
                    className: "h-11 bg-white px-5 text-black hover:bg-white/90",
                  })}
                >
                  Open App
                  <Icon icon={ArrowRight01Icon} className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPricingOpen(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  View pricing
                </button>
              </div>
            </div>

            <div className="mt-10 flex min-h-0 flex-1 justify-center overflow-hidden">
              <Image
                src="/dash.png"
                alt="Expense Trackr dashboard"
                width={1920}
                height={956}
                priority
                className="h-auto w-[86%] max-w-4xl self-start rounded-2xl border-[5px] border-white/45 shadow-2xl shadow-black/40"
              />
            </div>
          </div>
        </section>
      </main>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      <PricingDialog open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
