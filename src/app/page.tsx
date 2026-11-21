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
            <div className="mt-auto max-w-3xl pb-4 text-center md:mx-auto">
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
                    className: "h-9 w-40 justify-center bg-white px-4 text-black hover:bg-white/90",
                  })}
                >
                  Open App
                  <Icon icon={ArrowRight01Icon} className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPricingOpen(true)}
                  className="inline-flex h-9 w-40 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-[13px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
                >
                  View pricing
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
      </main>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      <PricingDialog open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
