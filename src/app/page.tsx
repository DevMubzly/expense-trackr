"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { AuthDialog } from "@/components/auth-dialog";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

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


      <main className="min-h-0 flex-1 px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
        <div
          className={cn(
            "mx-auto flex h-full w-full max-w-[1500px] flex-col gap-4 transition-[gap] duration-700 lg:flex-row",
            pricingOpen ? "lg:gap-4" : "lg:gap-0",
          )}
        >
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
            className="relative isolate min-w-0 flex-1 overflow-hidden rounded-[32px] bg-black"
          >
            <Image
              src="/bg-hero.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover object-center"
            />

            <div className="relative flex h-full flex-col px-6 pt-8 sm:px-10 lg:px-12">
              <div className="relative h-4">
                <motion.div
                  initial={false}
                  animate={{
                    left: pricingOpen ? "50%" : "0%",
                    x: pricingOpen ? "-50%" : "0%",
                  }}
                  transition={{ duration: 0.7, ease: EASE_OUT }}
                  className="absolute top-0 whitespace-nowrap"
                >
                  <Link href="/" className="font-syncopate text-[11px] font-bold tracking-[0.04em] text-white/90">
                    Expense Trackr
                  </Link>
                </motion.div>
              </div>

              <div className="mx-auto mt-auto max-w-2xl pb-4 text-center">
                <h1 className="font-display text-2xl leading-tight tracking-[-0.03em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.45)] sm:text-3xl">
                  Know where
                  <span className="block text-white/70">every shilling goes.</span>
                </h1>

                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70 [text-shadow:0_1px_14px_rgba(0,0,0,0.5)]">
                  Accounts, spending, budgets, goals and debts in one workspace,
                  so the month adds up without a spreadsheet.
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAuthOpen(true)}
                    className={buttonVariants({
                      size: "lg",
                      className:
                        "h-8 w-36 justify-center bg-white px-3 text-black hover:bg-white/90",
                    })}
                  >
                    Open App
                    <Icon icon={ArrowRight01Icon} className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingOpen((open) => !open)}
                    aria-expanded={pricingOpen}
                    aria-controls="landing-pricing"
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                      className:
                        "h-8 w-36 justify-center border-white/25 bg-white/5 px-3 text-white hover:bg-white/10",
                    })}
                  >
                    {pricingOpen ? "Hide pricing" : "View pricing"}
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
          </motion.section>

          {pricingOpen ? (
            <button
              type="button"
              aria-label="Close pricing"
              onClick={() => setPricingOpen(false)}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
            />
          ) : null}

          <div
            id="landing-pricing"
            inert={!pricingOpen}
            className={cn(
              "min-h-0 shrink-0 overflow-hidden transition-[width,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
              pricingOpen
                ? "fixed inset-4 z-50 h-[calc(100dvh-2rem)] w-auto opacity-100 lg:static lg:inset-auto lg:h-auto lg:w-[34%]"
                : "pointer-events-none w-0 opacity-0",
            )}
          >
          <motion.aside
            initial={false}
            animate={{ x: pricingOpen ? 0 : 48, opacity: pricingOpen ? 1 : 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
            className="relative flex h-full min-h-0 w-full flex-col overflow-y-auto rounded-[32px] border border-white/10 bg-white/[0.035] p-6 transition-colors hover:border-white/20 lg:p-8"
          >
            <button
              type="button"
              aria-label="Close pricing"
              onClick={() => setPricingOpen(false)}
              className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full border border-white/10 bg-black/30 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon icon={Cancel01Icon} className="size-4" />
            </button>
            <div className="mx-auto flex h-full w-full max-w-sm flex-col text-center">
            <div className="flex flex-1 flex-col justify-center">
            <h2 className="font-display text-2xl leading-tight tracking-[-0.03em] text-white">
              One plan. Everything in.
            </h2>

            <div className="mt-6 flex items-baseline justify-center gap-2 text-white">
              <span className="text-lg font-medium text-white/60">UGX</span>
              <span className="font-display text-5xl leading-none tracking-[-0.04em]">
                4,000
              </span>
              <span className="text-sm text-white/50">per month</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Every feature in one workspace, billed monthly in Ugandan
              shillings.
            </p>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className={buttonVariants({
                size: "lg",
                className: "mx-auto mt-7 h-9 w-40 justify-center",
              })}
            >
              Open app
              <Icon icon={ArrowRight01Icon} className="size-4" />
            </button>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-center gap-3 pt-6">
              <span className="font-syncopate text-[11px] tracking-[0.02em] text-white/70">
                Expense Trackr
              </span>
              <span className="h-4 w-px bg-white/15" />
              <Image
                src="/salastores-logo.svg"
                alt=""
                width={30}
                height={28}
                className="opacity-60"
              />
              <span className="font-syncopate text-[11px] tracking-[0.02em] text-white/70">
                <span className="text-purple-400">Sala</span>Stores
              </span>
            </div>
            </div>
          </motion.aside>
          </div>
        </div>
      </main>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
